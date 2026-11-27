// backend/src/controllers/donationController.js - UPDATED
import Donation from '../models/Donation.js';
import Member from '../models/Member.js';
import Counter from '../models/Counter.js';
import Notification from '../models/Notification.js';
import { io } from '../server.js';
import { exportDonationsToExcel } from '../utils/excelExport.js';

// Helper function to generate receipt number
const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = 'donationReceiptNumber';
  const existingCounter = await Counter.exists({ _id: counterId });

  if (!existingCounter) {
    const receipts = await Donation.find({
      receiptNumber: /^R-\d{4}-\d+$/,
    }).select('receiptNumber').lean();
    const maxReceiptNumber = receipts.reduce((max, donation) => {
      const receiptNumber = Number(donation.receiptNumber.split('-').at(-1));
      return Number.isFinite(receiptNumber) ? Math.max(max, receiptNumber) : max;
    }, 0);

    try {
      await Counter.create({ _id: counterId, seq: maxReceiptNumber });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  );
  if (!counter) throw new Error('Failed to allocate a donation receipt number');

  return `R-${year}-${String(counter.seq).padStart(4, '0')}`;
};

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');
const validPhone = (value) => {
  const digits = normalizePhone(value);
  return digits.length >= 7 && digits.length <= 15;
};
const contactError = (name, phone, email) => {
  if (String(name || '').trim().length < 2) return 'Donor name is required.';
  if (!validPhone(phone)) return 'A valid donor phone number is required.';
  if (!validEmail(email)) return 'A valid donor email address is required.';
  return null;
};
const withoutFinancialFields = (donation) => {
  const data = typeof donation.toObject === 'function' ? donation.toObject() : { ...donation };
  delete data.amount;
  delete data.qrPaymentReference;
  delete data.qrPaymentCompleted;
  delete data.qrPaymentDate;
  delete data.createdBy;
  delete data.updatedBy;
  return data;
};

// Get donations with search, filters, sorting, pagination
export const getDonations = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const {
      page = 1,
      limit = 10,
      search,
      paymentMethod,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      paymentStatus,
      sortBy = 'donationDate',
      sortOrder = 'desc',
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    // Search functionality
    if (search) {
      const searchOr = [
        { donorName: { $regex: search, $options: 'i' } },
        { donorPhone: { $regex: search, $options: 'i' } },
        { donorEmail: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
      ];
      // Never allow amount-based search for non-admins
      if (isAdmin && !isNaN(search) && String(search).trim() !== '') {
        searchOr.push({ amount: Number(search) });
      }
      query.$or = searchOr;
    }

    // Filters
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (category) query.category = category;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate && endDate) {
      query.donationDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Amount filters are admin-only
    if (isAdmin && (minAmount !== '' && minAmount !== undefined || maxAmount !== '' && maxAmount !== undefined)) {
      const amountFilter = {};
      if (minAmount !== '' && minAmount !== undefined && !isNaN(minAmount)) amountFilter.$gte = Number(minAmount);
      if (maxAmount !== '' && maxAmount !== undefined && !isNaN(maxAmount)) amountFilter.$lte = Number(maxAmount);
      if (Object.keys(amountFilter).length > 0) query.amount = amountFilter;
    }

    // Prevent sorting by financial fields for non-admins
    const allowedSortFields = isAdmin
      ? ['donationDate', 'amount', 'donorName', 'paymentMethod', 'category', 'paymentStatus', 'createdAt', 'receiptNumber']
      : ['donationDate', 'donorName', 'paymentMethod', 'category', 'paymentStatus', 'createdAt', 'receiptNumber'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'donationDate';
    const sort = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    let listQuery = Donation.find(query)
      .populate('donorId', 'name photo phone email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10));
    if (!isAdmin) {
      listQuery = listQuery.select('-amount -qrPaymentReference -qrPaymentCompleted -qrPaymentDate -createdBy -updatedBy');
    }

    const [donations, total] = await Promise.all([
      listQuery,
      Donation.countDocuments(query),
    ]);

    const baseResponse = {
      data: donations,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    };

    if (!isAdmin) {
      return res.json({
        ...baseResponse,
        summary: null,
        uniqueDonors: null,
        monthly: [],
      });
    }

    // Calculate summary statistics with payment status breakdown (admin only)
    const summary = await Donation.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          count: { $sum: 1 },
          qrPayments: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'qr'] }, 1, 0] } },
          cashPayments: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, 1, 0] } },
          qrTotal: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'qr'] }, '$amount', 0] } },
          cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$amount', 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$amount', 0] } },
          paidAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] } },
        },
      },
    ]);

    // Get unique donors count
    const uniqueDonors = await Donation.aggregate([
      { $match: query },
      { $group: { _id: '$donorName' } },
      { $count: 'count' },
    ]);

    // Get monthly aggregation
    const monthly = await Donation.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$donationDate' },
            month: { $month: '$donationDate' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      ...baseResponse,
      summary: summary[0] || {
        totalAmount: 0,
        averageAmount: 0,
        count: 0,
        qrPayments: 0,
        cashPayments: 0,
        qrTotal: 0,
        cashTotal: 0,
        pendingCount: 0,
        paidCount: 0,
        pendingAmount: 0,
        paidAmount: 0,
      },
      uniqueDonors: uniqueDonors[0]?.count || 0,
      monthly,
    });
  } catch (error) {
    console.error('GET DONATIONS ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};
// Get donation by ID
export const getDonationById = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    let query = Donation.findById(req.params.id)
      .populate('donorId', 'name photo phone email');
    if (isAdmin) {
      query = query.populate('createdBy', 'name email').populate('updatedBy', 'name email');
    } else {
      query = query.select('-amount -qrPaymentReference -qrPaymentCompleted -qrPaymentDate -createdBy -updatedBy');
    }
    const donation = await query;

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    res.json(donation);
  } catch (error) {
    console.error("�?O GET DONATION BY ID ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create donation
export const createDonation = async (req, res) => {
  try {
    console.log('📥 Create Donation Request:', {
      donorType: req.body?.donorType,
      paymentMethod: req.body?.paymentMethod,
      category: req.body?.category,
      paymentStatus: req.body?.paymentStatus,
    });

    const donationData = {
      ...req.body,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    };

    // Clean up empty remarks only; donor phone and email are mandatory.
    if (!donationData.remarks || donationData.remarks.trim() === '') {
      delete donationData.remarks;
    }

    // If donor is a member/family, populate donorName from member
    if ((donationData.donorType === 'member' || donationData.donorType === 'family') && donationData.donorId) {
      const member = await Member.findById(donationData.donorId);
      if (member) {
        donationData.donorName = member.name;
        donationData.donorPhone = member.phone || donationData.donorPhone || '';
        donationData.donorEmail = member.email || donationData.donorEmail || '';
      } else {
        return res.status(400).json({ message: 'Selected member not found' });
      }
    }

    const missingContact = contactError(donationData.donorName, donationData.donorPhone, donationData.donorEmail);
    if (missingContact) return res.status(400).json({ message: missingContact });
    donationData.donorPhone = normalizePhone(donationData.donorPhone);

    // Generate receipt number
    donationData.receiptNumber = await generateReceiptNumber();

    // Set default paymentStatus if not provided
    if (!donationData.paymentStatus) {
      donationData.paymentStatus = 'pending';
    }

    const donation = new Donation(donationData);
    await donation.save();

    // Auto-create notification
    const notificationMessage = `${donation.donorName} donated Rs. ${donation.amount.toFixed(2)} via ${donation.paymentMethod.toUpperCase()} - Status: ${donation.paymentStatus}`;
    
    const notification = new Notification({
      type: 'donation_added',
      title: 'New Donation Received',
      message: notificationMessage,
      data: {
        donationId: donation._id,
        donorName: donation.donorName,
        amount: donation.amount,
        paymentMethod: donation.paymentMethod,
        receiptNumber: donation.receiptNumber,
        paymentStatus: donation.paymentStatus,
      },
      createdBy: req.user?._id || null,
    });

    await notification.save();

    if (io) {
      io.to('role:admin').emit('donation:created', donation);
      io.to('role:admin').emit('notification:new', notification);
    }

    if (req.user?.role !== 'admin') {
      return res.status(201).json(withoutFinancialFields(donation));
    }
    res.status(201).json(donation);
  } catch (error) {
    console.error("❌ Create Donation Error:", error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update donation
export const updateDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const updateData = {
      ...req.body,
      updatedBy: req.user?._id || null,
    };

    // Clean up empty remarks only; donor phone and email are mandatory.
    if (!updateData.remarks || updateData.remarks.trim() === '') {
      delete updateData.remarks;
    }

    if ((updateData.donorType === 'member' || updateData.donorType === 'family') && updateData.donorId) {
      const member = await Member.findById(updateData.donorId);
      if (!member) return res.status(400).json({ message: 'Selected member not found' });
      updateData.donorName = member.name;
      updateData.donorPhone = member.phone || updateData.donorPhone || donation.donorPhone || '';
      updateData.donorEmail = member.email || updateData.donorEmail || donation.donorEmail || '';
    }

    const merged = { ...donation.toObject(), ...updateData };
    const missingContact = contactError(merged.donorName, merged.donorPhone, merged.donorEmail);
    if (missingContact) return res.status(400).json({ message: missingContact });
    updateData.donorPhone = normalizePhone(merged.donorPhone);

    const updatedDonation = await Donation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).populate('donorId', 'name photo phone email');

    if (io) {
      io.to('role:admin').emit('donation:updated', updatedDonation);
    }

    res.json(updatedDonation);
  } catch (error) {
    console.error("❌ Update Donation Error:", error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete donation
export const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    await donation.deleteOne();

    if (io) {
      io.to('role:admin').emit('donation:deleted', { id: req.params.id });
    }

    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    console.error("❌ Delete Donation Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get donation statistics
export const getDonationStats = async (req, res) => {
  try {
    const stats = await Donation.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          count: { $sum: 1 },
          qrPayments: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'qr'] }, 1, 0] } },
          cashPayments: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          paidPayments: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$amount', 0] } },
          paidAmount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] } },
        },
      },
    ]);

    // Unique donors
    const uniqueDonors = await Donation.aggregate([
      { $group: { _id: '$donorName' } },
      { $count: 'count' },
    ]);

    const monthlyStats = await Donation.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$donationDate' },
            month: { $month: '$donationDate' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Per donor total
    const perDonorStats = await Donation.aggregate([
      {
        $group: {
          _id: '$donorName',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 20 },
    ]);

    const paymentMethodStats = await Donation.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    res.json({
      overall: stats[0] || {
        totalAmount: 0,
        averageAmount: 0,
        count: 0,
        qrPayments: 0,
        cashPayments: 0,
        pendingPayments: 0,
        paidPayments: 0,
        pendingAmount: 0,
        paidAmount: 0,
      },
      uniqueDonors: uniqueDonors[0]?.count || 0,
      monthly: monthlyStats,
      byPaymentMethod: paymentMethodStats,
      perDonor: perDonorStats,
    });
  } catch (error) {
    console.error("❌ Get Donation Stats Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export all donations to Excel
export const exportAllDonationsToExcel = async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate('donorId', 'name phone email')
      .sort({ donationDate: -1 });

    const buffer = await exportDonationsToExcel(donations);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=donations_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("❌ Export All Donations Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export single donation to Excel
export const exportDonationToExcel = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donorId', 'name phone email');

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const buffer = await exportDonationsToExcel([donation]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=donation_${donation.receiptNumber}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("❌ Export Single Donation Error:", error);
    res.status(500).json({ message: error.message });
  }
};
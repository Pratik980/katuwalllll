import Member from '../models/Member.js';
import Family from '../models/Family.js';
import Donation from '../models/Donation.js';
import Document from '../models/Document.js';
import Notification from '../models/Notification.js';
import { authorizedFamilyIds } from '../middlewares/authentication.js';

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value ?? ''));

const scopedIds = async (req) => {
  const ids = req.authorizedFamilyIds !== undefined
    ? req.authorizedFamilyIds
    : await authorizedFamilyIds(req.user);
  if (ids === null) return null;
  return (Array.isArray(ids) ? ids : []).map(String).filter(isObjectId);
};

const scopeFor = async (req) => {
  const ids = await scopedIds(req);
  return {
    memberMatch: ids === null ? {} : { family: { $in: ids } },
    familyMatch: ids === null ? {} : { _id: { $in: ids } },
  };
};

const memberIdsForFamilies = async (familyIds) => {
  if (familyIds === null) return null;
  const validIds = (Array.isArray(familyIds) ? familyIds : []).map(String).filter(isObjectId);
  if (!validIds.length) return [];
  const members = await Member.find({ family: { $in: validIds } }).select('_id').lean();
  return members.map((member) => member._id);
};

const scopedDonationMatch = async (req, familyIds) => {
  if (!['admin', 'staff'].includes(req.user?.role)) return { _id: null };
  if (familyIds === null) return {};
  const memberIds = await memberIdsForFamilies(familyIds);
  if (!memberIds?.length) return { _id: null };
  return { donorId: { $in: memberIds } };
};

const scopedDocumentMatch = async (req, familyIds) => {
  if (!['admin', 'user'].includes(req.user?.role)) return { _id: null };
  if (familyIds === null) return {};
  const memberIds = await memberIdsForFamilies(familyIds);
  if (!memberIds?.length) return { _id: null };
  return { member: { $in: memberIds } };
};

export const getDashboardStats = async (req, res) => {
  try {
    const { memberMatch, familyMatch } = await scopeFor(req);
    const familyIds = await scopedIds(req);
    const [donationMatch, documentMatch] = await Promise.all([
      scopedDonationMatch(req, familyIds),
      scopedDocumentMatch(req, familyIds),
    ]);

    const [
      totalMembers,
      totalFamilies,
      totalDonations,
      totalDocuments,
      donationTotal,
      genderStats,
      lifeStatusStats,
      recentMembers,
      recentDonations,
      recentNotifications,
      monthlyDonations,
    ] = await Promise.all([
      Member.countDocuments(memberMatch),
      Family.countDocuments(familyMatch),
      Donation.countDocuments(donationMatch),
      Document.countDocuments(documentMatch),
      Donation.aggregate([
        { $match: donationMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Member.aggregate([
        { $match: memberMatch },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
      Member.aggregate([
        { $match: memberMatch },
        { $group: { _id: '$isAlive', count: { $sum: 1 } } },
      ]),
      Member.find(memberMatch)
        .select('name photo gender isAlive createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Donation.find(donationMatch)
        .select('donorName amount paymentMethod donationDate')
        .sort({ donationDate: -1 })
        .limit(5),
      Notification.find(Notification.visibleTo(req.user))
        .sort({ createdAt: -1 })
        .limit(5),
      Donation.aggregate([
        { $match: donationMatch },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$donationDate' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const generations = await Member.aggregate([
      { $match: memberMatch },
      { $group: { _id: '$generation', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      summary: {
        totalMembers,
        totalFamilies,
        totalDonations,
        totalDocuments,
        totalDonationAmount: donationTotal[0]?.total || 0,
      },
      demographics: {
        gender: genderStats,
        lifeStatus: lifeStatusStats,
        generations: generations.map(g => ({
          generation: g._id,
          count: g.count,
        })),
      },
      recent: {
        members: recentMembers,
        donations: recentDonations,
        notifications: recentNotifications,
      },
      monthlyDonations: monthlyDonations.map((month) => ({
        month: month._id,
        total: month.total,
        count: month.count,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getQuickStats = async (req, res) => {
  try {
    const { memberMatch, familyMatch } = await scopeFor(req);

    const [
      totalMembers,
      totalFamilies,
      totalGenerations,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
    ] = await Promise.all([
      Member.countDocuments(memberMatch),
      Family.countDocuments(familyMatch),
      Member.distinct('generation', memberMatch).then(gens => gens.filter(g => g !== undefined).length),
      Member.countDocuments({ ...memberMatch, gender: 'male' }),
      Member.countDocuments({ ...memberMatch, gender: 'female' }),
      Member.countDocuments({ ...memberMatch, isAlive: true }),
      Member.countDocuments({ ...memberMatch, isAlive: false }),
    ]);

    res.json({
      totalMembers,
      totalFamilies,
      totalGenerations,
      maleCount,
      femaleCount,
      livingCount,
      deceasedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

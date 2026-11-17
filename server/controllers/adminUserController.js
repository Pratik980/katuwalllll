import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Family from '../models/Family.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import { io } from '../server.js';

const validPassword = (password) => typeof password === 'string' && password.length >= 12 && password.length <= 128;
const validObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const userFields = 'name email phone photo role emailVerified isActive linkedMember allowedFamilies preferredLanguage mustChangePassword createdAt updatedAt';

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $in: ['user', 'staff'] } })
      .select(userFields)
      .populate('linkedMember', 'name memberNumber family')
      .populate('allowedFamilies', 'familyName familyNumber')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;
    const allowedFamilyIds = req.body.allowedFamilies;

    if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid staff name and email address.' });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ message: 'Staff password must be at least 12 characters and no more than 128 characters.' });
    }
    if (!Array.isArray(allowedFamilyIds) || allowedFamilyIds.some((id) => !validObjectId(id))) {
      return res.status(400).json({ message: 'Select valid family access for this staff account.' });
    }

    const uniqueFamilyIds = [...new Set(allowedFamilyIds.map(String))];
    const existingFamilies = await Family.countDocuments({ _id: { $in: uniqueFamilyIds } });
    if (existingFamilies !== uniqueFamilyIds.length) {
      return res.status(400).json({ message: 'One or more selected families do not exist.' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'staff',
      emailVerified: true,
      isActive: true,
      allowedFamilies: uniqueFamilyIds,
      mustChangePassword: true,
    });
    const result = await User.findById(user._id)
      .select(userFields)
      .populate('allowedFamilies', 'familyName familyNumber')
      .lean();
    res.status(201).json({ user: result });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
};

export const updateManagedUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, role: { $in: ['user', 'staff'] } }).select('+tokenVersion');
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) {
      if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean.' });
      updates.isActive = req.body.isActive;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'preferredLanguage')) {
      if (!['en', 'ne'].includes(req.body.preferredLanguage)) {
        return res.status(400).json({ message: 'Preferred language must be English or Nepali.' });
      }
      updates.preferredLanguage = req.body.preferredLanguage;
    }

    if (user.role === 'user' && Object.prototype.hasOwnProperty.call(req.body, 'linkedMember')) {
      const linkedMemberId = req.body.linkedMember || null;
      if (linkedMemberId && !validObjectId(linkedMemberId)) {
        return res.status(400).json({ message: 'Select a valid member.' });
      }
      if (linkedMemberId && !await Member.exists({ _id: linkedMemberId })) {
        return res.status(404).json({ message: 'Selected member was not found.' });
      }
      updates.linkedMember = linkedMemberId;
    }

    if (user.role === 'staff' && Object.prototype.hasOwnProperty.call(req.body, 'allowedFamilies')) {
      const familyIds = req.body.allowedFamilies;
      if (!Array.isArray(familyIds) || familyIds.some((id) => !validObjectId(id))) {
        return res.status(400).json({ message: 'Select valid family access for this staff account.' });
      }
      const uniqueIds = [...new Set(familyIds.map(String))];
      if (await Family.countDocuments({ _id: { $in: uniqueIds } }) !== uniqueIds.length) {
        return res.status(400).json({ message: 'One or more selected families do not exist.' });
      }
      updates.allowedFamilies = uniqueIds;
    }

    Object.assign(user, updates);
    if (updates.isActive === false) user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    if (updates.isActive === false) io.in(`user:${user._id}`).disconnectSockets(true);

    const updatedUser = await User.findById(user._id)
      .select(userFields)
      .populate('linkedMember', 'name memberNumber family')
      .populate('allowedFamilies', 'familyName familyNumber')
      .lean();
    res.json({ user: updatedUser });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This member is already linked to another account.' });
    next(error);
  }
};

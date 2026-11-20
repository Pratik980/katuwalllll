import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Family from '../models/Family.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import { io } from '../server.js';
import { sendAuthNotificationEmail, sendStaffAccountEmail } from '../utils/authEmail.js';

const validPassword = (password) => typeof password === 'string' && password.length >= 12 && password.length <= 128;
const validObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const userFields = 'name email phone photo role emailVerified isActive linkedMember allowedFamilies preferredLanguage mustChangePassword createdAt updatedAt';

const loginUrl = () => (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/login` : 'the application');
const populatedUser = async (id) => User.findById(id)
  .select(userFields)
  .populate('linkedMember', 'name memberNumber family')
  .populate('allowedFamilies', 'familyName familyNumber')
  .lean();

const ensureNotLastActiveAdmin = async (user) => {
  if (user.role !== 'admin') return;
  const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
  if (activeAdmins <= 1) {
    const error = new Error('At least one active administrator account is required.');
    error.statusCode = 400;
    throw error;
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
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
    const allowedFamilyIds = Array.isArray(req.body.allowedFamilies) ? req.body.allowedFamilies : [];

    if (name.length < 2 || name.length > 120 || !validEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid staff name and email address.' });
    }
    if (!validPassword(password)) {
      return res.status(400).json({ message: 'Staff password must be at least 12 characters and no more than 128 characters.' });
    }
    if (allowedFamilyIds.some((id) => !validObjectId(id))) {
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

    let emailWarning = '';
    try {
      await sendStaffAccountEmail({ email, name, password, loginUrl: loginUrl() });
    } catch (error) {
      console.error('Staff account email could not be sent:', error.message);
      emailWarning = 'Staff account created, but the notification email could not be sent.';
    }

    const result = await populatedUser(user._id);
    res.status(201).json({ user: result, ...(emailWarning ? { warning: emailWarning } : {}) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
};

export const updateManagedUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('+tokenVersion');
    if (!user) return res.status(404).json({ message: 'User account not found.' });
    if (!['user', 'staff', 'admin'].includes(user.role)) {
      return res.status(400).json({ message: 'This account cannot be managed here.' });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = String(req.body.name || '').trim();
      if (name.length < 2 || name.length > 120) return res.status(400).json({ message: 'Name must be between 2 and 120 characters.' });
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
      if (email !== user.email && await User.exists({ email, _id: { $ne: user._id } })) {
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }
      updates.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) {
      if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean.' });
      if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
        return res.status(400).json({ message: 'You cannot deactivate your own account.' });
      }
      if (req.body.isActive === false) await ensureNotLastActiveAdmin(user);
      updates.isActive = req.body.isActive;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'preferredLanguage')) {
      if (!['en', 'ne'].includes(req.body.preferredLanguage)) {
        return res.status(400).json({ message: 'Preferred language must be English or Nepali.' });
      }
      updates.preferredLanguage = req.body.preferredLanguage;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'linkedMember')) {
      if (user.role !== 'user') return res.status(400).json({ message: 'Only user accounts can be linked to a member record.' });
      const linkedMemberId = req.body.linkedMember || null;
      if (linkedMemberId && !validObjectId(linkedMemberId)) {
        return res.status(400).json({ message: 'Select a valid member.' });
      }
      if (linkedMemberId && !await Member.exists({ _id: linkedMemberId })) {
        return res.status(404).json({ message: 'Selected member was not found.' });
      }
      updates.linkedMember = linkedMemberId;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'allowedFamilies')) {
      if (user.role !== 'staff') return res.status(400).json({ message: 'Only staff accounts can be assigned family access.' });
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

    res.json({ user: await populatedUser(user._id) });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.code === 11000) return res.status(409).json({ message: 'This email or linked member is already in use.' });
    next(error);
  }
};

export const resetManagedUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('+tokenVersion');
    if (!user || !['user', 'staff'].includes(user.role)) {
      return res.status(404).json({ message: 'User account not found.' });
    }
    const { password } = req.body;
    if (!validPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 12 characters and no more than 128 characters.' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.mustChangePassword = true;
    await user.save();
    io.in(`user:${user._id}`).disconnectSockets(true);

    let emailWarning = '';
    try {
      await sendAuthNotificationEmail({
        email: user.email,
        name: user.name,
        subject: 'Your Katuwal Banshabatika password was reset',
        message: `An administrator reset your password. Temporary password: ${password}. Sign in at ${loginUrl()} and change your password immediately.`,
      });
    } catch (error) {
      console.error('Password reset notification email could not be sent:', error.message);
      emailWarning = 'Password reset, but the notification email could not be sent.';
    }

    res.json({ message: 'Password reset successfully.', ...(emailWarning ? { warning: emailWarning } : {}) });
  } catch (error) {
    next(error);
  }
};

export const deleteManagedUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('+tokenVersion');
    if (!user) return res.status(404).json({ message: 'User account not found.' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    if (user.role === 'admin') {
      await ensureNotLastActiveAdmin(user);
    }

    await User.deleteOne({ _id: user._id });
    io.in(`user:${user._id}`).disconnectSockets(true);
    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  }
};

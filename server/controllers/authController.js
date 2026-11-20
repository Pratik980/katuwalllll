import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import AuthChallenge from '../models/AuthChallenge.js';
import LoginActivity from '../models/LoginActivity.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import { getJwtSecret, getOtpSecret } from '../middlewares/authentication.js';
import { sendOtpEmail, sendPasswordResetConfirmationEmail } from '../utils/authEmail.js';
import { io } from '../server.js';

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const SESSION_LIFETIME = '8h';
const DEV_OTP_CODE = '123456';

const generateOtpCode = () => (
  process.env.NODE_ENV === 'production' ? String(randomInt(100000, 1_000_000)) : DEV_OTP_CODE
);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const safeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  photo: user.photo || null,
  role: user.role,
  preferredLanguage: user.preferredLanguage,
  emailVerified: user.emailVerified,
  mustChangePassword: user.mustChangePassword,
  linkedMember: user.linkedMember || null,
  allowedFamilies: user.allowedFamilies || [],
});

const secretForOtp = () => getOtpSecret() || getJwtSecret();
const hashOtp = (email, purpose, code) => createHmac('sha256', secretForOtp())
  .update(`${email}:${purpose}:${code}`)
  .digest('hex');
const hashResetToken = (token) => createHmac('sha256', secretForOtp())
  .update(`password-reset:${token}`)
  .digest('hex');

const recordLogin = async (req, user) => {
  try {
    await LoginActivity.create({
      user: user._id,
      email: user.email,
      ip: req.ip || '',
      userAgent: String(req.get('user-agent') || '').slice(0, 500),
      success: true,
    });
  } catch (error) {
    console.error('Login activity could not be recorded:', error.message);
  }
};

const matchesHash = (provided, expected) => {
  const left = Buffer.from(String(provided || ''), 'hex');
  const right = Buffer.from(String(expected || ''), 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
};

const cookieOptions = () => {
  const production = process.env.NODE_ENV === 'production';
  return {
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/',
  };
};

const issueSession = (user, res) => {
  const token = jwt.sign(
    { sub: String(user._id), ver: user.tokenVersion || 0 },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: SESSION_LIFETIME }
  );
  res.cookie('access_token', token, {
    ...cookieOptions(),
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
  });
  const csrfToken = randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    ...cookieOptions(),
    httpOnly: false,
    maxAge: 8 * 60 * 60 * 1000,
  });
  return csrfToken;
};

const clearSession = (res) => {
  res.clearCookie('access_token', { ...cookieOptions(), httpOnly: true });
  res.clearCookie('csrf_token', { ...cookieOptions(), httpOnly: false });
};

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const validPassword = (password) => typeof password === 'string' && password.length >= 12 && password.length <= 128;
const invalidInput = (res, message) => res.status(400).json({ message });

export const getCsrfToken = (req, res) => {
  const csrfToken = randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    ...cookieOptions(),
    httpOnly: false,
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.json({ csrfToken });
};

export const signUp = async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (name.length < 2 || name.length > 120 || !validEmail(email) || !validPassword(password)) {
      return invalidInput(res, 'Enter a valid name and email address. Passwords must be at least 12 characters.');
    }

    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const existing = await AuthChallenge.findOne({ email, purpose: 'signup' });
    if (existing?.lastSentAt && Date.now() - existing.lastSentAt.getTime() < 60_000) {
      return res.status(429).json({ message: 'Please wait one minute before requesting another verification code.' });
    }

    const code = generateOtpCode();
    const challenge = await AuthChallenge.findOneAndUpdate(
      { email, purpose: 'signup' },
      {
        $set: {
          email,
          purpose: 'signup',
          codeHash: hashOtp(email, 'signup', code),
          passwordHash: await bcrypt.hash(password, 12),
          name,
          attempts: 0,
          verifiedAt: null,
          resetTokenHash: null,
          expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
          lastSentAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    try {
      await sendOtpEmail({ email, name, code, purpose: 'signup' });
    } catch (error) {
      await AuthChallenge.deleteOne({ _id: challenge._id });
      console.error('Signup verification email delivery failed:', error.message);
      return res.status(503).json({ message: 'Verification email could not be sent. Please try again later.' });
    }

    res.status(202).json({
      message: 'A verification code has been sent to your email address.',
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose;
    const code = String(req.body.code || '').trim();
    if (!validEmail(email) || !['signup', 'password_reset'].includes(purpose) || !/^\d{6}$/.test(code)) {
      return invalidInput(res, 'Enter a valid email address and six-digit verification code.');
    }

    const challenge = await AuthChallenge.findOne({ email, purpose });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.verifiedAt) {
      return res.status(400).json({ message: 'The verification code is invalid or expired.' });
    }
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many incorrect codes. Request a new verification code.' });
    }

    const suppliedHash = hashOtp(email, purpose, code);
    if (!matchesHash(suppliedHash, challenge.codeHash)) {
      await AuthChallenge.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ message: 'The verification code is invalid or expired.' });
    }

    if (purpose === 'signup') {
      if (await User.exists({ email })) {
        await AuthChallenge.deleteOne({ _id: challenge._id });
        return res.status(409).json({ message: 'An account with this email already exists.' });
      }

      const user = await User.create({
        name: challenge.name,
        email,
        passwordHash: challenge.passwordHash,
        role: 'user',
        emailVerified: true,
        isActive: true,
      });
      await AuthChallenge.deleteOne({ _id: challenge._id });
      const csrfToken = issueSession(user, res);
      await recordLogin(req, user);
      return res.status(201).json({ user: safeUser(user), csrfToken });
    }

    const resetToken = randomBytes(32).toString('base64url');
    challenge.verifiedAt = new Date();
    challenge.resetTokenHash = hashResetToken(resetToken);
    challenge.resetTokenExpiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
    await challenge.save();
    return res.json({ resetToken, message: 'Email verified. You can now set a new password.' });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!validEmail(email) || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid email address and password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !passwordMatches || !user.isActive) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Verify your email address before signing in.' });
    }

    const csrfToken = issueSession(user, res);
    await recordLogin(req, user);
    res.json({ user: safeUser(user), csrfToken });
  } catch (error) {
    next(error);
  }
};


export const resendOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose;
    if (!validEmail(email) || !['signup', 'password_reset'].includes(purpose)) {
      return invalidInput(res, 'Enter a valid email address and verification purpose.');
    }

    const challenge = await AuthChallenge.findOne({ email, purpose });
    if (!challenge || challenge.expiresAt <= new Date() || challenge.verifiedAt) {
      if (purpose === 'password_reset') {
        return res.status(202).json({ message: 'If a pending verification exists, a new code will be sent shortly.' });
      }
      return res.status(400).json({ message: 'No pending verification found. Please start registration again.' });
    }
    if (challenge.lastSentAt && Date.now() - challenge.lastSentAt.getTime() < 60_000) {
      return res.status(429).json({ message: 'Please wait one minute before requesting another verification code.' });
    }

    const code = purpose === 'signup' ? generateOtpCode() : String(randomInt(100000, 1_000_000));
    challenge.codeHash = hashOtp(email, purpose, code);
    challenge.attempts = 0;
    challenge.lastSentAt = new Date();
    challenge.expiresAt = new Date(Date.now() + OTP_LIFETIME_MS);
    await challenge.save();

    try {
      await sendOtpEmail({ email, name: challenge.name || '', code, purpose });
    } catch (error) {
      console.error('Resend OTP email failed:', error.message);
      return res.status(503).json({ message: 'Verification email could not be sent. Please try again later.' });
    }

    res.status(202).json({
      message: 'A new verification code has been sent to your email address.',
      ...(purpose === 'signup' && process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!validEmail(email)) return invalidInput(res, 'Enter a valid email address.');

    const user = await User.findOne({ email, isActive: true, emailVerified: true }).select('name');
    if (user) {
      const existing = await AuthChallenge.findOne({ email, purpose: 'password_reset' });
      if (existing?.lastSentAt && Date.now() - existing.lastSentAt.getTime() < 60_000) {
        return res.status(202).json({ message: 'If an eligible account exists, a verification code has been sent.' });
      }
      const code = String(randomInt(100000, 1_000_000));
      const challenge = await AuthChallenge.findOneAndUpdate(
        { email, purpose: 'password_reset' },
        {
          $set: {
            email,
            purpose: 'password_reset',
            codeHash: hashOtp(email, 'password_reset', code),
            passwordHash: null,
            name: user.name,
            attempts: 0,
            verifiedAt: null,
            resetTokenHash: null,
            resetTokenExpiresAt: null,
            expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
            lastSentAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      try {
        await sendOtpEmail({ email, name: user.name, code, purpose: 'password_reset' });
      } catch (error) {
        await AuthChallenge.deleteOne({ _id: challenge._id });
        console.error('Password-reset email delivery failed:', error.message);
      }
    }

    res.status(202).json({ message: 'If an eligible account exists, a verification code has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { resetToken, newPassword } = req.body;
    if (!validEmail(email) || typeof resetToken !== 'string' || !validPassword(newPassword)) {
      return invalidInput(res, 'Provide a valid reset request and a password of at least 12 characters.');
    }

    const challenge = await AuthChallenge.findOne({
      email,
      purpose: 'password_reset',
      verifiedAt: { $ne: null },
      resetTokenExpiresAt: { $gt: new Date() },
    });
    if (!challenge || !matchesHash(hashResetToken(resetToken), challenge.resetTokenHash)) {
      return res.status(400).json({ message: 'The password reset authorization is invalid or expired.' });
    }

    const user = await User.findOne({ email, isActive: true }).select('+tokenVersion');
    if (!user) {
      await AuthChallenge.deleteOne({ _id: challenge._id });
      return res.status(400).json({ message: 'The password reset authorization is invalid or expired.' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.mustChangePassword = false;
    await user.save();
    io.in(`user:${user._id}`).disconnectSockets(true);
    await AuthChallenge.deleteOne({ _id: challenge._id });
    clearSession(res);
    try { await sendPasswordResetConfirmationEmail({ email: user.email, name: user.name }); } catch (error) { console.error('Password reset confirmation email failed:', error.message); }
    res.json({ message: 'Your password has been changed. Sign in with your new password.' });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!validPassword(newPassword)) {
      return invalidInput(res, 'The new password must be at least 12 characters and no more than 128 characters.');
    }
    const user = await User.findById(req.user._id).select('+passwordHash +tokenVersion');
    if (!user || (
      !user.mustChangePassword
      && !await bcrypt.compare(String(currentPassword || ''), user.passwordHash)
    )) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.mustChangePassword = false;
    await user.save();
    io.in(`user:${user._id}`).disconnectSockets(true);
    clearSession(res);
    try { await sendPasswordResetConfirmationEmail({ email: user.email, name: user.name }); } catch (error) { console.error('Password change confirmation email failed:', error.message); }
    res.json({ message: 'Password changed. Please sign in again.' });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = (req, res) => {
  res.json({ user: safeUser(req.user) });
};

export const logout = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    io.in(`user:${req.user._id}`).disconnectSockets(true);
    clearSession(res);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUser = async (req, res, next) => {
  try {
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = String(req.body.name || '').trim();
      if (name.length < 2 || name.length > 120) return invalidInput(res, 'Name must be between 2 and 120 characters.');
      updates.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      const phone = String(req.body.phone || '').trim();
      if (phone.length > 30) return invalidInput(res, 'Phone number is too long.');
      updates.phone = phone;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'preferredLanguage')) {
      if (!['en', 'ne'].includes(req.body.preferredLanguage)) {
        return invalidInput(res, 'Preferred language must be English or Nepali.');
      }
      updates.preferredLanguage = req.body.preferredLanguage;
    }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: 'after' });
    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const updateCurrentUserPhoto = async (req, res, next) => {
  try {
    if (!req.file?.path && req.body.removePhoto !== 'true') {
      return invalidInput(res, 'Choose an image or explicitly request photo removal.');
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    const previousPhoto = user.photo;
    user.photo = req.file?.path || null;
    await user.save();

    if (previousPhoto && previousPhoto !== user.photo) {
      const uploadMarker = '/upload/';
      const markerIndex = previousPhoto.indexOf(uploadMarker);
      if (markerIndex >= 0) {
        const publicId = previousPhoto.slice(markerIndex + uploadMarker.length)
          .replace(/^v\d+\//, '')
          .replace(/\.[^.]+$/, '');
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (error) {
          console.error('Previous user photo cleanup failed:', error.message);
        }
      }
    }

    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
};

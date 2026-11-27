import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Member from '../models/Member.js';

if (process.env.NODE_ENV === 'production' && process.env.SKIP_AUTH === '1') {
  throw new Error('SKIP_AUTH must never be enabled in production.');
}

export const getJwtSecret = () => {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
};

export const getOtpSecret = () => {
  if (!Object.prototype.hasOwnProperty.call(process.env, 'AUTH_OTP_SECRET')) return '';
  const secret = process.env.AUTH_OTP_SECRET;
  if (secret === undefined || secret === null || Buffer.byteLength(String(secret)) < 32) {
    throw new Error('AUTH_OTP_SECRET must be configured with at least 32 characters.');
  }
  return String(secret);
};

export const parseCookies = (header = '') => Object.fromEntries(
  header.split(';').map((cookie) => {
    const separator = cookie.indexOf('=');
    if (separator < 0) return ['', ''];
    const key = cookie.slice(0, separator).trim();
    const value = cookie.slice(separator + 1).trim();
    try {
      return [key, decodeURIComponent(value)];
    } catch {
      return [key, value];
    }
  }).filter(([key]) => key)
);

const isTestHarness = () => process.env.NODE_ENV === 'test' && process.env.SKIP_AUTH === '1';

export const authenticate = async (req, res, next) => {
  if (isTestHarness()) {
    req.user = { role: 'admin', _id: '000000000000000000000000' };
    return next();
  }
  try {
    const token = req.cookies?.access_token || parseCookies(req.headers.cookie).access_token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    const user = await User.findById(payload.sub).select('+tokenVersion');
    if (!user || !user.isActive || !user.emailVerified || user.tokenVersion !== payload.ver) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session is invalid or expired. Please sign in again.' });
    }
    next(error);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  next();
};

export const requireCsrf = (req, res, next) => {
  if (isTestHarness()) return next();
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const headerToken = req.get('x-csrf-token');
  const cookieToken = req.cookies?.csrf_token || parseCookies(req.headers?.cookie || '').csrf_token;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ message: 'Request verification failed. Refresh the page and try again.' });
  }
  next();
};

export const authorizedFamilyIds = async (user) => {
  if (user.role === 'admin') return null;
  if (user.role === 'staff') return (user.allowedFamilies || []).map(String);
  if (!user.linkedMember) return [];

  const member = await Member.findById(user.linkedMember).select('family').lean();
  return member?.family ? [String(member.family)] : [];
};

export const requireFamilyAccess = async (req, res, next) => {
  try {
    const familyIds = await authorizedFamilyIds(req.user);
    if (familyIds === null) return next();
    const requestedFamilyId = String(
      req.params.familyId || req.params.id || req.query?.family || req.body?.family || ''
    );
    if (requestedFamilyId && !familyIds.includes(requestedFamilyId)) {
      return res.status(403).json({ message: 'You do not have access to this family.' });
    }
    req.authorizedFamilyIds = familyIds;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireMemberFamilyAccess = async (req, res, next) => {
  try {
    const member = await Member.findById(req.params.id).select('family createdBy').lean();
    if (!member) return res.status(404).json({ message: 'Member not found.' });

    if (req.user?.role === 'user') {
      const addedByUser = String(member.createdBy || '') === String(req.user._id);
      if (!addedByUser) {
        return res.status(403).json({ message: 'You do not have access to this member.' });
      }
      req.authorizedMemberFamilyId = member.family ? String(member.family) : null;
      return next();
    }

    const familyIds = await authorizedFamilyIds(req.user);
    if (familyIds !== null && (!member.family || !familyIds.includes(String(member.family)))) {
      return res.status(403).json({ message: 'You do not have access to this member.' });
    }

    req.authorizedMemberFamilyId = member.family ? String(member.family) : null;
    next();
  } catch (error) {
    next(error);
  }
};

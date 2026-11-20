import LoginActivity from '../models/LoginActivity.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import { io } from '../server.js';

const describeUserAgent = (userAgent = '') => {
  const ua = String(userAgent);
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Unknown browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iOS/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  return { browser, os };
};

export const getLoginHistory = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
    const history = await LoginActivity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      data: history.map((entry) => ({
        id: String(entry._id),
        email: entry.email,
        ip: entry.ip,
        userAgent: entry.userAgent,
        success: entry.success,
        createdAt: entry.createdAt,
        ...describeUserAgent(entry.userAgent),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveDevices = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = await LoginActivity.find({
      user: req.user._id,
      success: true,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 }).lean();

    const currentAgent = req.get('user-agent') || '';
    const currentIp = req.ip || '';
    const seen = new Set();
    const devices = [];

    for (const entry of recent) {
      const key = `${entry.userAgent}|${entry.ip}`;
      if (seen.has(key)) continue;
      seen.add(key);
      devices.push({
        id: String(entry._id),
        name: describeUserAgent(entry.userAgent).browser,
        browser: describeUserAgent(entry.userAgent).browser,
        os: describeUserAgent(entry.userAgent).os,
        ip: entry.ip,
        lastActive: entry.createdAt,
        current: entry.userAgent === currentAgent && entry.ip === currentIp,
      });
    }

    res.json(devices);
  } catch (error) {
    next(error);
  }
};

export const forceLogoutAll = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+tokenVersion');
    if (!user) return res.status(404).json({ message: 'User account not found.' });

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    io.in(`user:${user._id}`).disconnectSockets(true);

    res.json({ message: 'All sessions have been signed out. Please sign in again.' });
  } catch (error) {
    next(error);
  }
};

export const updateSecuritySettings = async (req, res, next) => {
  try {
    const security = req.body && typeof req.body === 'object' ? req.body : {};
    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          security,
          updatedBy: req.user?._id || null,
        },
        $setOnInsert: { key: 'global' },
      },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ settings: settings.security || {} });
  } catch (error) {
    next(error);
  }
};

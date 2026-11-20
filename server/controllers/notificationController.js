import Notification from '../models/Notification.js';
import { io } from '../server.js';

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value ?? ''));

const notificationTypes = new Set([
  'member_added', 'member_updated', 'member_deleted',
  'donation_added', 'document_uploaded', 'report_generated',
  'family_added', 'family_updated', 'family_closed', 'family_reopened',
  'house_added', 'house_updated',
  'general',
]);

const notificationRoles = new Set(['admin', 'staff', 'user']);

const wantsGlobal = (req) => ['true', '1'].includes(String(req.query?.global ?? req.query?.all ?? ''));

const audienceEmit = (event, payload, notification, user) => {
  const recipient = notification?.recipient ? String(notification.recipient) : '';
  const roles = Array.isArray(notification?.recipientRoles) ? notification.recipientRoles : [];

  if (isObjectId(recipient)) {
    io.to(`user:${recipient}`).emit(event, payload);
    return;
  }
  if (roles.length) {
    roles.forEach((role) => io.to(`role:${role}`).emit(event, payload));
    return;
  }
  if (user?.role === 'admin') {
    io.to('role:admin').emit(event, payload);
    return;
  }
  const id = String(user?._id ?? '');
  if (isObjectId(id)) io.to(`user:${id}`).emit(event, payload);
};

const findVisibleNotification = (req) => {
  const id = req.params.id;
  if (!isObjectId(id)) return null;
  return Notification.findOne({ _id: id, ...Notification.visibleTo(req.user) });
};

export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    const query = { ...Notification.visibleTo(req.user) };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      Notification.countDocuments(query),
    ]);

    res.json({
      data: notifications,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const notification = await findVisibleNotification(req);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await findVisibleNotification(req);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    audienceEmit('notification:read', notification, notification, req.user);

    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    if (wantsGlobal(req) && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    await Notification.updateMany(
      { ...Notification.visibleTo(req.user), isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    audienceEmit('notification:all_read', undefined, undefined, req.user);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await findVisibleNotification(req);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.deleteOne();

    audienceEmit('notification:deleted', { id: req.params.id }, notification, req.user);

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    if (wantsGlobal(req) && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    const query = { ...Notification.visibleTo(req.user) };
    if (req.query.isRead === 'true') query.isRead = true;
    const result = await Notification.deleteMany(query);

    audienceEmit('notification:cleared', { isRead: req.query.isRead === 'true' }, undefined, req.user);

    res.json({ message: 'Notifications deleted successfully', deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      ...Notification.visibleTo(req.user),
      isRead: false,
    });
    res.json({ unread: count });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { type, title, message, data, recipient, recipientRoles } = req.body || {};

    if (!notificationTypes.has(type)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }
    if (typeof title !== 'string' || !title.trim() || title.length > 200) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (typeof message !== 'string' || !message.trim() || message.length > 1000) {
      return res.status(400).json({ message: 'Message is required' });
    }
    if (recipient !== undefined && recipient !== null && recipient !== '' && !isObjectId(recipient)) {
      return res.status(400).json({ message: 'Invalid recipient' });
    }
    if (recipientRoles !== undefined && recipientRoles !== null) {
      if (!Array.isArray(recipientRoles) || recipientRoles.some((role) => !notificationRoles.has(role))) {
        return res.status(400).json({ message: 'Invalid recipient roles' });
      }
    }
    if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
      return res.status(400).json({ message: 'Invalid notification data' });
    }

    const notification = new Notification({
      type,
      title: title.trim(),
      message: message.trim(),
      data: data || {},
      recipient: recipient || null,
      recipientRoles: recipientRoles || [],
      createdBy: req.user?._id || null,
    });

    await notification.save();

    audienceEmit('notification:new', notification, notification, req.user);

    res.status(201).json(notification);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid notification data' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

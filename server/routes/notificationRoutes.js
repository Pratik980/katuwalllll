import express from 'express';
import { requireRole } from '../middlewares/authentication.js';
import {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  createNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

const globalRequested = (req) => ['true', '1'].includes(String(req.query?.global ?? req.query?.all ?? ''));

const adminOnlyWhenGlobal = (req, res, next) => {
  if (globalRequested(req)) return requireRole('admin')(req, res, next);
  next();
};

router.get('/', getNotifications);
router.get('/unread', getUnreadCount);
router.get('/:id', getNotificationById);
router.post('/', requireRole('admin'), createNotification);
router.put('/:id/read', markAsRead);
router.put('/read-all', adminOnlyWhenGlobal, markAllAsRead);
router.delete('/', adminOnlyWhenGlobal, deleteAllNotifications);
router.delete('/:id', deleteNotification);

export default router;

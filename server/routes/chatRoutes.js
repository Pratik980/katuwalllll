import express from 'express';
import {
  getChatRooms,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
} from '../controllers/chatController.js';
import { requireRole } from '../middlewares/authentication.js';

const router = express.Router();

router.use(requireRole('admin', 'staff', 'user'));

router.get('/rooms', getChatRooms);
router.get('/rooms/:room/messages', getChatMessages);
router.post('/messages', sendMessage);
router.put('/rooms/:room/read', markMessagesAsRead);
router.get('/unread', getUnreadCount);

export default router;
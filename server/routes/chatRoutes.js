import express from 'express';
import {
  getChatRooms,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  addReaction,
  deleteChatMessage,
  uploadChatFile,
} from '../controllers/chatController.js';
import { requireRole } from '../middlewares/authentication.js';
import { uploadSinglePhoto, handleUpload } from '../middlewares/upload.js';

const router = express.Router();

router.use(requireRole('admin', 'staff', 'user'));

router.get('/rooms', getChatRooms);
router.get('/rooms/:room/messages', getChatMessages);
router.post('/messages', sendMessage);
router.put('/messages/:id/react', addReaction);
router.delete('/messages/:id', deleteChatMessage);
router.post('/upload', handleUpload(uploadSinglePhoto), uploadChatFile);
router.put('/rooms/:room/read', markMessagesAsRead);
router.get('/unread', getUnreadCount);

export default router;

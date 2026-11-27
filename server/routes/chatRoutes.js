import express from 'express';
import {
  getChatRooms,
  createChatGroup,
  deleteChatGroup,
  getChatMessages,
  sendMessage,
  editChatMessage,
  markMessagesAsRead,
  getUnreadCount,
  addReaction,
  deleteChatMessage,
  unsendChatMessage,
  uploadChatFile,
} from '../controllers/chatController.js';
import { requireRole } from '../middlewares/authentication.js';
import { uploadSingleChatImage, handleUpload } from '../middlewares/upload.js';

const router = express.Router();

router.use(requireRole('admin', 'staff', 'user'));

router.get('/rooms', getChatRooms);
router.post('/rooms', createChatGroup);
router.delete('/rooms/:groupId', deleteChatGroup);
router.get('/rooms/:room/messages', getChatMessages);
router.post('/messages', sendMessage);
router.put('/messages/:id/unsend', unsendChatMessage);
router.put('/messages/:id', editChatMessage);
router.put('/messages/:id/react', addReaction);
router.delete('/messages/:id', deleteChatMessage);
router.post('/upload', handleUpload(uploadSingleChatImage), uploadChatFile);
router.put('/rooms/:room/read', markMessagesAsRead);
router.get('/unread', getUnreadCount);

export default router;

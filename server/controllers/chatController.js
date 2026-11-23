import Chat from '../models/Chat.js';
import { io } from '../server.js';

// Predefined chat rooms
const CHAT_ROOMS = [
  'general',
  'announcements',
  'family_discussion',
  'events',
  'genealogy_help',
];

const ROOM_METADATA = {
  general: {
    name: 'General',
    description: 'Open family discussions & community updates for everyone',
    icon: 'MessageSquare',
    theme: 'emerald',
  },
  announcements: {
    name: 'Announcements',
    description: 'Official notices, decisions & central committee notices',
    icon: 'Megaphone',
    theme: 'amber',
  },
  family_discussion: {
    name: 'Family Discussion',
    description: 'Heritage, branches, gotra, and regional lineages',
    icon: 'Users',
    theme: 'indigo',
  },
  events: {
    name: 'Events & Puja',
    description: 'Kulpuja, festive gatherings, annual meetings & rites',
    icon: 'Calendar',
    theme: 'purple',
  },
  genealogy_help: {
    name: 'Genealogy Help',
    description: 'Help with adding ancestors, family trees & verification',
    icon: 'BookOpen',
    theme: 'cyan',
  },
};

export const getChatRooms = async (req, res) => {
  try {
    const roomsWithLastMsg = await Promise.all(
      CHAT_ROOMS.map(async (roomId) => {
        const meta = ROOM_METADATA[roomId] || {
          name: roomId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: '',
          icon: 'MessageSquare',
          theme: 'emerald',
        };
        const lastMsg = await Chat.findOne({ room: roomId, isDeleted: false })
          .sort({ createdAt: -1 })
          .select('message senderName createdAt');
        return {
          id: roomId,
          name: meta.name,
          description: meta.description,
          icon: meta.icon,
          theme: meta.theme,
          lastMessage: lastMsg ? {
            text: lastMsg.message,
            sender: lastMsg.senderName,
            time: lastMsg.createdAt,
          } : null,
        };
      })
    );
    res.json({ rooms: roomsWithLastMsg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const page = Number.parseInt(req.query.page || '1', 10);
    const limit = Number.parseInt(req.query.limit || '50', 10);

    if (!CHAT_ROOMS.includes(room)) {
      return res.status(400).json({ message: 'Invalid chat room' });
    }
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ message: 'Invalid message page or page size.' });
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Chat.find({ room })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Chat.countDocuments({ room }),
    ]);

    res.json({
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { room, message, replyTo, attachments } = req.body;

    if (!CHAT_ROOMS.includes(room)) {
      return res.status(400).json({ message: 'Invalid chat room' });
    }

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const hasText = typeof message === 'string' && message.trim().length > 0;

    if (!hasText && !hasAttachments) {
      return res.status(400).json({ message: 'Message or attachment is required.' });
    }

    if (hasText && message.length > 2000) {
      return res.status(400).json({ message: 'Message must not exceed 2000 characters.' });
    }

    const chatMessage = new Chat({
      room,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role || 'user',
      message: hasText ? message.trim() : 'Shared an attachment',
      replyTo: replyTo && replyTo.messageId ? {
        messageId: replyTo.messageId,
        senderName: replyTo.senderName,
        messageText: replyTo.messageText,
      } : null,
      attachments: hasAttachments ? attachments : [],
    });

    await chatMessage.save();

    if (io) {
      io.to(room).emit('chat:message', chatMessage);
    }

    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ message: 'Emoji is required.' });
    }

    const chat = await Chat.findById(id);
    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const existingIndex = chat.reactions.findIndex(
      (r) => String(r.userId) === String(req.user._id) && r.emoji === emoji
    );

    if (existingIndex > -1) {
      chat.reactions.splice(existingIndex, 1);
    } else {
      chat.reactions.push({
        emoji,
        userId: req.user._id,
        userName: req.user.name,
      });
    }

    await chat.save();

    if (io) {
      io.to(chat.room).emit('chat:reaction', {
        messageId: chat._id,
        reactions: chat.reactions,
        room: chat.room,
      });
    }

    res.json({ reactions: chat.reactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteChatMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await Chat.findById(id);
    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const isSender = String(chat.sender) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';

    if (!isSender && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this message.' });
    }

    chat.isDeleted = true;
    chat.message = 'This message was deleted';
    chat.attachments = [];
    await chat.save();

    if (io) {
      io.to(chat.room).emit('chat:deleted', {
        messageId: chat._id,
        room: chat.room,
      });
    }

    res.json({ message: 'Message deleted successfully', messageId: chat._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.status(201).json({
      url: req.file.path,
      name: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { room } = req.params;

    if (!CHAT_ROOMS.includes(room)) {
      return res.status(400).json({ message: 'Invalid chat room' });
    }

    await Chat.updateMany(
      { room, isRead: false, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { 
        $addToSet: { readBy: req.user._id },
        readAt: new Date(),
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const counts = await Promise.all(
      CHAT_ROOMS.map(async (room) => {
        const count = await Chat.countDocuments({
          room,
          isRead: false,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id },
        });
        return { room, unread: count };
      })
    );

    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

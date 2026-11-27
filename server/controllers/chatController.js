import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import ChatGroup from '../models/ChatGroup.js';
import User from '../models/User.js';
import { io } from '../server.js';

const DEFAULT_ROOM_IDS = [
  'general',
  'announcements',
  'family_discussion',
  'events',
  'genealogy_help',
];

const ROOM_METADATA = {
  general: {
    name: 'General',
    description: 'Open family discussions and community updates for everyone',
    icon: 'MessageSquare',
  },
  announcements: {
    name: 'Announcements',
    description: 'Official notices, decisions and central committee updates',
    icon: 'Megaphone',
  },
  family_discussion: {
    name: 'Family Discussion',
    description: 'Heritage, branches, gotra and regional lineages',
    icon: 'Users',
  },
  events: {
    name: 'Events & Puja',
    description: 'Kulpuja, festive gatherings, annual meetings and rites',
    icon: 'Calendar',
  },
  genealogy_help: {
    name: 'Genealogy Help',
    description: 'Help with adding ancestors, family trees and verification',
    icon: 'BookOpen',
  },
};

const GROUP_ROOM_PATTERN = /^group_[0-9a-f-]{36}$/i;
const isDefaultRoom = (room) => DEFAULT_ROOM_IDS.includes(room);
const cleanText = (value, max) => String(value || '').trim().slice(0, max);
const invalidId = (res, id, resource) => {
  if (mongoose.isValidObjectId(id)) return false;
  res.status(400).json({ message: `Invalid ${resource} ID.` });
  return true;
};
const sanitizeMessage = (chat) => {
  const data = typeof chat.toObject === 'function' ? chat.toObject() : { ...chat };
  if (data.isDeleted) {
    data.message = '';
    data.attachments = [];
  }
  return data;
};

const getGroup = async (roomId) => {
  if (!GROUP_ROOM_PATTERN.test(String(roomId || ''))) return null;
  return ChatGroup.findOne({ roomId, isActive: true }).lean();
};

const roomAllowed = async (roomId) => isDefaultRoom(roomId) || Boolean(await getGroup(roomId));

const sanitizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .slice(0, 4)
    .filter((attachment) => attachment && typeof attachment.url === 'string' && /^https?:\/\//i.test(attachment.url))
    .filter((attachment) => !attachment.fileType || String(attachment.fileType).startsWith('image/'))
    .map((attachment) => ({
      url: attachment.url,
      name: cleanText(attachment.name, 200),
      fileType: cleanText(attachment.fileType || 'image/jpeg', 80),
      size: Number(attachment.size) || 0,
    }));
};

export const getChatRooms = async (req, res) => {
  try {
    const groups = await ChatGroup.find({ isActive: true })
      .sort({ createdAt: 1 })
      .lean();

    const rooms = [
      ...DEFAULT_ROOM_IDS.map((roomId) => ({
        id: roomId,
        ...ROOM_METADATA[roomId],
        theme: 'emerald',
        isGroup: false,
        createdBy: null,
      })),
      ...groups.map((group) => ({
        id: group.roomId,
        name: group.name,
        description: group.description || 'Custom group conversation',
        icon: 'Users',
        theme: 'emerald',
        isGroup: true,
        createdBy: group.createdBy,
        createdByName: group.createdByName,
        createdAt: group.createdAt,
      })),
    ];

    const roomsWithLastMsg = await Promise.all(
      rooms.map(async (room) => {
        const lastMsg = await Chat.findOne({ room: room.id, isDeleted: false })
          .sort({ createdAt: -1 })
          .select('message senderName createdAt');
        return {
          ...room,
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

export const createChatGroup = async (req, res) => {
  try {
    const name = cleanText(req.body.name, 80);
    const description = cleanText(req.body.description, 300);
    if (name.length < 2) {
      return res.status(400).json({ message: 'Group name must be at least 2 characters.' });
    }
    if (await ChatGroup.exists({ name, isActive: true })) {
      return res.status(409).json({ message: 'A group with this name already exists.' });
    }

    const isAdminGroup = req.user.role === 'admin' && req.body.isAdminGroup === true;
    const group = await ChatGroup.create({
      roomId: `group_${randomUUID()}`,
      name,
      description,
      createdBy: req.user._id,
      createdByName: req.user.name,
      ownerRole: req.user.role || 'user',
      isAdminGroup,
    });

    const payload = {
      id: group.roomId,
      name: group.name,
      description: group.description,
      icon: 'Users',
      theme: 'emerald',
      isGroup: true,
      createdBy: group.createdBy,
      createdByName: group.createdByName,
      createdAt: group.createdAt,
      isAdminGroup: group.isAdminGroup,
      lastMessage: null,
    };
    if (io) io.emit('chat:room-created', payload);
    res.status(201).json({ room: payload });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A group with this name already exists.' });
    res.status(400).json({ message: error.message });
  }
};

export const deleteChatGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const isRoomId = GROUP_ROOM_PATTERN.test(String(groupId || ''));
    if (!isRoomId && !mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ message: 'Invalid group ID.' });
    }
    const group = isRoomId
      ? await ChatGroup.findOne({ roomId: groupId })
      : await ChatGroup.findById(groupId);

    if (!group || !group.isActive) {
      return res.status(404).json({ message: 'Chat group not found.' });
    }
    if (req.user.role !== 'admin') {
      if (group.isAdminGroup || group.ownerRole === 'admin') {
        return res.status(403).json({ message: 'Only an administrator can delete this group.' });
      }
      if (!group.ownerRole) {
        const owner = await User.findById(group.createdBy).select('role').lean();
        if (owner?.role === 'admin') {
          return res.status(403).json({ message: 'Only an administrator can delete this group.' });
        }
      }
      if (String(group.createdBy) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Only the group creator can delete this group.' });
      }
    }

    await Promise.all([
      Chat.deleteMany({ room: group.roomId }),
      ChatGroup.deleteOne({ _id: group._id }),
    ]);

    if (io) io.emit('chat:room-deleted', { roomId: group.roomId, groupId: String(group._id) });
    res.json({ message: 'Chat group deleted successfully.', roomId: group.roomId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const page = Number.parseInt(req.query.page || '1', 10);
    const limit = Number.parseInt(req.query.limit || '50', 10);

    if (!(await roomAllowed(room))) {
      return res.status(404).json({ message: 'Chat room not found.' });
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
      data: messages.map(sanitizeMessage).reverse(),
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
    const { room, message, replyTo } = req.body;

    if (!(await roomAllowed(room))) {
      return res.status(404).json({ message: 'Chat room not found.' });
    }

    const attachments = sanitizeAttachments(req.body.attachments);
    const hasAttachments = attachments.length > 0;
    const text = typeof message === 'string' ? message.trim() : '';
    const hasText = text.length > 0;

    if (!hasText && !hasAttachments) {
      return res.status(400).json({ message: 'Message or image is required.' });
    }
    if (hasText && text.length > 2000) {
      return res.status(400).json({ message: 'Message must not exceed 2000 characters.' });
    }

    const chatMessage = new Chat({
      room,
      sender: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role || 'user',
      message: hasText ? text : 'Shared an image',
      replyTo: replyTo && replyTo.messageId ? {
        messageId: replyTo.messageId,
        senderName: cleanText(replyTo.senderName, 120),
        messageText: cleanText(replyTo.messageText, 300),
      } : null,
      attachments,
    });

    await chatMessage.save();
    if (io) io.to(room).emit('chat:message', chatMessage);

    res.status(201).json(chatMessage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const editChatMessage = async (req, res) => {
  try {
    if (invalidId(res, req.params.id, 'message')) return;
    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.isDeleted) return res.status(404).json({ message: 'Message not found.' });
    if (String(chat.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ message: 'Message text is required.' });
    if (message.length > 2000) return res.status(400).json({ message: 'Message must not exceed 2000 characters.' });

    chat.message = message;
    chat.editedAt = new Date();
    await chat.save();

    if (io) io.to(chat.room).emit('chat:updated', chat);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (invalidId(res, id, 'message')) return;
    if (!emoji || typeof emoji !== 'string' || emoji.length > 16) {
      return res.status(400).json({ message: 'Emoji is required.' });
    }

    const chat = await Chat.findById(id);
    if (!chat || chat.isDeleted) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const existingIndex = chat.reactions.findIndex(
      (reaction) => String(reaction.userId) === String(req.user._id) && reaction.emoji === emoji
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
    if (invalidId(res, req.params.id, 'message')) return;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Message not found' });

    const isSender = String(chat.sender) === String(req.user._id);
    if (!isSender) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    await Chat.deleteOne({ _id: chat._id });
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

export const unsendChatMessage = async (req, res) => {
  try {
    if (invalidId(res, req.params.id, 'message')) return;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Message not found' });
    if (String(chat.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only unsend your own messages.' });
    }

    chat.isDeleted = true;
    chat.message = '';
    chat.attachments = [];
    await chat.save({ validateBeforeSave: false });

    const sanitized = sanitizeMessage(chat);
    if (io) io.to(chat.room).emit('chat:updated', sanitized);
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose an image to upload.' });
    }
    res.status(201).json({
      url: req.file.path || req.file.secure_url,
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
    if (!(await roomAllowed(room))) {
      return res.status(404).json({ message: 'Chat room not found.' });
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
    const groups = await ChatGroup.find({ isActive: true }).select('roomId').lean();
    const roomIds = [...DEFAULT_ROOM_IDS, ...groups.map((group) => group.roomId)];
    const counts = await Promise.all(
      roomIds.map(async (room) => {
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

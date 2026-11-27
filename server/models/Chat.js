import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const chatSchema = new mongoose.Schema({
  uuid: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  room: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
  },
  senderRole: {
    type: String,
    default: 'user',
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  replyTo: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      default: null,
    },
    senderName: {
      type: String,
      default: null,
    },
    messageText: {
      type: String,
      default: null,
    },
  },
  attachments: [{
    url: String,
    fileType: String,
    name: String,
    size: Number,
  }],
  reactions: [{
    emoji: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: String,
  }],
  editedAt: {
    type: Date,
    default: null,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  readAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for performance
chatSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model('Chat', chatSchema);

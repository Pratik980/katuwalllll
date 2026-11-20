import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const notificationSchema = new mongoose.Schema({
  uuid: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  type: {
    type: String,
    enum: [
      'member_added', 'member_updated', 'member_deleted',
      'donation_added', 'document_uploaded', 'report_generated',
      'family_added', 'family_updated', 'family_closed', 'family_reopened',
      'house_added', 'house_updated',
      'general',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  recipientRoles: [{
    type: String,
    enum: ['admin', 'staff', 'user'],
  }],
}, {
  timestamps: true,
});

// Indexes for performance
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipientRoles: 1, createdAt: -1 });

notificationSchema.statics.visibleTo = function (user) {
  if (user?.role === 'admin') return {};
  if (!user || !user.role) return { _id: null };
  const id = String(user._id ?? '');
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return { _id: null };
  return {
    $or: [
      { recipient: id },
      { recipientRoles: user.role },
    ],
  };
};

export default mongoose.model('Notification', notificationSchema);
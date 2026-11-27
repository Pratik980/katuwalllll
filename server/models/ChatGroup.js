import mongoose from 'mongoose';

const chatGroupSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  createdByName: {
    type: String,
    required: true,
    trim: true,
  },
  ownerRole: {
    type: String,
    default: 'user',
  },
  isAdminGroup: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('ChatGroup', chatGroupSchema);

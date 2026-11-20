import mongoose from 'mongoose';

const loginActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  ip: {
    type: String,
    trim: true,
    default: '',
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  success: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

loginActivitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('LoginActivity', loginActivitySchema);

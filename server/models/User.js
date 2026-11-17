import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 30,
    default: '',
  },
  photo: {
    type: String,
    default: null,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'user'],
    default: 'user',
    required: true,
    index: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  linkedMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    default: null,
  },
  allowedFamilies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
  }],
  preferredLanguage: {
    type: String,
    enum: ['en', 'ne'],
    default: 'en',
  },
  tokenVersion: {
    type: Number,
    default: 0,
    select: false,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

userSchema.index(
  { linkedMember: 1 },
  { unique: true, partialFilterExpression: { linkedMember: { $type: 'objectId' } } }
);

export default mongoose.model('User', userSchema);

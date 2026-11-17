import mongoose from 'mongoose';

const authChallengeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'password_reset'],
    required: true,
  },
  codeHash: {
    type: String,
    required: true,
  },
  passwordHash: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  resetTokenHash: {
    type: String,
    default: null,
  },
  resetTokenExpiresAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
  lastSentAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

authChallengeSchema.index({ email: 1, purpose: 1 }, { unique: true });

export default mongoose.model('AuthChallenge', authChallengeSchema);

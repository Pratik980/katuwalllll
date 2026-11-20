import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    default: 'global',
  },
  general: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  notifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  documents: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  reports: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  appearance: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  system: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  security: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  backup: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { timestamps: true, minimize: false });

export default mongoose.model('Setting', settingsSchema);

import Setting from '../models/Setting.js';

export const DEFAULT_SETTINGS = {
  general: {
    name: 'Katuwal Bansha Batika',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  },
  notifications: {
    emailNotifications: true,
    browserNotifications: true,
    donationNotifications: true,
    newMemberNotifications: true,
    birthdayNotifications: true,
    familyUpdateNotifications: true,
    chatNotifications: true,
    soundNotifications: true,
  },
  documents: {
    allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
    maxUploadSize: 15,
    autoRename: false,
    deleteOldFiles: false,
    storagePath: '/uploads/documents',
  },
  reports: {
    defaultExportFormat: 'xlsx',
    includeMemberPhoto: true,
    includeContactDetails: true,
    includeAddress: true,
    includeFamilyInformation: true,
    autoColumnWidth: true,
    dateFormat: 'YYYY-MM-DD',
    excelFileNameFormat: '{report_type}_{date}',
  },
  appearance: {
    theme: 'system',
    compactMode: false,
    fontSize: 'medium',
  },
  system: {
    language: 'en',
    timeZone: 'Asia/Kathmandu',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24',
    currency: 'NPR',
    country: 'Nepal',
  },
  security: {
    sessionTimeout: 60,
    twoFactorEnabled: false,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  },
  backup: {
    automaticBackup: 'disabled',
    backupLocation: '/backups',
  },
};

const SECTIONS = Object.keys(DEFAULT_SETTINGS);

const mergeSection = (section, value) => {
  const fallback = DEFAULT_SETTINGS[section];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  if (!fallback || typeof fallback !== 'object' || Array.isArray(fallback)) return value;
  return { ...fallback, ...value };
};

const shapeSettings = (document) => {
  const source = document?.toObject ? document.toObject() : (document || {});
  return SECTIONS.reduce((result, section) => {
    result[section] = mergeSection(section, source[section]);
    return result;
  }, {});
};

const loadSettings = async () => {
  const existing = await Setting.findOne({ key: 'global' });
  return existing || new Setting({ key: 'global', ...DEFAULT_SETTINGS });
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await loadSettings();
    res.json({ settings: shapeSettings(settings) });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updates = {};
    for (const section of SECTIONS) {
      if (Object.prototype.hasOwnProperty.call(req.body, section)) {
        updates[section] = mergeSection(section, req.body[section]);
      }
    }
    updates.updatedBy = req.user?._id || null;

    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      { $set: updates, $setOnInsert: { key: 'global' } },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ settings: shapeSettings(settings) });
  } catch (error) {
    next(error);
  }
};

export const updateSettingsSection = (section) => async (req, res, next) => {
  try {
    if (!SECTIONS.includes(section)) {
      return res.status(400).json({ message: 'Unknown settings section.' });
    }

    const settings = await Setting.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          [section]: mergeSection(section, req.body),
          updatedBy: req.user?._id || null,
        },
        $setOnInsert: { key: 'global' },
      },
      { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({ settings: shapeSettings(settings) });
  } catch (error) {
    next(error);
  }
};

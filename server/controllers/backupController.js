import Backup from '../models/Backup.js';
import mongoose from 'mongoose';
import fs from 'fs';

const EXCLUDED_COLLECTIONS = new Set(['backups', 'fs.files', 'fs.chunks']);

const PROTECTED_COLLECTIONS = new Set([
  'users',
  'counters',
  'authchallenges',
  'loginactivities',
  'settings',
]);

const RESTORABLE_COLLECTIONS = new Set([
  'members',
  'families',
  'houses',
  'familyrelationships',
  'donations',
  'documents',
  'drafts',
  'notifications',
  'chats',
  'messages',
  'chatgroups',
  'organizations',
]);

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db);

const exclusionReason = (name) => {
  if (name.startsWith('system.')) return 'system collection';
  if (EXCLUDED_COLLECTIONS.has(name)) return 'backup storage';
  if (name.endsWith('.files') || name.endsWith('.chunks')) return 'file storage';
  return null;
};

const safeError = (error) => String(error?.message || 'Backup failed')
  .replace(/mongodb(?:\+srv)?:\/\/[^@\s]*@/gi, 'mongodb://<redacted>@')
  .replace(/([?&](?:password|pwd|token|secret)=)[^&\s]+/gi, '$1<redacted>')
  .slice(0, 500);

const uploadBackup = (fileName, backupId, buffer) => new Promise((resolve, reject) => {
  const stream = bucket().openUploadStream(fileName, { metadata: { backupId: String(backupId) } });
  stream.once('error', reject);
  stream.once('finish', () => resolve(stream.id));
  stream.end(buffer);
});

const readBackupBuffer = async (backup) => {
  if (backup.fileId) {
    const file = await bucket().find({ _id: backup.fileId }).next();
    if (!file) return null;
    const chunks = [];
    for await (const chunk of bucket().openDownloadStream(backup.fileId)) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  if (backup.filePath && fs.existsSync(backup.filePath)) return fs.readFileSync(backup.filePath);
  return null;
};

export const recordFailedBackup = async (error, createdBy = null, fileName = null) => {
  const backup = await Backup.create({
    fileName: fileName || `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    filePath: '',
    fileSize: 0,
    backupType: 'full',
    status: 'failed',
    collections: [],
    error: safeError(error),
    createdBy: createdBy || null,
  });
  return backup;
};

export const createBackup = async (req, res) => {
  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  let backup;
  try {
    backup = await Backup.create({
      fileName,
      filePath: '',
      fileSize: 0,
      backupType: 'full',
      status: 'pending',
      collections: [],
      createdBy: req.user?._id || null,
    });

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const backupData = {};
    const collectionNames = [];
    const counts = {};
    const refusedCollections = [];

    for (const collection of collections) {
      const name = collection.name;
      const reason = exclusionReason(name);
      if (reason) {
        refusedCollections.push({ collection: name, reason });
        continue;
      }
      const data = await db.collection(name).find({}).toArray();
      backupData[name] = data;
      collectionNames.push(name);
      counts[name] = data.length;
    }

    const buffer = Buffer.from(JSON.stringify(backupData, null, 2));
    backup.fileId = await uploadBackup(fileName, backup._id, buffer);
    backup.fileSize = buffer.length;
    backup.status = 'completed';
    backup.collections = collectionNames;
    await backup.save();

    res.json({
      message: 'Backup created successfully',
      backup,
      collections: collectionNames,
      counts,
      refusedCollections,
      downloadUrl: `/api/backup/download/${backup._id}`,
    });
  } catch (error) {
    const message = safeError(error);
    try {
      if (backup?._id) {
        backup.status = 'failed';
        backup.error = message;
        await backup.save();
      } else {
        await recordFailedBackup(error, req.user?._id, fileName);
      }
    } catch {}
    res.status(500).json({ message: 'Backup failed', error: message });
  }
};

export const getBackups = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page ?? '1', 10);
    const limit = Number.parseInt(req.query.limit ?? '10', 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ message: 'Invalid page or page size.' });
    }
    const skip = (page - 1) * limit;

    const [backups, total] = await Promise.all([
      Backup.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Backup.countDocuments(),
    ]);

    res.json({
      data: backups,
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

export const downloadBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    const buffer = await readBackupBuffer(backup);
    if (!buffer) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
    return res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    if (req.body?.confirm !== 'RESTORE') {
      return res.status(400).json({ message: "Restore requires confirmation: send { confirm: 'RESTORE' }" });
    }

    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    const buffer = await readBackupBuffer(backup);
    if (!buffer) {
      return res.status(404).json({ message: 'Backup file not found' });
    }

    let backupData;
    try {
      backupData = JSON.parse(buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ message: 'Invalid backup data: expected an object of arrays' });
    }
    if (!backupData || typeof backupData !== 'object' || Array.isArray(backupData)) {
      return res.status(400).json({ message: 'Invalid backup data: expected an object of arrays' });
    }

    for (const [collectionName, data] of Object.entries(backupData)) {
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: `Invalid backup data: ${collectionName} is not an array` });
      }
    }

    const plan = {};
    const refusedCollections = [];
    for (const [collectionName, data] of Object.entries(backupData)) {
      if (RESTORABLE_COLLECTIONS.has(collectionName)) {
        plan[collectionName] = data;
      } else {
        refusedCollections.push({
          collection: collectionName,
          reason: PROTECTED_COLLECTIONS.has(collectionName)
            ? 'system-critical collection'
            : exclusionReason(collectionName) || 'unknown collection',
        });
      }
    }

    const collections = Object.keys(plan);
    const counts = {};
    for (const collectionName of collections) {
      counts[collectionName] = plan[collectionName].length;
    }

    if (req.body.dryRun === true) {
      return res.json({
        message: 'Dry run complete; no changes were made',
        dryRun: true,
        collections,
        counts,
        refusedCollections,
      });
    }

    const db = mongoose.connection.db;
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      await collection.deleteMany({});
      if (plan[collectionName].length > 0) await collection.insertMany(plan[collectionName]);
    }

    res.json({
      message: 'Backup restored successfully',
      collections,
      counts,
      refusedCollections,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBackup = async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    if (backup.fileId) {
      try {
        await bucket().delete(backup.fileId);
      } catch {}
    } else if (backup.filePath && fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    await backup.deleteOne();

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

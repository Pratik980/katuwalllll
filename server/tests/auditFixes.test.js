import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  startTestApp, stopTestApp, resetDatabase, api,
} from './helpers/testApp.js';

const harnessId = '000000000000000000000000';
const range = '2024-01-01,2099-12-31';

let Member;
let Family;
let Donation;
let Chat;
let ChatGroup;
let Organization;
let Backup;
let familyId;

before(async () => {
  await startTestApp();
  ({ default: Member } = await import('../models/Member.js'));
  ({ default: Family } = await import('../models/Family.js'));
  ({ default: Donation } = await import('../models/Donation.js'));
  ({ default: Chat } = await import('../models/Chat.js'));
  ({ default: ChatGroup } = await import('../models/ChatGroup.js'));
  ({ default: Organization } = await import('../models/Organization.js'));
  ({ default: Backup } = await import('../models/Backup.js'));
});

after(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  await resetDatabase();
  const family = await api.post('/families', { familyName: 'Audit Family', houseNumber: '12' });
  assert.equal(family.status, 201, JSON.stringify(family.data));
  familyId = family.data._id;
});

const hasVerificationKey = (value) => {
  if (Array.isArray(value)) return value.some(hasVerificationKey);
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, child]) => /verif/i.test(key) || hasVerificationKey(child));
  }
  return false;
};

test('donations require donor contact details and store normalized phones', async () => {
  const base = { donorType: 'external', amount: 100, paymentMethod: 'cash' };
  const post = (extra) => api.post('/donations', { ...base, ...extra });

  assert.equal((await post({ donorName: 'No Phone', donorEmail: 'a@example.com' })).status, 400);
  assert.equal((await post({ donorName: 'No Email', donorPhone: '9800000000' })).status, 400);
  assert.equal((await post({ donorEmail: 'a@example.com', donorPhone: '9800000000' })).status, 400);
  assert.equal((await post({ donorName: 'Short Phone', donorPhone: '123', donorEmail: 'a@example.com' })).status, 400);

  const created = await post({
    donorName: 'Formatted Donor',
    donorPhone: '+977 (984) 100-0000',
    donorEmail: ' donor@example.com ',
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.donorPhone, '9779841000000');
  assert.equal(created.data.donorEmail, 'donor@example.com');

  const stored = await Donation.findById(created.data._id).lean();
  assert.equal(stored.donorPhone, '9779841000000');
  assert.equal(stored.donorEmail, 'donor@example.com');

  await assert.rejects(
    Donation.create({ donorName: 'Direct', donorType: 'external', amount: 10, paymentMethod: 'cash' }),
    /Donor (phone|email) is required/
  );
});

test('unsend soft-deletes a message, clears its content and refuses other senders', async () => {
  const message = await Chat.create({
    room: 'general',
    sender: harnessId,
    senderName: 'Admin',
    senderRole: 'admin',
    message: 'private text',
    attachments: [{ url: 'https://example.com/a.png', name: 'a.png' }],
  });

  const unsent = await api.put(`/chat/messages/${message._id}/unsend`, {});
  assert.equal(unsent.status, 200, JSON.stringify(unsent.data));
  assert.equal(unsent.data.isDeleted, true);
  assert.equal(unsent.data.message, '');
  assert.deepEqual(unsent.data.attachments, []);

  const stored = await Chat.findById(message._id).lean();
  assert.equal(stored.isDeleted, true);
  assert.equal(stored.message, '');
  assert.deepEqual(stored.attachments, []);

  const listed = await api.get('/chat/rooms/general/messages');
  assert.equal(listed.status, 200);
  const row = listed.data.data.find((item) => item._id === String(message._id));
  assert.equal(row.message, '');

  const foreign = await Chat.create({
    room: 'general', sender: '111111111111111111111111', senderName: 'Someone', message: 'theirs',
  });
  assert.equal((await api.put(`/chat/messages/${foreign._id}/unsend`, {})).status, 403);

  const own = await Chat.create({
    room: 'general', sender: harnessId, senderName: 'Admin', message: 'delete me',
  });
  assert.equal((await api.delete(`/chat/messages/${own._id}`)).status, 200);
  assert.equal(await Chat.countDocuments({ _id: own._id }), 0);

  for (const path of ['/chat/messages/not-an-id/unsend', '/chat/messages/not-an-id', '/chat/rooms/not-an-id']) {
    const result = path.includes('unsend') || path.includes('messages')
      ? await api.put(path, {})
      : await api.delete(path);
    assert.equal(result.status, 400, path);
  }
});

test('backups are stored in GridFS, downloadable, restorable and filtered', async () => {
  await Member.create({
    name: 'Backup Member', gender: 'male', dob: new Date(1990, 0, 1),
    district: 'Kathmandu', country: 'Nepal', family: familyId,
  });
  await ChatGroup.create({
    roomId: 'group_11111111-1111-4111-8111-111111111111',
    name: 'Backup Group',
    createdBy: harnessId,
    createdByName: 'Admin',
  });
  await Organization.create({ name: 'Backup Organization' });

  const created = await api.post('/backup', {});
  assert.equal(created.status, 200, JSON.stringify(created.data));
  assert.equal(created.data.backup.status, 'completed');
  assert.ok(created.data.backup.fileId, 'backup bytes are in Mongo-backed storage');
  assert.equal(created.data.backup.filePath, '');
  assert.ok(created.data.collections.includes('chatgroups'));
  assert.ok(created.data.collections.includes('organizations'));
  assert.ok(created.data.collections.includes('members'));
  assert.ok(!created.data.collections.includes('backups'));
  assert.ok(!created.data.collections.includes('fs.files'));
  assert.ok(!created.data.collections.includes('fs.chunks'));
  assert.equal(created.data.counts.organizations, 1);
  assert.ok(created.data.refusedCollections.some((item) => item.collection === 'backups'));

  const second = await api.post('/backup', {});
  assert.equal(second.status, 200, JSON.stringify(second.data));
  assert.ok(second.data.refusedCollections.some((item) => item.collection === 'fs.files'));
  assert.ok(second.data.refusedCollections.some((item) => item.collection === 'fs.chunks'));

  const fileId = new mongoose.Types.ObjectId(created.data.backup.fileId);
  assert.ok(await mongoose.connection.db.collection('fs.files').findOne({ _id: fileId }));

  const downloaded = await api.raw(`/backup/download/${created.data.backup._id}`);
  assert.equal(downloaded.status, 200);
  const payload = JSON.parse(await downloaded.text());
  assert.ok(Array.isArray(payload.chatgroups));
  assert.equal(payload.backups, undefined);
  assert.equal(payload['fs.files'], undefined);
  assert.equal(payload['fs.chunks'], undefined);

  const unconfirmed = await api.post(`/backup/restore/${created.data.backup._id}`, {});
  assert.equal(unconfirmed.status, 400);

  const dryRun = await api.post(`/backup/restore/${created.data.backup._id}`, {
    confirm: 'RESTORE', dryRun: true,
  });
  assert.equal(dryRun.status, 200, JSON.stringify(dryRun.data));
  assert.equal(dryRun.data.dryRun, true);
  assert.ok(dryRun.data.collections.includes('chatgroups'));
  assert.ok(dryRun.data.counts.chatgroups >= 1);
  assert.ok(dryRun.data.refusedCollections.length >= 1);
  assert.ok(dryRun.data.refusedCollections.every((item) => item.collection && item.reason));
  assert.ok(!dryRun.data.collections.includes('backups'));
  assert.ok(!dryRun.data.collections.includes('fs.files'));
  assert.equal(await ChatGroup.countDocuments(), 1, 'a dry run changes nothing');

  await ChatGroup.deleteMany({});
  await Member.deleteMany({});
  const restored = await api.post(`/backup/restore/${created.data.backup._id}`, { confirm: 'RESTORE' });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  assert.equal(await ChatGroup.countDocuments(), 1);
  assert.ok((await Member.countDocuments()) >= 1);

  const deleted = await api.delete(`/backup/${created.data.backup._id}`);
  assert.equal(deleted.status, 200);
  assert.equal(await mongoose.connection.db.collection('fs.files').countDocuments({ _id: fileId }), 0);
  assert.equal((await api.raw(`/backup/download/${created.data.backup._id}`)).status, 404);
});

test('backup pagination uses a radix and rejects out-of-range values', async () => {
  const created = await api.post('/backup', {});
  assert.equal(created.status, 200);

  for (const query of ['?page=0', '?page=abc', '?limit=0', '?limit=101', '?limit=abc']) {
    const result = await api.get(`/backup${query}`);
    assert.equal(result.status, 400, query);
  }

  const valid = await api.get('/backup?page=1&limit=1');
  assert.equal(valid.status, 200);
  assert.equal(valid.data.pagination.limit, 1);
  assert.equal(valid.data.pagination.page, 1);
});

test('a failed backup is recorded without database credentials', async () => {
  const { recordFailedBackup } = await import('../controllers/backupController.js');
  const failed = await recordFailedBackup(
    new Error('connect to mongodb://user:supersecret@127.0.0.1/katuwal failed'),
    null
  );
  assert.equal(failed.status, 'failed');
  assert.match(failed.error, /<redacted>/);
  assert.equal(failed.error.includes('supersecret'), false);
  const stored = await Backup.findById(failed._id).lean();
  assert.equal(stored.status, 'failed');
  assert.equal(stored.error.includes('supersecret'), false);
});

test('dateRange filters member and donation reports without exposing verification data', async () => {
  const oldMember = await Member.create({
    name: 'Old Member', gender: 'male', dob: new Date(1990, 0, 1),
    district: 'Kathmandu', country: 'Nepal',
    family: familyId, generation: 1, verificationStatus: 'verified',
  });
  await Member.create({
    name: 'Fresh Member', gender: 'female', dob: new Date(1992, 0, 1),
    district: 'Kathmandu', country: 'Nepal',
    family: familyId, generation: 2, verificationStatus: 'rejected',
  });
  await Member.collection.updateOne({ _id: oldMember._id }, { $set: { createdAt: new Date('2020-01-01') } });

  await Donation.create({
    donorName: 'Old Donor', donorPhone: '9800000001', donorEmail: 'old@example.com',
    donorType: 'external', amount: 10, paymentMethod: 'cash',
    receiptNumber: 'R-OLD', donationDate: new Date('2020-01-01'),
  });
  await Donation.create({
    donorName: 'Fresh Donor', donorPhone: '9800000002', donorEmail: 'fresh@example.com',
    donorType: 'external', amount: 20, paymentMethod: 'cash',
    receiptNumber: 'R-FRESH', donationDate: new Date('2025-01-01'),
  });

  const genealogy = await api.get(`/reports/genealogy?format=json&dateRange=${range}`);
  assert.equal(genealogy.status, 200, JSON.stringify(genealogy.data));
  assert.deepEqual(genealogy.data.data.map((row) => row['Full Name']), ['Fresh Member']);

  const members = await api.get(`/reports/members?format=json&dateRange=${range}`);
  assert.deepEqual(members.data.data.map((row) => row.Name), ['Fresh Member']);

  const exported = await api.get(`/reports/export/members?format=json&dateRange=${range}`);
  assert.equal(exported.status, 200);
  assert.deepEqual(exported.data.data.map((row) => row['Full Name']), ['Fresh Member']);

  const qr = await api.get(`/reports/qr?format=json&dateRange=${range}`);
  assert.deepEqual(qr.data.map((row) => row.Name), ['Fresh Member']);

  const families = await api.get(`/reports/all-families?format=json&dateRange=${range}`);
  assert.equal(families.data.some((row) => row['Member Name'] === 'Old Member'), false);
  assert.ok(families.data.some((row) => row['Member Name'] === 'Fresh Member'));

  const oneFamily = await api.get(`/reports/family?format=json&familyId=${familyId}&dateRange=${range}`);
  assert.deepEqual(oneFamily.data.Members.map((row) => row.Name), ['Fresh Member']);

  const generation = await api.get(`/reports/generation?format=json&dateRange=${range}`);
  assert.equal(generation.data.reduce((sum, row) => sum + row['Total Members'], 0), 1);

  const demographic = await api.get(`/reports/demographic?format=json&dateRange=${range}`);
  assert.equal(demographic.data['Gender Distribution'].reduce((sum, row) => sum + row.count, 0), 1);

  const donations = await api.get(`/reports/donation?format=json&dateRange=${range}`);
  assert.equal(donations.data.summary.totalDonations, 1);
  assert.equal(donations.data.data[0].Donor, 'Fresh Donor');

  for (const body of [genealogy.data, members.data, exported.data, qr.data, families.data, oneFamily.data, donations.data]) {
    assert.equal(hasVerificationKey(body), false, 'verification information is never exported');
  }

  assert.ok(await Family.findById(familyId), 'the family itself is still present');
});

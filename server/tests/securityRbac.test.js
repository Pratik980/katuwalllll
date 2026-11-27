import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import { startTestApp, stopTestApp, resetDatabase } from './helpers/testApp.js';
import User from '../models/User.js';
import House from '../models/House.js';
import Family from '../models/Family.js';
import Member from '../models/Member.js';
import Donation from '../models/Donation.js';
import ChatGroup from '../models/ChatGroup.js';

let baseUrl;
let admin;
let staff;
let user;
let roleHouse;
let roleFamily;
let ownMember;
let otherMember;
const password = 'StrongPassword!123';
const cookies = { access_token: '', csrf_token: '' };

const readCookies = (response) => {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);

  values.forEach((line) => {
    const pair = String(line).split(';')[0];
    const separator = pair.indexOf('=');
    if (separator < 0) return;
    const name = pair.slice(0, separator).trim();
    if (name === 'access_token' || name === 'csrf_token') {
      cookies[name] = pair.slice(separator + 1).trim();
    }
  });
};

const cookieHeader = () => Object.entries(cookies)
  .filter(([, value]) => value)
  .map(([name, value]) => `${name}=${value}`)
  .join('; ');

const request = async (method, path, { body, csrf = false } = {}) => {
  const headers = {};
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;
  if (csrf && cookies.csrf_token) headers['x-csrf-token'] = cookies.csrf_token;
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  readCookies(response);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data };
};

const loginAs = async (email) => {
  cookies.access_token = '';
  cookies.csrf_token = '';
  const result = await request('POST', '/auth/login', { body: { email, password } });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.ok(result.data.csrfToken);
};

before(async () => {
  ({ baseUrl } = await startTestApp({ skipAuth: false }));
  await resetDatabase();

  const passwordHash = await bcrypt.hash(password, 10);
  [admin, staff, user] = await Promise.all([
    User.create({
      name: 'Admin',
      email: 'admin@example.test',
      passwordHash,
      role: 'admin',
      emailVerified: true,
      isActive: true,
    }),
    User.create({
      name: 'Staff',
      email: 'staff@example.test',
      passwordHash,
      role: 'staff',
      emailVerified: true,
      isActive: true,
      allowedFamilies: [],
    }),
    User.create({
      name: 'User',
      email: 'user@example.test',
      passwordHash,
      role: 'user',
      emailVerified: true,
      isActive: true,
    }),
  ]);
  assert.ok(admin._id && staff._id && user._id);

  roleHouse = await House.create({ houseNumber: 'RB-1', houseName: 'Role House' });
  roleFamily = await Family.create({
    familyName: 'Role Family',
    familyNumber: 'RF-001',
    house: roleHouse._id,
  });
  [ownMember, otherMember] = await Promise.all([
    Member.create({
      name: 'Own Member',
      gender: 'male',
      dob: new Date(1990, 0, 1),
      district: 'Kathmandu',
      country: 'Nepal',
      family: roleFamily._id,
      createdBy: user._id,
    }),
    Member.create({
      name: 'Other Member',
      gender: 'female',
      dob: new Date(1992, 0, 1),
      district: 'Kathmandu',
      country: 'Nepal',
      family: roleFamily._id,
      createdBy: admin._id,
    }),
  ]);

  user.linkedMember = ownMember._id;
  await user.save();
  staff.allowedFamilies = [roleFamily._id];
  await staff.save();
});

after(async () => {
  await stopTestApp();
});

test('mutations require an authenticated session', async () => {
  cookies.access_token = '';
  cookies.csrf_token = '';
  const result = await request('POST', '/families', { body: { familyName: 'No session' } });
  assert.equal(result.status, 401, JSON.stringify(result.data));
});

test('mutations require a CSRF token even when signed in', async () => {
  await loginAs(admin.email);
  const result = await request('POST', '/families', { body: { familyName: 'No CSRF' } });
  assert.equal(result.status, 403, JSON.stringify(result.data));
  assert.match(result.data.message, /verification failed/i);
});

test('user cannot create a family but can add their own member', async () => {
  await loginAs(user.email);
  const family = await request('POST', '/families', {
    body: { familyName: 'Blocked' },
    csrf: true,
  });
  assert.equal(family.status, 403, JSON.stringify(family.data));

  const form = new FormData();
  form.append('name', 'User Added Member');
  form.append('gender', 'male');
  form.append('dob', '2040-01-01');
  form.append('district', 'Kathmandu');
  form.append('country', 'Nepal');
  form.append('family', String(roleFamily._id));

  const member = await request('POST', '/members', {
    body: form,
    csrf: true,
  });
  assert.equal(member.status, 201, JSON.stringify(member.data));
  assert.equal(String(member.data.createdBy), String(user._id));

  const list = await request('GET', '/members');
  assert.equal(list.status, 200, JSON.stringify(list.data));
  assert.ok(list.data.data.length >= 2);
  assert.ok(!list.data.data.some((row) => String(row._id) === String(otherMember._id)));
  assert.ok(list.data.data.every((row) => String(row.createdBy) === String(user._id)));
});

test('user family list, stats and tree expose only self-added members', async () => {
  await loginAs(user.email);
  const ownFamilyFilter = { createdBy: user._id, family: roleFamily._id };
  const expectedMemberCount = await Member.countDocuments(ownFamilyFilter);
  const expectedMaleCount = await Member.countDocuments({ ...ownFamilyFilter, gender: 'male' });
  const expectedFemaleCount = await Member.countDocuments({ ...ownFamilyFilter, gender: 'female' });

  const families = await request('GET', '/families');
  assert.equal(families.status, 200, JSON.stringify(families.data));
  const family = families.data.data.find((row) => String(row._id) === String(roleFamily._id));
  assert.ok(family);
  assert.equal(family.memberCount, expectedMemberCount);
  assert.equal(family.maleCount, expectedMaleCount);
  assert.equal(family.femaleCount, expectedFemaleCount);

  const tree = await request('GET', `/families/${roleFamily._id}/tree`);
  assert.equal(tree.status, 200, JSON.stringify(tree.data));
  assert.equal(tree.data.count, expectedMemberCount);
  assert.equal(JSON.stringify(tree.data).includes('Other Member'), false);

  const stats = await request('GET', '/families/stats');
  assert.equal(stats.status, 200, JSON.stringify(stats.data));
  assert.equal(stats.data.totalFamilies, 1);
  assert.equal(stats.data.averageMembersPerFamily, expectedMemberCount);
});

test('staff and user cannot reach administration', async () => {
  await loginAs(staff.email);
  const staffAdmin = await request('GET', '/admin/users');
  assert.equal(staffAdmin.status, 403, JSON.stringify(staffAdmin.data));

  await loginAs(user.email);
  const userAdmin = await request('GET', '/admin/users');
  assert.equal(userAdmin.status, 403, JSON.stringify(userAdmin.data));
});

test('admin can reach administration', async () => {
  await loginAs(admin.email);
  const result = await request('GET', '/admin/users');
  assert.equal(result.status, 200, JSON.stringify(result.data));
});

test('financial reads and backups are limited to their allowed roles', async () => {
  await loginAs(user.email);
  const userDonations = await request('GET', '/donations');
  assert.equal(userDonations.status, 403, JSON.stringify(userDonations.data));

  const userBackup = await request('GET', '/backup');
  assert.equal(userBackup.status, 403, JSON.stringify(userBackup.data));

  const userDonationReport = await request('GET', '/reports/donation');
  assert.equal(userDonationReport.status, 403, JSON.stringify(userDonationReport.data));

  await loginAs(staff.email);
  const staffDonations = await request('GET', '/donations');
  assert.equal(staffDonations.status, 200, JSON.stringify(staffDonations.data));
  assert.equal(staffDonations.data.summary, null);
  assert.ok(staffDonations.data.data.every((row) => row.amount === undefined));

  const staffDonationReport = await request('GET', '/reports/donation');
  assert.equal(staffDonationReport.status, 403, JSON.stringify(staffDonationReport.data));

  const staffDonationStats = await request('GET', '/donations/stats');
  assert.equal(staffDonationStats.status, 403, JSON.stringify(staffDonationStats.data));

  const staffBackup = await request('GET', '/backup');
  assert.equal(staffBackup.status, 403, JSON.stringify(staffBackup.data));
});

test('staff sees operational dashboard data without financial information', async () => {
  await loginAs(staff.email);

  const donation = await request('POST', '/donations', {
    body: {
      donorType: 'external',
      donorName: 'Staff Donor',
      donorPhone: '9800000000',
      donorEmail: 'staff.donor@example.com',
      amount: 50,
      paymentMethod: 'cash',
    },
    csrf: true,
  });
  assert.equal(donation.status, 201, JSON.stringify(donation.data));
  assert.equal(donation.data.amount, undefined);

  const directRead = await request('GET', `/donations/${donation.data._id}`);
  assert.equal(directRead.status, 200, JSON.stringify(directRead.data));
  assert.equal(directRead.data.amount, undefined);

  const dashboard = await request('GET', '/dashboard/stats');
  assert.equal(dashboard.status, 200, JSON.stringify(dashboard.data));
  assert.equal(dashboard.data.summary.totalUsers, 1);
  assert.ok(dashboard.data.summary.membersAddedAcrossSystem >= 2);
  assert.equal(dashboard.data.summary.totalMembers, dashboard.data.summary.membersAddedAcrossSystem);
  assert.equal(dashboard.data.summary.totalStaff, undefined);
  assert.equal(dashboard.data.summary.totalDonations, undefined);
  assert.equal(dashboard.data.summary.totalDonationAmount, undefined);
  assert.equal(dashboard.data.summary.totalEarnings, undefined);
  assert.equal(dashboard.data.recent.donations, undefined);
  assert.equal(dashboard.data.monthlyDonations, undefined);
  assert.equal(dashboard.data.activity, undefined);
  assert.equal(dashboard.data.systemOverview, undefined);
});

test('user dashboard is limited to personal records and hides system counts', async () => {
  await loginAs(user.email);

  const dashboard = await request('GET', '/dashboard/stats');
  assert.equal(dashboard.status, 200, JSON.stringify(dashboard.data));
  assert.equal(dashboard.data.summary.totalMembers, dashboard.data.personal.totalMembersAdded);
  assert.ok(dashboard.data.summary.totalMembers >= 2);
  assert.equal(dashboard.data.summary.totalUsers, undefined);
  assert.equal(dashboard.data.summary.totalStaff, undefined);
  assert.equal(dashboard.data.summary.membersAddedAcrossSystem, undefined);
  assert.equal(dashboard.data.summary.totalDonations, undefined);
  assert.equal(dashboard.data.summary.totalDonationAmount, undefined);
  assert.equal(dashboard.data.summary.totalEarnings, undefined);
  assert.equal(dashboard.data.recent.donations, undefined);
  assert.equal(dashboard.data.monthlyDonations, undefined);
  assert.equal(dashboard.data.personal.family.name, 'Role Family');
});

test('admin dashboard includes full system, activity, and financial data', async () => {
  await loginAs(admin.email);

  const dashboard = await request('GET', '/dashboard/stats');
  assert.equal(dashboard.status, 200, JSON.stringify(dashboard.data));
  assert.equal(dashboard.data.summary.totalStaff, 1);
  assert.equal(dashboard.data.summary.totalUsers, 1);
  assert.ok(dashboard.data.summary.totalMembers >= 3);
  assert.ok(dashboard.data.summary.totalDonations >= 1);
  assert.ok(dashboard.data.summary.totalEarnings >= 50);
  assert.ok(Array.isArray(dashboard.data.recent.donations));
  assert.ok(dashboard.data.activity);
  assert.ok(dashboard.data.systemOverview);

  const report = await request('GET', '/reports/donation');
  assert.equal(report.status, 200, JSON.stringify(report.data));
});

test('member creation records the creator and member visibility follows real records', async () => {
  const dbTotal = await Member.countDocuments({});
  const expectedUserTotal = await Member.countDocuments({ createdBy: user._id });
  const expectedStaffTotal = await Member.countDocuments({ family: { $in: staff.allowedFamilies } });

  await loginAs(staff.email);
  const form = new FormData();
  form.append('name', 'StaffOnlyAdded');
  form.append('gender', 'female');
  form.append('dob', '2041-02-01');
  form.append('district', 'Kathmandu');
  form.append('country', 'Nepal');
  form.append('family', String(roleFamily._id));

  const member = await request('POST', '/members', { body: form, csrf: true });
  assert.equal(member.status, 201, JSON.stringify(member.data));
  assert.equal(String(member.data.createdBy), String(staff._id));

  const staffList = await request('GET', '/members?limit=1');
  assert.equal(staffList.status, 200, JSON.stringify(staffList.data));
  assert.equal(staffList.data.pagination.total, expectedStaffTotal + 1);

  await loginAs(user.email);
  const userList = await request('GET', '/members?limit=1');
  assert.equal(userList.status, 200, JSON.stringify(userList.data));
  assert.equal(userList.data.pagination.total, expectedUserTotal);
  const hiddenMember = await request('GET', `/members?search=${encodeURIComponent('StaffOnlyAdded')}`);
  assert.equal(hiddenMember.status, 200, JSON.stringify(hiddenMember.data));
  assert.equal(hiddenMember.data.pagination.total, 0);

  const userDashboard = await request('GET', '/dashboard/stats');
  assert.equal(userDashboard.status, 200, JSON.stringify(userDashboard.data));
  assert.equal(userDashboard.data.summary.totalMembers, expectedUserTotal);

  const userReport = await request('GET', '/reports/members?format=json');
  assert.equal(userReport.status, 403, JSON.stringify(userReport.data));

  await loginAs(admin.email);
  const adminList = await request('GET', `/members?search=${encodeURIComponent('StaffOnlyAdded')}`);
  assert.equal(adminList.status, 200, JSON.stringify(adminList.data));
  assert.ok(adminList.data.data.some((row) => String(row._id) === String(member.data._id)));
  assert.equal(adminList.data.pagination.total, 1);

  const adminAll = await request('GET', '/members?limit=1');
  assert.equal(adminAll.status, 200, JSON.stringify(adminAll.data));
  assert.equal(adminAll.data.pagination.total, dbTotal + 1);

  const adminDashboard = await request('GET', '/dashboard/stats');
  assert.equal(adminDashboard.status, 200, JSON.stringify(adminDashboard.data));
  assert.equal(adminDashboard.data.summary.totalMembers, dbTotal + 1);
});

test('logout invalidates the previous access token', async () => {
  await loginAs(admin.email);
  const tokenBeforeLogout = cookies.access_token;

  const logout = await request('POST', '/auth/logout', { csrf: true });
  assert.equal(logout.status, 204, JSON.stringify(logout.data));

  cookies.access_token = tokenBeforeLogout;
  cookies.csrf_token = '';
  const me = await request('GET', '/auth/me');
  assert.equal(me.status, 401, JSON.stringify(me.data));
});

test('staff still records donations, but donor contact details are mandatory', async () => {
  await loginAs(staff.email);
  const base = { donorType: 'external', amount: 25, paymentMethod: 'cash' };

  const noPhone = await request('POST', '/donations', {
    body: { ...base, donorName: 'No Phone', donorEmail: 'donor@example.test' }, csrf: true,
  });
  assert.equal(noPhone.status, 400, JSON.stringify(noPhone.data));

  const noEmail = await request('POST', '/donations', {
    body: { ...base, donorName: 'No Email', donorPhone: '9800000000' }, csrf: true,
  });
  assert.equal(noEmail.status, 400, JSON.stringify(noEmail.data));

  const created = await request('POST', '/donations', {
    body: {
      ...base,
      donorName: 'Staff Formatted Donor',
      donorPhone: '+977-984-1234567',
      donorEmail: 'formatted@example.test',
      paymentMethod: 'qr',
      qrPaymentReference: 'REF-1',
    },
    csrf: true,
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.donorPhone, '9779841234567');
  assert.equal(created.data.amount, undefined);
  assert.equal(created.data.qrPaymentReference, undefined);
  assert.equal(created.data.qrPaymentCompleted, undefined);

  const stored = await Donation.findById(created.data._id).lean();
  assert.equal(stored.donorPhone, '9779841234567');
  assert.equal(stored.amount, 25);
});

test('group deletion follows owner roles, including groups created before the flags existed', async () => {
  await loginAs(admin.email);
  const adminGroup = await request('POST', '/chat/rooms', {
    body: { name: 'Admin Controlled Group', isAdminGroup: true }, csrf: true,
  });
  assert.equal(adminGroup.status, 201, JSON.stringify(adminGroup.data));
  assert.equal(adminGroup.data.room.isAdminGroup, true);

  const adminOwned = await request('POST', '/chat/rooms', {
    body: { name: 'Admin Owned Group' }, csrf: true,
  });
  assert.equal(adminOwned.status, 201, JSON.stringify(adminOwned.data));

  const legacy = await ChatGroup.create({
    roomId: 'group_22222222-2222-4222-8222-222222222222',
    name: 'Legacy Admin Group',
    createdBy: admin._id,
    createdByName: admin.name,
  });

  await loginAs(staff.email);
  const staffGroup = await request('POST', '/chat/rooms', {
    body: { name: 'Staff Owned Group', isAdminGroup: true }, csrf: true,
  });
  assert.equal(staffGroup.status, 201, JSON.stringify(staffGroup.data));
  assert.equal(staffGroup.data.room.isAdminGroup, false, 'staff cannot mark a group as an admin group');

  for (const roomId of [adminGroup.data.room.id, adminOwned.data.room.id, legacy.roomId]) {
    const denied = await request('DELETE', `/chat/rooms/${roomId}`, { csrf: true });
    assert.equal(denied.status, 403, `${roomId} must not be deletable by staff`);
  }

  await loginAs(user.email);
  const otherGroup = await request('DELETE', `/chat/rooms/${staffGroup.data.room.id}`, { csrf: true });
  assert.equal(otherGroup.status, 403, 'a user cannot delete another person\'s group');
  const badId = await request('DELETE', '/chat/rooms/not-an-id', { csrf: true });
  assert.equal(badId.status, 400);

  await loginAs(staff.email);
  const ownGroup = await request('DELETE', `/chat/rooms/${staffGroup.data.room.id}`, { csrf: true });
  assert.equal(ownGroup.status, 200, JSON.stringify(ownGroup.data));

  await loginAs(admin.email);
  const adminDeleted = await request('DELETE', `/chat/rooms/${adminGroup.data.room.id}`, { csrf: true });
  assert.equal(adminDeleted.status, 200);
  const legacyDeleted = await request('DELETE', `/chat/rooms/${legacy._id}`, { csrf: true });
  assert.equal(legacyDeleted.status, 200);
});

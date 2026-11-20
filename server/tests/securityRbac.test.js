import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import { startTestApp, stopTestApp, resetDatabase } from './helpers/testApp.js';
import User from '../models/User.js';

let baseUrl;
let admin;
let staff;
let user;
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
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
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

test('user cannot create a family or a member', async () => {
  await loginAs(user.email);
  const family = await request('POST', '/families', {
    body: { familyName: 'Blocked' },
    csrf: true,
  });
  assert.equal(family.status, 403, JSON.stringify(family.data));

  const member = await request('POST', '/members', {
    body: { name: 'Blocked' },
    csrf: true,
  });
  assert.equal(member.status, 403, JSON.stringify(member.data));
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

test('donations and backups are limited to their allowed roles', async () => {
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

  const staffBackup = await request('GET', '/backup');
  assert.equal(staffBackup.status, 403, JSON.stringify(staffBackup.data));
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

import test from 'node:test';
import assert from 'node:assert/strict';
import Member from '../models/Member.js';
import { authorizedFamilyIds, requireCsrf, requireRole } from './authentication.js';

const response = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('role guard rejects anonymous and disallowed users', () => {
  const guard = requireRole('admin');
  const anonymousResponse = response();
  guard({ user: null }, anonymousResponse, () => assert.fail('anonymous request passed'));
  assert.equal(anonymousResponse.statusCode, 401);

  const userResponse = response();
  guard({ user: { role: 'user' } }, userResponse, () => assert.fail('user role passed'));
  assert.equal(userResponse.statusCode, 403);
});

test('role guard forwards an allowed role', () => {
  let continued = false;
  requireRole('admin', 'staff')({ user: { role: 'staff' } }, response(), () => { continued = true; });
  assert.equal(continued, true);
});

test('CSRF guard accepts safe methods and requires matching tokens on writes', () => {
  let continued = false;
  requireCsrf({ method: 'GET' }, response(), () => { continued = true; });
  assert.equal(continued, true);

  const rejected = response();
  requireCsrf({ method: 'POST', get: () => 'header' }, rejected, () => assert.fail('missing cookie passed'));
  assert.equal(rejected.statusCode, 403);

  const accepted = response();
  requireCsrf({
    method: 'POST',
    get: () => 'same-token',
    cookies: { csrf_token: 'same-token' },
  }, accepted, () => { continued = true; });
  assert.equal(continued, true);
});

test('family scopes are admin-wide, staff-assigned, or linked-member-only', async () => {
  const originalFindById = Member.findById;
  try {
    assert.equal(await authorizedFamilyIds({ role: 'admin' }), null);
    assert.deepEqual(
      await authorizedFamilyIds({ role: 'staff', allowedFamilies: ['family-a', 'family-b'] }),
      ['family-a', 'family-b']
    );
    assert.deepEqual(await authorizedFamilyIds({ role: 'user', linkedMember: null }), []);

    Member.findById = () => ({
      select: () => ({ lean: async () => ({ family: { toString: () => 'family-c' } }) }),
    });
    assert.deepEqual(
      await authorizedFamilyIds({ role: 'user', linkedMember: 'member-c' }),
      ['family-c']
    );
  } finally {
    Member.findById = originalFindById;
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { requireReportFamilyAccess } from './reportRoutes.js';

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

test('report family access allows admins to request unscoped reports', async () => {
  let continued = false;
  await requireReportFamilyAccess('familyId')(
    { user: { role: 'admin' }, query: {} },
    response(),
    () => { continued = true; }
  );
  assert.equal(continued, true);
});

test('report family access requires and enforces a staff family scope', async () => {
  const guard = requireReportFamilyAccess('familyId');
  const missing = response();
  await guard(
    { user: { role: 'staff', allowedFamilies: ['family-a'] }, query: {} },
    missing,
    () => assert.fail('unscoped report passed')
  );
  assert.equal(missing.statusCode, 400);

  let continued = false;
  await guard(
    { user: { role: 'staff', allowedFamilies: ['family-a'] }, query: { familyId: 'family-a' } },
    response(),
    () => { continued = true; }
  );
  assert.equal(continued, true);

  const denied = response();
  await guard(
    { user: { role: 'staff', allowedFamilies: ['family-a'] }, query: { familyId: 'family-b' } },
    denied,
    () => assert.fail('unauthorized family report passed')
  );
  assert.equal(denied.statusCode, 403);
});

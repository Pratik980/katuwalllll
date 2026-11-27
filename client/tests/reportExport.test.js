// tests/reportExport.test.js
// Report rows and filenames used by both PDF and Excel downloads. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReportRows, reportFilename } from '../src/utils/reportExport.js';

test('report payloads become plain table rows without verification data', () => {
  const rows = normalizeReportRows({
    total: 2,
    data: [
      { Name: 'Asha', Family: { familyName: 'कटुवाल' }, Verification: 'verified', Phone: 9841000000 },
      { Name: 'Bhadra', IsAlive: false },
    ],
  }, 'members');

  assert.deepEqual(rows, [
    { Name: 'Asha', Family: 'कटुवाल', Phone: '9841000000' },
    { Name: 'Bhadra', IsAlive: 'No' },
  ]);
});

test('sectioned reports flatten without blank spacer rows', () => {
  const rows = normalizeReportRows({
    'Gender Distribution': [{ Group: 'Male', count: 2 }],
    'Status Distribution': [{ Group: 'Living', count: 3 }],
  }, 'demographic');

  assert.deepEqual(rows, [
    { Category: 'Gender Distribution', Group: 'Male', Count: '2' },
    { Category: 'Status Distribution', Group: 'Living', Count: '3' },
  ]);
});

test('report filenames keep Nepali text and use the requested extension', () => {
  const filename = reportFilename('family', 'कटुवाल परिवार', 'pdf');
  assert.match(filename, /^family-कटुवाल-परिवार-\d{4}-\d{2}-\d{2}\.pdf$/);
});

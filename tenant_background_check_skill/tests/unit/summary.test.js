import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { runChecks } from '../../src/engine/run.js';
import { buildSummary, renderSummaryText, SUMMARY_HEADER } from '../../src/engine/summary.js';
import { validateApplication } from '../../src/engine/application.js';
import { terminateOcr } from '../../src/engine/image/ocr.js';
import { decodeImage, toOcrInput, OCR_WORKER_OPTIONS } from '../../src/node/decode.js';
import { makePdf } from '../fixtures/make.js';

after(terminateOcr);
const ENV = { decodeImage, toOcrInput, workerOptions: OCR_WORKER_OPTIONS, now: new Date('2026-02-01T00:00:00Z') };
const RULEBOOK = { version: 1, styles: [] };
const APP = validateApplication({
  name: 'Jane Doe', dob: '1985-03-14', currentAddress: '123 Secret St, Toronto, ON M2M 4G3',
  city: 'Toronto', province: 'ON', country: 'Canada', employer: 'Acme Widgets Inc.', title: 'Analyst',
  annualSalary: 87500, reference: { name: 'Bob Landlord', phone: '416-555-0100', address: '77 Rental Ave, Toronto' },
});

async function pkg() {
  const credit = await makePdf([
    { text: 'Equifax Credit Score 742', x: 50, y: 700, size: 12 },
    { text: 'Name: DOE, JANE  Date of Birth: 1985/03/14  SIN: 999-999-999', x: 50, y: 680, size: 10 },
    { text: 'Current Address: 123 Secret St, TORONTO, ON, M2M 4G3', x: 50, y: 660, size: 10 },
  ], { producer: 'Skia/PDF m81', creator: 'Chromium' });
  const stub = await makePdf([
    { text: 'Acme Widgets Earnings Statement  Jane Doe', x: 50, y: 700, size: 10 },
    { text: 'Gross Pay $3,365.38 $87,500.00', x: 50, y: 680, size: 10 },
    { text: 'Net Pay $2,500.00', x: 50, y: 660, size: 10 },
  ], { producer: 'wkhtmltopdf' });
  const letter = await makePdf([
    { text: 'Jane Doe, 123 Secret St, Toronto, ON M2M 4G3', x: 50, y: 760, size: 10 },
    { text: 'To whom it may concern: Jane Doe is employed by Acme Widgets as Analyst, salary $87,500.', x: 50, y: 600, size: 10 },
  ], { producer: 'Oracle BI Publisher' });
  return [{ name: 'credit.pdf', bytes: credit }, { name: 'stub.pdf', bytes: stub }, { name: 'letter.pdf', bytes: letter }];
}

test('summary never contains local-only values', async () => {
  const text = renderSummaryText(buildSummary(await runChecks(await pkg(), APP, RULEBOOK, ENV), APP));
  for (const v of ['1985-03-14', '1985/03/14', '123 Secret St', '999-999-999', '87500', '87,500', '742', 'M2M 4G3', 'credit.pdf']) {
    assert.ok(!text.includes(v), `leaked ${v}`);
  }
  for (const v of ['Jane Doe', 'Toronto', 'Acme Widgets Inc.', 'Analyst', 'Bob Landlord', '416-555-0100']) assert.ok(text.includes(v), `missing ${v}`);
  assert.ok(text.startsWith(SUMMARY_HEADER));
});

test('letterhead address equal to the applicant home postal code is dropped', async () => {
  const s = buildSummary(await runChecks(await pkg(), APP, RULEBOOK, ENV), APP);
  assert.equal(s.letterhead.officeAddress, undefined);
});

test('identity results reach the summary as statuses only', async () => {
  const s = buildSummary(await runChecks(await pkg(), APP, RULEBOOK, ENV), APP);
  assert.ok(s.identity.some((r) => r.field === 'dob' && r.status === 'match'));
  assert.ok(s.identity.every((r) => Object.keys(r).sort().join() === 'docId,field,status'));
});

test('corrupt file yields UNREADABLE_FILE and others still checked', async () => {
  const entries = [...(await pkg()), { name: 'broken.pdf', bytes: new TextEncoder().encode('%PDF-1.4 garbage') }];
  const state = await runChecks(entries, APP, RULEBOOK, ENV);
  assert.equal(state.flags.filter((f) => f.code === 'UNREADABLE_FILE').length, 1);
  assert.deepEqual(state.docs.map((d) => d.docType).filter((t) => t !== 'unknown').sort(), ['credit_report', 'employment_letter', 'paystub']);
});

test('summary never contains the words genuine/authentic', async () => {
  const text = renderSummaryText(buildSummary(await runChecks(await pkg(), APP, RULEBOOK, ENV), APP)).toLowerCase();
  assert.ok(!/genuine|authentic/.test(text));
});

test('empty application still yields a summary that says what was not provided', async () => {
  const app = validateApplication({});
  const text = renderSummaryText(buildSummary(await runChecks(await pkg(), app, RULEBOOK, ENV), app));
  assert.match(text, /Applicant: not provided/);
  assert.match(text, /fewer cross-checks/i);
});

test('buildSummary does not pass through unknown state or application fields', async () => {
  const state = { ...(await runChecks(await pkg(), APP, RULEBOOK, ENV)), secret: 'S3CRET' };
  const s = buildSummary(state, { ...APP, notes: 'S3CRET-NOTE' });
  assert.ok(!JSON.stringify(s).includes('S3CRET'));
});

test('label and amount spans a fraction of a point apart are read as one line', async () => {
  const stub = await makePdf([
    { text: 'Earnings Statement  Jane Doe  Pay date 2026-01-15', x: 50, y: 720, size: 10 },
    { text: 'Net Pay', x: 50, y: 700.6, size: 10 },
    { text: '$1,900.00', x: 300, y: 700, size: 10 }], { producer: 'wkhtmltopdf' });
  const state = await runChecks([{ name: 's.pdf', bytes: stub }], APP, RULEBOOK, ENV);
  assert.ok(!state.flags.some((f) => f.code === 'PAYSTUB_UNPARSEABLE'), state.flags.map((f) => f.code).join());
});

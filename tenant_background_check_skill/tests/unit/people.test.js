import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateApplication } from '../../src/engine/application.js';
import { verifyIdentity, normalizeName } from '../../src/engine/checks/identity.js';
import { checkPaystubs } from '../../src/engine/checks/paystub.js';
import { checkEmploymentLetter } from '../../src/engine/checks/employment.js';
import { compareSalary } from '../../src/engine/checks/salary.js';
import { extractPdf } from '../../src/engine/pdf/extract.js';
import { makePdf } from '../fixtures/make.js';

const APP = validateApplication({
  name: 'Jane Doe', dob: '1985-03-14', currentAddress: '123 Secret St, Toronto, ON M2M 4G3',
  city: 'Toronto', province: 'ON', country: 'Canada', employer: 'Acme Widgets Inc.', title: 'Vice President',
  annualSalary: 60000,
});
const status = (app, doc, field) => verifyIdentity(app, [doc]).find((r) => r.field === field)?.status;
const codes = (f) => f.map((x) => `${x.code}:${x.severity}`);

test('validateApplication accepts an empty application (every field optional)', () => {
  assert.deepEqual({ ...validateApplication({}) }, {});
});

test('validateApplication drops blank strings', () => {
  assert.deepEqual({ ...validateApplication({ name: '  ', city: 'Toronto' }) }, { city: 'Toronto' });
});

test('identity checks skip facts that were not given', () => {
  const rs = verifyIdentity(validateApplication({ city: 'Toronto' }), [{ id: 'p', docType: 'paystub', text: 'Acme Earnings Statement Net Pay $1.00' }]);
  assert.deepEqual(rs, []);
});

test('validateApplication rejects a malformed dob', () => {
  assert.throws(() => validateApplication({ ...APP, dob: '14/03/1985' }), /dob/);
});

test('validateApplication returns a frozen copy', () => {
  const input = { ...APP };
  const out = validateApplication(input);
  assert.notEqual(out, input);
  assert.ok(Object.isFrozen(out));
});

test('normalizeName strips accents, case, punctuation', () => {
  assert.deepEqual(normalizeName('DOÉ, Jane-Q.'), ['doe', 'jane', 'q']);
});

test('name variants match', () => {
  for (const v of ['DOE, JANE', 'Jane Q. Doe', 'jane doé']) {
    assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: `Name: ${v}` }, 'name'), 'match', v);
  }
});

test('different surname mismatches; absent name is missing', () => {
  assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: 'Name: Jane Smith' }, 'name'), 'mismatch');
  assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: 'Account summary only' }, 'name'), 'missing');
});

test('dob matches across formats', () => {
  for (const t of ['Date of Birth: 1985/03/14', 'DOB 14/03/1985', 'Born March 14, 1985']) {
    assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: t }, 'dob'), 'match', t);
  }
  assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: 'Date of Birth: 1986/03/14' }, 'dob'), 'mismatch');
});

test('address matches on civic number + postal code, space-insensitive', () => {
  assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: 'Current Address: 123 SECRET STREET, TORONTO, ON, M2M4G3' }, 'address'), 'match');
  assert.equal(status(APP, { id: 'a1', docType: 'credit_report', text: 'Current Address: 9 OTHER RD, TORONTO, ON, M5V 1A1' }, 'address'), 'mismatch');
});

test('employer on paystub matches ignoring Inc/punctuation; different employer mismatches', () => {
  assert.equal(status(APP, { id: 'p1', docType: 'paystub', text: 'ACME WIDGETS  Earnings Statement' }, 'employer'), 'match');
  assert.equal(status(APP, { id: 'p1', docType: 'paystub', text: 'Globex Corp Earnings Statement' }, 'employer'), 'mismatch');
});

const STUB = (period, gross, net, ytd) => `Earnings Statement\nPay period ${period}\nGross Pay $${gross} $${ytd}\nNet Pay $${net}`;

test('two stubs identical except dates → red', () => {
  const a = STUB('2026-01-01 to 2026-01-15', '2,500.00', '1,900.00', '2,500.00');
  const b = STUB('2026-02-01 to 2026-02-15', '2,500.00', '1,900.00', '2,500.00');
  assert.ok(codes(checkPaystubs([{ id: 's1', text: a }, { id: 's2', text: b }])).includes('PAYSTUB_DUPLICATE_EXCEPT_DATES:red'));
});

test('consecutive stubs with rising YTD → no flags', () => {
  const a = STUB('2026-01-01 to 2026-01-15', '2,500.00', '1,900.00', '2,500.00');
  const b = STUB('2026-01-16 to 2026-01-31', '2,500.00', '1,900.00', '5,000.00');
  assert.deepEqual(checkPaystubs([{ id: 's1', text: a }, { id: 's2', text: b }]), []);
});

test('net > gross → red', () => {
  assert.ok(codes(checkPaystubs([{ id: 's1', text: STUB('2026-01-01', '1,000.00', '1,900.00', '1,000.00') }])).includes('PAYSTUB_NET_EXCEEDS_GROSS:red'));
});

test('YTD falling over time → red', () => {
  const a = 'Pay period 2026-01-01 to 2026-01-15\nNet Pay $1,900.00 $3,800.00';
  const b = 'Pay period 2026-01-16 to 2026-01-31\nNet Pay $1,900.00 $1,900.00';
  assert.ok(codes(checkPaystubs([{ id: 's1', text: a }, { id: 's2', text: b }])).includes('PAYSTUB_YTD_NOT_INCREASING:red'));
});

test('stub without gross/net → unverifiable', () => {
  assert.deepEqual(codes(checkPaystubs([{ id: 's1', text: 'Earnings Statement\nThank you' }])), ['PAYSTUB_UNPARSEABLE:unverifiable']);
});

test('compareSalary', () => {
  assert.equal(compareSalary(60000, { low: 150000, high: 250000 }), 'below');
  assert.equal(compareSalary(180000, { low: 150000, high: 250000 }), 'within');
  assert.equal(compareSalary(300000, { low: 150000, high: 250000 }), 'above');
});

test('letterhead email domain extracted; gmail on letter → soft', async () => {
  const letter = await extractPdf(await makePdf([
    { text: 'Acme Widgets Inc. 500 King St W, Toronto, ON M5V 1L9', x: 50, y: 760, size: 10 },
    { text: 'hr@acmewidgets.com', x: 50, y: 745, size: 10 },
    { text: 'To whom it may concern, Jane Doe is employed as Vice President.', x: 50, y: 600, size: 11 }], { producer: 'Oracle BI Publisher' }));
  const r = checkEmploymentLetter({ id: 'l1', docType: 'employment_letter' }, letter, APP);
  assert.equal(r.letterhead.emailDomain, 'acmewidgets.com');
  assert.match(r.letterhead.officeAddress, /500 King St W/);
  assert.deepEqual(r.flags, []);

  const free = await extractPdf(await makePdf([{ text: 'contact: boss.acme@gmail.com', x: 50, y: 760, size: 10 }], { producer: 'Microsoft® Word for Microsoft 365' }));
  assert.deepEqual(codes(checkEmploymentLetter({ id: 'l2', docType: 'employment_letter' }, free).flags).sort(), ['LETTER_FREEMAIL:soft', 'LETTER_WORD_PROCESSOR:soft']);
});

const EARN_STUB = (period, cur, ytd, net, netYtd) => `Statement of Earnings\nPay period ${period}\nEarnings Regular 80.00 31.25 $${cur} $${ytd}\nTotal Deductions $600.00 $1,200.00\nNet Pay $${net} $${netYtd}`;

test('earnings-row stub layout is parsed (no unparseable flag)', () => {
  assert.deepEqual(checkPaystubs([{ id: 's1', text: EARN_STUB('2026-01-15', '2,500.00', '5,000.00', '1,900.00', '3,800.00') }]), []);
});

test('generic earnings line item is never compared with net (it may be one item, not gross)', () => {
  assert.deepEqual(checkPaystubs([{ id: 's1', text: EARN_STUB('2026-01-15', '1,000.00', '2,000.00', '1,900.00', '3,800.00') }]), []);
});

test('explicit Total Earnings below net → red', () => {
  const text = 'Pay date 2026-01-15\nTotal Earnings $1,000.00 $2,000.00\nNet Pay $1,900.00 $3,800.00';
  assert.ok(codes(checkPaystubs([{ id: 's1', text }])).includes('PAYSTUB_NET_EXCEEDS_GROSS:red'));
});

test('YTD check is skipped when no labelled pay date exists', () => {
  const a = 'Hired 2019-05-01 Printed 2026-01-15\nNet Pay $1,900.00 $3,800.00';
  const b = 'Hired 2019-05-01 Printed 2026-01-31\nNet Pay $1,900.00 $1,900.00';
  assert.deepEqual(checkPaystubs([{ id: 's1', text: a }, { id: 's2', text: b }]), []);
});

test('net YTD falling across stubs → red when gross YTD is unreadable', () => {
  const a = 'Pay date 2026-01-15\nNet Pay $1,900.00 $3,800.00';
  const b = 'Pay date 2026-01-31\nNet Pay $1,900.00 $1,900.00';
  assert.ok(codes(checkPaystubs([{ id: 's1', text: a }, { id: 's2', text: b }])).includes('PAYSTUB_YTD_NOT_INCREASING:red'));
});

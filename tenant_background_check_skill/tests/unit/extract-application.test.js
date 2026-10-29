import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractApplication } from '../../src/engine/extract-application.js';
import { runChecksOn } from '../../src/engine/run.js';
import { classifyDocType } from '../../src/engine/style.js';

const doc = (id, docType, text) => ({ doc: { id, kind: 'pdf' }, docType, text });
const CREDIT = doc('c1', 'credit_report', 'Equifax Credit Report\nName: DOE, JANE\nDate of Birth: 1985/03/14\nCurrent Address: 123 MAIN ST, TORONTO, ON, M2M 4G3\nPrevious Address: 9 OLD RD, OTTAWA, ON, K1A 0B1');
const STUB = doc('p1', 'paystub', 'Earnings Statement\nEmployee name: Jane Doe\nEmployer: Acme Widgets Inc.\nJob title: Analyst\nNet Pay $1,900.00 $3,800.00');
const LETTER = doc('l1', 'employment_letter', 'To whom it may concern,\nThis letter confirms that Jane Doe is employed with Acme Widgets Inc. as a Senior Analyst since March 2021.\nHer annual salary is $85,000 per year.');

test('credit report fills name, date of birth and current address with city/province', () => {
  const { values, sources } = extractApplication([CREDIT]);
  assert.equal(values.name, 'Jane Doe');
  assert.equal(values.dob, '1985-03-14');
  assert.equal(values.currentAddress, '123 MAIN ST, TORONTO, ON, M2M 4G3');
  assert.equal(values.city, 'Toronto');
  assert.equal(values.province, 'ON');
  assert.equal(values.country, 'Canada');
  assert.deepEqual(sources, { name: 'c1', dob: 'c1', currentAddress: 'c1', city: 'c1', province: 'c1', country: 'c1' });
});

test('paystub labels fill employer and title when there is no letter', () => {
  const { values, sources } = extractApplication([STUB]);
  assert.equal(values.employer, 'Acme Widgets Inc.');
  assert.equal(values.title, 'Analyst');
  assert.equal(sources.employer, 'p1');
});

test('labelled paystub title wins over letter prose; the letter still gives the salary', () => {
  const { values, sources } = extractApplication([STUB, LETTER]);
  assert.equal(values.title, 'Analyst');
  assert.equal(sources.title, 'p1');
  assert.equal(values.annualSalary, 85000);
  assert.equal(extractApplication([LETTER]).values.title, 'Senior Analyst');
});

test('rental application wins over credit report for the name', () => {
  const form = doc('r1', 'rental_application', 'Rental Application\nName: Jane Q. Doe\nName of Landlord: Bob Landlord\nTelephone: 416-555-0100');
  const { values, sources } = extractApplication([CREDIT, form]);
  assert.equal(values.name, 'Jane Q. Doe');
  assert.equal(sources.name, 'r1');
  assert.deepEqual(values.reference, { name: 'Bob Landlord', phone: '416-555-0100' });
});

test('ambiguous numeric date of birth (03/04/1985) is left blank', () => {
  const { values } = extractApplication([doc('c2', 'credit_report', 'Name: DOE, JANE\nDate of Birth: 03/04/1985')]);
  assert.equal(values.dob, undefined);
});

test('values that do not look like a name or title are rejected', () => {
  const junk = doc('p2', 'paystub', 'Employee name: 4471 0093 2201\nJob title: $2,300.00 Net');
  const { values } = extractApplication([junk]);
  assert.equal(values.name, undefined);
  assert.equal(values.title, undefined);
});

test('nothing readable → empty values, no crash', () => {
  assert.deepEqual(extractApplication([{ doc: { id: 'x' }, docType: 'unknown', error: 'unreadable' }]), { values: {}, sources: {} });
});

test('a value auto-filled from a document is not cross-checked against that document', () => {
  const { values, sources } = extractApplication([CREDIT]);
  const state = runChecksOn([CREDIT, STUB], values, { styles: [] }, new Date('2026-02-01'), { sources });
  assert.ok(!state.identity.some((r) => r.docId === 'c1' && ['name', 'dob', 'address'].includes(r.field)));
  assert.ok(state.identity.some((r) => r.docId === 'p1' && r.field === 'name' && r.status === 'match'));
});

test('rental application form is its own document type', () => {
  assert.equal(classifyDocType('OREA Form 410 Rental Application ... credit report consent ... employer'), 'rental_application');
});

test('label in the middle of a line ("Personal Information Name: Jane Doe") is read', () => {
  const { values } = extractApplication([doc('c3', 'credit_report', 'Personal Information Name: Jane Doe\nDate of Birth: 1985/03/14')]);
  assert.equal(values.name, 'Jane Doe');
});

test('column layout: value is the span directly below the header', async () => {
  const { extractPdf } = await import('../../src/engine/pdf/extract.js');
  const { makePdf } = await import('../fixtures/make.js');
  const extracted = await extractPdf(await makePdf([
    { text: 'Name', x: 50, y: 700, size: 9 }, { text: 'Date of Birth', x: 250, y: 700, size: 9 },
    { text: 'DOE, JANE', x: 50, y: 686, size: 9 }, { text: '1985/03/14', x: 250, y: 686, size: 9 }]));
  const { values } = extractApplication([{ doc: { id: 'c4' }, docType: 'credit_report', text: 'Name Date of Birth\nDOE, JANE 1985/03/14', extracted }]);
  assert.equal(values.name, 'Jane Doe');
  assert.equal(values.dob, '1985-03-14');
});

test('labelled paystub employer wins over prose in the letter', () => {
  const letter = doc('l2', 'employment_letter', 'Jane Doe is employed with Globex Holdings as an Analyst.');
  const { values, sources } = extractApplication([letter, STUB]);
  assert.equal(values.employer, 'Acme Widgets Inc.');
  assert.equal(sources.employer, 'p1');
});

test('Equifax mailing block (unlabelled lines above CONFIDENTIAL INFORMATION) gives name and address', async () => {
  const { extractPdf } = await import('../../src/engine/pdf/extract.js');
  const { makePdf } = await import('../fixtures/make.js');
  const extracted = await extractPdf(await makePdf([
    { text: 'Equifax Canada Co.', x: 400, y: 790, size: 10 },
    { text: 'JANE DOE', x: 50, y: 700, size: 10 },
    { text: '123 MAIN ST', x: 50, y: 686, size: 10 },
    { text: 'TORONTO ON M2M 4G3', x: 50, y: 672, size: 10 },
    { text: 'CONFIDENTIAL INFORMATION', x: 200, y: 600, size: 16 }], { pageSize: [595, 842] }));
  const { values } = extractApplication([{ doc: { id: 'c5' }, docType: 'credit_report', text: 'x', extracted }]);
  assert.equal(values.name, 'Jane Doe');
  assert.equal(values.currentAddress, '123 MAIN ST, TORONTO ON M2M 4G3');
  assert.equal(values.city, 'Toronto');
  assert.equal(values.province, 'ON');
});

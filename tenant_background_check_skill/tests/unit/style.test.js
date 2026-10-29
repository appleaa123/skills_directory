import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint, identifyStyle, classifyDocType } from '../../src/engine/style.js';
import { extractPdf } from '../../src/engine/pdf/extract.js';
import { makePdf } from '../fixtures/make.js';

const RULEBOOK = { version: 1, styles: [{
  id: 'test-style',
  match: { producer: '^Skia/PDF', creator: '^Chromium$', pageSize: [595, 842], requiredAnchors: ['Further to your request', 'Equifax Canada Co.'] },
}] };

async function fp(lines, opts) {
  return fingerprint(await extractPdf(await makePdf(lines, opts)));
}

const MATCHING = [
  { text: 'Equifax Canada Co.', x: 400, y: 800, size: 14 },
  { text: 'Further to your request, a copy of your personal credit file as of 2026/01/02 follows:', x: 50, y: 700, size: 14 },
  { text: 'JANE DOE 123 MAIN ST', x: 50, y: 680, size: 10 },
];
const OPTS = { producer: 'Skia/PDF m81', creator: 'Chromium', pageSize: [595, 842] };

test('fingerprint never contains non-anchor text', async () => {
  const f = await fp(MATCHING, OPTS);
  const json = JSON.stringify(f);
  assert.ok(!json.includes('JANE') && !json.includes('2026/01/02'), json);
  assert.deepEqual(f.anchors.map((a) => a.text).sort(), ['Equifax Canada Co.', 'Further to your request']);
  assert.deepEqual(f.pageSize, [595, 842]);
  assert.equal(f.anchors[0].font, 'Helvetica');
});

test('identifyStyle matches by producer, creator, page size, anchors', async () => {
  assert.equal(identifyStyle(await fp(MATCHING, OPTS), RULEBOOK)?.id, 'test-style');
});

test('identifyStyle returns null for unknown layout', async () => {
  assert.equal(identifyStyle(await fp(MATCHING, { ...OPTS, producer: 'iText 2.1.7' }), RULEBOOK), null);
  assert.equal(identifyStyle(await fp(MATCHING.slice(1), OPTS), RULEBOOK), null);
});

test('short band labels match exactly, not by containment', async () => {
  const f = await fp([{ text: 'VERY GOOD', x: 10, y: 10, size: 10 }], OPTS);
  assert.deepEqual(f.anchors.map((a) => a.text), ['VERY GOOD']);
});

test('classifyDocType', () => {
  assert.equal(classifyDocType('Equifax Credit Score ... Further to your request'), 'credit_report');
  assert.equal(classifyDocType('Gross Pay  Net Pay  YTD'), 'paystub');
  assert.equal(classifyDocType('To whom it may concern, this letter confirms that Jane is employed'), 'employment_letter');
  assert.equal(classifyDocType('Statement period  Opening balance  Closing balance'), 'bank_statement');
  assert.equal(classifyDocType("Ontario Driver's Licence"), 'id');
  assert.equal(classifyDocType('Congratulations on your graduation'), 'other');
});

test('identifyImageStyle needs at least two image anchors in the OCR text', async () => {
  const { identifyImageStyle } = await import('../../src/engine/style.js');
  const rb = { styles: [{ id: 'eq', imageMatchAnchors: ['Equifax Credit Score', '725-759', 'Further to your request', 'Equifax Canada Co.'] }] };
  assert.equal(identifyImageStyle('Equifax Credit Score 725 POOR 300-559 725-759', rb)?.id, 'eq');
  assert.equal(identifyImageStyle('EQUIFAX Equifax Canada Co. Further to your request, a copy', rb)?.id, 'eq');
  assert.equal(identifyImageStyle('Equifax Credit Score only', rb), null);
});

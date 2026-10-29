import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTemplate, findScoreSpans } from '../../src/engine/checks/template.js';
import { extractPdf } from '../../src/engine/pdf/extract.js';
import { makePdf } from '../fixtures/make.js';

const STYLE = {
  id: 'test-style',
  anchorFonts: [{ phrase: 'Further to your request', font: 'Helvetica', size: 14, sameAs: 'Equifax Canada Co.' }],
  reportDateAnchor: 'Further to your request',
  dateFormat: '^\\d{4}/\\d{2}/\\d{2}$',
  gauge: { bands: [[300, 559], [560, 659], [660, 724], [725, 759], [760, 900]], rangeLabels: ['300-559', '560-659', '660-724', '725-759', '760-900'] },
  postal: { addressLabels: ['Current Address'], addressFormat: 'spaced' },
};
const NOW = new Date('2026-02-01T12:00:00Z');
const doc = { id: 'bbbbbb', kind: 'pdf', docType: 'credit_report' };
const header = { text: 'Equifax Canada Co.', x: 400, y: 760, size: 14 };
const dateLine = (date, font) => [
  { text: 'Further to your request, a copy of your personal credit file as of', x: 50, y: 700, size: 14 },
  { text: date, x: 480, y: 700, size: 14, font }];
const ranges = (labels) => labels.map((t, i) => ({ text: t, x: 230 + i * 70.3, y: 260, size: 9 }));
const score = (a, b = a) => [{ text: String(a), x: 115, y: 300, size: 12 }, { text: String(b), x: 414, y: 290, size: 10 }];

async function run(lines, now = NOW) {
  return checkTemplate(doc, await extractPdf(await makePdf(lines)), STYLE, now).map((f) => `${f.code}:${f.severity}`);
}
const BASE = [header, ...dateLine('2026/01/20'), ...ranges(STYLE.gauge.rangeLabels), ...score(731)];

test('clean synthetic report → no flags', async () => {
  assert.deepEqual(await run(BASE), []);
});

test('date retyped in another font on the anchor line → red ANCHOR_FONT_MISMATCH', async () => {
  const lines = [header, ...dateLine('2026/01/20', 'Courier'), ...ranges(STYLE.gauge.rangeLabels), ...score(731)];
  assert.ok((await run(lines)).includes('ANCHOR_FONT_MISMATCH:red'));
});

test('anchor in a different font from its sameAs line → red', async () => {
  const lines = [{ ...header, font: 'Courier' }, ...dateLine('2026/01/20'), ...ranges(STYLE.gauge.rangeLabels), ...score(731)];
  assert.ok((await run(lines)).includes('ANCHOR_FONT_MISMATCH:red'));
});

test('two score spans disagree → red SCORE_LABEL_MISMATCH', async () => {
  const lines = [header, ...dateLine('2026/01/20'), ...ranges(STYLE.gauge.rangeLabels), ...score(731, 655)];
  assert.ok((await run(lines)).includes('SCORE_LABEL_MISMATCH:red'));
});

test('altered range label → red RANGE_LABELS_NONSTANDARD', async () => {
  const labels = ['300-559', '560-659', '660-724', '725-760', '760-900'];
  assert.ok((await run([header, ...dateLine('2026/01/20'), ...ranges(labels), ...score(731)])).includes('RANGE_LABELS_NONSTANDARD:red'));
});

test('unspaced postal code in an address field → soft', async () => {
  const lines = [...BASE, { text: 'Current Address: 1 X ST, TORONTO, ON, M2M4G3', x: 50, y: 500, size: 10 }];
  assert.ok((await run(lines)).includes('POSTAL_FORMAT_UNEXPECTED:soft'));
  const ok = [...BASE, { text: 'Current Address: 1 X ST, TORONTO, ON, M2M 4G3', x: 50, y: 500, size: 10 }];
  assert.deepEqual(await run(ok), []);
});

test('score at band floor → soft; inside band → none', async () => {
  const lines = [header, ...dateLine('2026/01/20'), ...ranges(STYLE.gauge.rangeLabels), ...score(725)];
  assert.deepEqual(await run(lines), ['SCORE_AT_BAND_FLOOR:soft']);
});

test('report date 45 days old → soft REPORT_DATE_OLD; 12 days → none', async () => {
  const old = [header, ...dateLine('2025/12/18'), ...ranges(STYLE.gauge.rangeLabels), ...score(731)];
  assert.deepEqual(await run(old), ['REPORT_DATE_OLD:soft']);
  assert.deepEqual(await run(BASE), []);
});

test('date in wrong format → soft DATE_FORMAT_UNEXPECTED', async () => {
  const lines = [header, ...dateLine('20/01/2026'), ...ranges(STYLE.gauge.rangeLabels), ...score(731)];
  assert.ok((await run(lines)).includes('DATE_FORMAT_UNEXPECTED:soft'));
});

test('style null → exactly STYLE_UNKNOWN', async () => {
  const flags = checkTemplate(doc, await extractPdf(await makePdf(BASE)), null, NOW);
  assert.deepEqual(flags.map((f) => f.code), ['STYLE_UNKNOWN']);
});

test('findScoreSpans returns 3-digit 300-900 spans only', async () => {
  const ex = await extractPdf(await makePdf([...score(731), { text: '1234', x: 1, y: 1, size: 9 }, { text: '250', x: 1, y: 20, size: 9 }]));
  assert.deepEqual(findScoreSpans(ex).map((s) => s.text), ['731', '731']);
});

test('style without a gauge never compares 3-digit numbers as scores', async () => {
  const noGauge = { id: 'tu', anchorFonts: [] };
  const ex = await extractPdf(await makePdf([{ text: '416', x: 50, y: 500, size: 10 }, { text: '650', x: 50, y: 480, size: 10 }]));
  assert.deepEqual(checkTemplate(doc, ex, noGauge, NOW), []);
});

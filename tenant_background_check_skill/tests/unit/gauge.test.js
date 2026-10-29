import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { expectedPointerFraction, checkGaugePdf, checkGaugeImage } from '../../src/engine/checks/gauge.js';
import { findScoreSpans } from '../../src/engine/checks/template.js';
import { extractPdf } from '../../src/engine/pdf/extract.js';
import { makePdf } from '../fixtures/make.js';

const BANDS = [[300, 559], [560, 659], [660, 724], [725, 759], [760, 900]];
const LABELS = ['300-559', '560-659', '660-724', '725-759', '760-900'];
const OFFSET = -2; // synthetic: bar starts 2pt left of the first range label
const STYLE = { gauge: { pointerGlyph: '^', bands: BANDS, rangeLabels: LABELS, pointerOffsetFromFirstRangeLabel: OFFSET, tolerancePt: 2.0, imageToleranceBarFraction: 0.015 } };
const BAND_W = 70.3;
const doc = { id: 'cccccc', kind: 'pdf', docType: 'credit_report' };

function gaugeLines(score, pointerX) {
  return [
    ...LABELS.map((t, i) => ({ text: t, x: 230 + i * BAND_W, y: 260, size: 9 })),
    { text: String(score), x: 115, y: 300, size: 12 },
    { text: String(score), x: pointerX - 4, y: 290, size: 10 },
    { text: '^', x: pointerX, y: 278, size: 10 },
  ];
}
const onModelX = (score) => 230 + OFFSET + expectedPointerFraction(score, BANDS) * BAND_W;
const codes = (f) => f.map((x) => `${x.code}:${x.severity}`);

test('fraction at band floor', () => assert.equal(expectedPointerFraction(725, BANDS), 3));
test('fraction inside band', () => assert.ok(Math.abs(expectedPointerFraction(742, BANDS) - (3 + 17 / 35)) < 1e-9));
test('fraction at top of scale', () => assert.ok(Math.abs(expectedPointerFraction(900, BANDS) - (4 + 140 / 141)) < 1e-9));

test('PDF pointer on model → no flag', async () => {
  const ex = await extractPdf(await makePdf(gaugeLines(742, onModelX(742))));
  assert.deepEqual(checkGaugePdf(doc, ex, STYLE), []);
});

test('PDF pointer 10pt off model → red GAUGE_POINTER_MISMATCH', async () => {
  const ex = await extractPdf(await makePdf(gaugeLines(725, onModelX(725) + 10)));
  assert.deepEqual(codes(checkGaugePdf(doc, ex, STYLE)), ['GAUGE_POINTER_MISMATCH:red']);
});

test('pointerOffsetFromFirstRangeLabel null → GAUGE_NOT_FOUND unverifiable, not red', async () => {
  const ex = await extractPdf(await makePdf(gaugeLines(742, onModelX(742))));
  const style = { gauge: { ...STYLE.gauge, pointerOffsetFromFirstRangeLabel: null } };
  assert.deepEqual(codes(checkGaugePdf(doc, ex, style)), ['GAUGE_NOT_FOUND:unverifiable']);
});

test('style gauge present but page has no gauge → GAUGE_NOT_FOUND', async () => {
  const ex = await extractPdf(await makePdf([{ text: 'nothing here', x: 10, y: 10, size: 10 }]));
  assert.deepEqual(codes(checkGaugePdf(doc, ex, STYLE)), ['GAUGE_NOT_FOUND:unverifiable']);
});

test('image: fake-like geometry (bar 362-1075, pointer 810, score 725) → red', () => {
  const flags = checkGaugeImage(doc, { barLeft: 362, barRight: 1075, pointerX: 810 }, 725, STYLE);
  assert.deepEqual(codes(flags), ['GAUGE_POINTER_MISMATCH:red']);
});

test('image: pointer at 789 for 725 → no flag', () => {
  assert.deepEqual(checkGaugeImage(doc, { barLeft: 362, barRight: 1075, pointerX: 789 }, 725, STYLE), []);
});

test('findScoreSpans ignores 3-digit numbers on pages without the gauge', async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const p1 = pdf.addPage([612, 792]);
  gaugeLines(742, onModelX(742)).forEach((l) => p1.drawText(l.text, { x: l.x, y: l.y, size: l.size, font }));
  pdf.addPage([612, 792]).drawText('500', { x: 100, y: 500, size: 10, font });
  const ex = await extractPdf(await pdf.save());
  assert.deepEqual(findScoreSpans(ex).map((s) => s.text), ['742', '742']);
});

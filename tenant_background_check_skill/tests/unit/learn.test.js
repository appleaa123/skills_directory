import { test } from 'node:test';
import assert from 'node:assert/strict';
import { learnLayout, renderLayoutReport, LAYOUT_REPORT_HEADER } from '../../src/engine/learn.js';
import { makePdf, PNG_4x4_RED } from '../fixtures/make.js';

const NOW = new Date('2026-02-01T00:00:00Z');
const RULEBOOK = {
  version: 1,
  styles: [{
    id: 'test-equifax',
    match: { requiredAnchors: ['Equifax Canada Co.', 'Further to your request'] },
    anchorFonts: [{ phrase: 'Further to your request', sameAs: 'Equifax Canada Co.' }],
    gauge: { pointerGlyph: '▼', bands: [[300, 559], [560, 659], [660, 724], [725, 759], [760, 900]] },
  }],
};
const EMPTY_RULEBOOK = { version: 1, styles: [] };
const GAUGE = [
  { text: '300-559', x: 100, y: 600, size: 8 }, { text: '560-659', x: 160, y: 600, size: 8 },
  { text: '660-724', x: 220, y: 600, size: 8 },
];

function ownReport(opts = {}, extra = []) {
  return makePdf([
    { text: 'Equifax Canada Co.', x: 400, y: 760, size: 14 },
    { text: 'Further to your request, a copy of your personal credit file as of 2026/01/02 follows:', x: 50, y: 700, size: 14 },
    { text: 'JANE DOE  123 SECRET ST  M2M 4G3', x: 50, y: 680, size: 10 },
    ...GAUGE, ...extra,
  ], { producer: 'iText 5.5.13 (Licensed for: Jane Doe Holdings)', creator: 'ReportWriter 2.1', ...opts });
}

test('a matching layout reports its rulebook style and the flag codes it produced', async () => {
  const out = await learnLayout(await ownReport(), RULEBOOK, NOW);
  assert.equal(out.ok, true);
  assert.equal(out.docType, 'credit_report');
  assert.equal(out.styleId, 'test-equifax');
  assert.ok(out.flagCodes.every((c) => /^[A-Z_]+$/.test(c)));
});

test('an unknown layout reports styleId null and STYLE_UNKNOWN', async () => {
  const out = await learnLayout(await ownReport(), EMPTY_RULEBOOK, NOW);
  assert.equal(out.styleId, null);
  assert.ok(out.flagCodes.includes('STYLE_UNKNOWN'));
});

test('measurements use the rulebook pairs and keep only PII-free layout values', async () => {
  const out = await learnLayout(await ownReport(), RULEBOOK, NOW);
  assert.equal(typeof out.charWidthRatios['Further to your request|Equifax Canada Co.'], 'number');
  assert.deepEqual(out.rangeLabels, ['300-559', '560-659', '660-724']);
  assert.deepEqual(out.fingerprint.pageSize, [612, 792]);
  assert.ok(out.fingerprint.anchors.some((a) => a.text === 'Equifax Canada Co.'));
});

test('producer and creator keep only the tool name and version', async () => {
  const cases = [
    ['iText 5.5.13 (Licensed for: Jane Doe Holdings)', 'iText 5.5.13'],
    ['iText® 7.1.5 ©2000-2019 iText Group NV (Jane Doe; licensed version)', 'iText 7.1.5'],
    ['Skia/PDF m81', 'Skia/PDF'],
    ['ConsumerDisclosureService', 'ConsumerDisclosureService'],
    ['Microsoft Word - Jane Doe paystub', null],
    ['Jane Doe', null],
    ['Licensed to: Jane Doe', null],
    ['JANE', null],
  ];
  for (const [raw, want] of cases) {
    const out = await learnLayout(await ownReport({ producer: raw, creator: raw }), RULEBOOK, NOW);
    assert.equal(out.fingerprint.producer, want, raw);
    assert.equal(out.fingerprint.creator, want, raw);
  }
});

test('phone and account fragments that look like nnn-nnn are not range labels', async () => {
  const noise = [
    { text: '416-555', x: 50, y: 500, size: 8 }, { text: '123-456', x: 120, y: 500, size: 8 },
    { text: '600-700', x: 200, y: 500, size: 8 }, { text: '700-800', x: 260, y: 500, size: 8 },
  ];
  const out = await learnLayout(await ownReport({}, noise), RULEBOOK, NOW);
  assert.deepEqual(out.rangeLabels, ['300-559', '560-659', '660-724']);
  const without = await learnLayout(await makePdf([{ text: 'Equifax Credit Score', x: 50, y: 700, size: 10 }, ...noise]), RULEBOOK, NOW);
  assert.deepEqual(without.rangeLabels, []);
});

test('a marker placed in every free-text field never reaches the report', async () => {
  const M = 'ZQXMARKER';
  const pdf = await makePdf([
    { text: `Equifax Credit Score ${M}`, x: 50, y: 700, size: 10 },
    { text: `${M} 416-${M}`, x: 50, y: 680, size: 10 }, ...GAUGE,
  ], { producer: `${M} 1.0 (${M})`, creator: `${M} Report - ${M}` });
  const text = renderLayoutReport(await learnLayout(pdf, RULEBOOK, NOW), '1.1.0');
  assert.ok(!text.toUpperCase().includes(M), text);
});

test('the rendered report has its own header and no personal text from the document', async () => {
  const text = renderLayoutReport(await learnLayout(await ownReport(), RULEBOOK, NOW), '1.1.0');
  assert.ok(text.startsWith(LAYOUT_REPORT_HEADER));
  assert.ok(!text.includes('TENANT CHECK SUMMARY'));
  assert.match(text, /Checker version: 1\.1\.0/);
  for (const v of ['JANE', 'SECRET', 'M2M', '2026/01/02', 'Holdings']) assert.ok(!text.includes(v), `leaked ${v}`);
});

test('files that are not a text credit-report PDF are refused before measuring', async () => {
  const paystub = await makePdf([{ text: 'Earnings Statement  Net Pay $1,900.00', x: 50, y: 700, size: 10 }]);
  const scanned = await makePdf([], { image: PNG_4x4_RED });
  assert.deepEqual(await learnLayout(PNG_4x4_RED, RULEBOOK, NOW), { ok: false, reason: 'not_pdf' });
  assert.deepEqual(await learnLayout(new TextEncoder().encode('%PDF-1.4 garbage'), RULEBOOK, NOW), { ok: false, reason: 'unreadable' });
  assert.deepEqual(await learnLayout(scanned, RULEBOOK, NOW), { ok: false, reason: 'no_text' });
  assert.deepEqual(await learnLayout(paystub, RULEBOOK, NOW), { ok: false, reason: 'not_credit_report' });
});

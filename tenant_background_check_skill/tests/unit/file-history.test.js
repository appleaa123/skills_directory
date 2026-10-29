import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRevisions } from '../../src/engine/pdf/revisions.js';
import { checkFileHistory } from '../../src/engine/checks/file-history.js';

const enc = (s) => new TextEncoder().encode(s);
const BASE = '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Contents 4 0 R >> endobj\nxref\ntrailer << /Root 1 0 R >>\nstartxref\n9\n%%EOF\n';
const LINEARIZED = '%PDF-1.4\n5 0 obj << /Linearized 1 /L 999 >> endobj\nxref\ntrailer << >>\nstartxref\n0\n%%EOF\n' + BASE.slice(9);
const CONTENT_REV = BASE + '3 0 obj << /Type /Page /Contents 9 0 R /Resources << /Font << /F9 10 0 R >> >> >> endobj\n10 0 obj << /Type /Font /BaseFont /Courier >> endobj\nxref\ntrailer << /Prev 9 >>\nstartxref\n500\n%%EOF\n';
const SIG_REV = BASE + '11 0 obj << /Type /Sig /ByteRange [0 1 2 3] >> endobj\n1 0 obj << /Type /Catalog /AcroForm 12 0 R >> endobj\nxref\ntrailer << /Prev 9 >>\nstartxref\n600\n%%EOF\n';
const FREETEXT_REV = BASE + '13 0 obj << /Type /Annot /Subtype /FreeText /Contents (x) >> endobj\nxref\ntrailer << /Prev 9 >>\nstartxref\n700\n%%EOF\n';

const credit = (bytes) => ({ id: 'aaaaaa', kind: 'pdf', bytes: enc(bytes), docType: 'credit_report' });
const meta = (m = {}) => ({ ok: true, encrypted: false, meta: { producer: 'Skia/PDF m81', creator: 'Chromium', ...m }, pages: [] });
const codes = (flags) => flags.map((f) => `${f.code}:${f.severity}`);

test('single-revision file has no later revisions', () => {
  assert.deepEqual(analyzeRevisions(enc(BASE)), { linearized: false, revisions: [] });
});

test('linearized file with two %%EOF is not an edit', () => {
  const r = analyzeRevisions(enc(LINEARIZED));
  assert.equal(r.linearized, true);
  assert.equal(r.revisions.length, 0);
});

test('appended revision replacing page content and adding a font is detected', () => {
  const [rev] = analyzeRevisions(enc(CONTENT_REV)).revisions;
  assert.equal(rev.touchesPageContent, true);
  assert.equal(rev.addsFonts, true);
  assert.equal(rev.signatureOnly, false);
});

test('content-changing revision → red LATER_REVISION_CHANGES_CONTENT', () => {
  assert.ok(codes(checkFileHistory(credit(CONTENT_REV), meta(), null)).includes('LATER_REVISION_CHANGES_CONTENT:red'));
});

test('signature-only revision → no red', () => {
  const [rev] = analyzeRevisions(enc(SIG_REV)).revisions;
  assert.equal(rev.signatureOnly, true);
  assert.deepEqual(checkFileHistory(credit(SIG_REV), meta(), null).filter((f) => f.severity === 'red'), []);
});

test('FreeText annotation added later → red', () => {
  assert.ok(codes(checkFileHistory(credit(FREETEXT_REV), meta(), null)).includes('LATER_REVISION_CHANGES_CONTENT:red'));
});

test('Photoshop producer on a credit report → red', () => {
  const flags = checkFileHistory(credit(BASE), meta({ producer: 'Adobe Photoshop 25.0', creator: undefined }), null);
  assert.ok(codes(flags).includes('EDITING_TOOL_PRODUCER:red'));
});

test('Word producer on an employment letter is not an editing-tool red', () => {
  const doc = { ...credit(BASE), docType: 'employment_letter' };
  assert.ok(!codes(checkFileHistory(doc, meta({ producer: 'Microsoft® Word for Microsoft 365' }), null)).includes('EDITING_TOOL_PRODUCER:red'));
});

test('Microsoft Print To PDF is not treated as Word', () => {
  assert.deepEqual(checkFileHistory(credit(BASE), meta({ producer: 'Microsoft: Print To PDF', creator: undefined }), null), []);
});

test('Chrome producer + linearized → soft REPROCESSED_BY_OTHER_TOOL', () => {
  assert.deepEqual(codes(checkFileHistory(credit(LINEARIZED), meta(), null)), ['REPROCESSED_BY_OTHER_TOOL:soft']);
});

test('producer not in style expectedProducers → red', () => {
  const style = { expectedProducers: ['^Skia/PDF'] };
  assert.ok(codes(checkFileHistory(credit(BASE), meta({ producer: 'iText 2.1.7' }), style)).includes('PRODUCER_UNEXPECTED:red'));
  assert.deepEqual(checkFileHistory(credit(BASE), meta(), style), []);
});

test('credit report with no producer and no creator → soft METADATA_STRIPPED', () => {
  const m = { ok: true, encrypted: false, meta: {}, pages: [] };
  assert.deepEqual(codes(checkFileHistory(credit(BASE), m, null)), ['METADATA_STRIPPED:soft']);
});

test('revision that only rewrites the existing content stream object is detected', () => {
  const rev = BASE + '4 0 obj << /Length 20 >> stream\nBT (999) Tj ET\nendstream endobj\nxref\ntrailer << /Prev 9 >>\nstartxref\n800\n%%EOF\n';
  assert.equal(analyzeRevisions(enc(rev)).revisions[0].touchesPageContent, true);
});

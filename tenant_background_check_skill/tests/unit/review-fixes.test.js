// Regression tests for findings from the final whole-branch review.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { runChecks } from '../../src/engine/run.js';
import { buildSummary, renderSummaryText } from '../../src/engine/summary.js';
import { validateApplication } from '../../src/engine/application.js';
import { analyzeRevisions } from '../../src/engine/pdf/revisions.js';
import { checkFileHistory } from '../../src/engine/checks/file-history.js';
import { checkPaystubs } from '../../src/engine/checks/paystub.js';
import { verifyIdentity } from '../../src/engine/checks/identity.js';
import { loadPackage } from '../../src/engine/load.js';
import { pickImageScore } from '../../src/engine/checks/gauge.js';
import { findGaugeInImage } from '../../src/engine/image/gauge-pixels.js';
import { identifyStyle } from '../../src/engine/style.js';
import { terminateOcr } from '../../src/engine/image/ocr.js';
import { decodeImage, toOcrInput, OCR_WORKER_OPTIONS } from '../../src/node/decode.js';
import { makePdf } from '../fixtures/make.js';

after(terminateOcr);
const enc = (s) => new TextEncoder().encode(s);
const ENV = { decodeImage, toOcrInput, workerOptions: OCR_WORKER_OPTIONS, now: new Date('2026-02-01T00:00:00Z') };
const RULEBOOK = { version: 1, styles: [] };
const BASE_APP = { name: 'Jane Doe', city: 'Toronto', province: 'ON', country: 'Canada', employer: 'Acme Widgets Inc.', title: 'Analyst' };
const codes = (f) => f.map((x) => `${x.code}:${x.severity}`);

// C1
test('C1: letter addressed to the employee never puts the home address in the summary', async () => {
  const letter = await makePdf([
    { text: 'Jane Doe, 123 Secret St, Toronto, ON M2M 4G3', x: 50, y: 760, size: 10 },
    { text: 'To whom it may concern: Jane Doe is employed by Acme Widgets as Analyst.', x: 50, y: 600, size: 10 }], { producer: 'Oracle BI Publisher' });
  const app = validateApplication(BASE_APP); // no currentAddress given
  const text = renderSummaryText(buildSummary(await runChecks([{ name: 'l.pdf', bytes: letter }], app, RULEBOOK, ENV), app));
  assert.ok(!text.includes('123 Secret St'), text);
});

test('C1: employer letterhead address next to the employer name is kept', async () => {
  const letter = await makePdf([
    { text: 'ACME WIDGETS', x: 50, y: 770, size: 14 },
    { text: '500 King St W, Toronto, ON M5V 1L9', x: 50, y: 755, size: 10 },
    { text: 'To whom it may concern: Jane Doe is employed by Acme Widgets as Analyst.', x: 50, y: 600, size: 10 }], { producer: 'Oracle BI Publisher' });
  const app = validateApplication(BASE_APP);
  const s = buildSummary(await runChecks([{ name: 'l.pdf', bytes: letter }], app, RULEBOOK, ENV), app);
  assert.match(s.letterhead.officeAddress ?? '', /500 King St W/);
});

// C2
const BASE = '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] >> endobj\n3 0 obj << /Type /Page /Contents 4 0 R >> endobj\nxref\ntrailer << /Root 1 0 R >>\nstartxref\n9\n%%EOF\n';
const SIGNED = BASE + '3 0 obj << /Type /Page /Contents 4 0 R /Annots [20 0 R] >> endobj\n20 0 obj << /Type /Annot /Subtype /Widget /FT /Sig /V 21 0 R /DR << /Font << /Helv 22 0 R >> >> >> endobj\n21 0 obj << /Type /Sig /ByteRange [0 1 2 3] >> endobj\n22 0 obj << /Type /Font /BaseFont /Helvetica >> endobj\nxref\ntrailer << /Prev 9 >>\nstartxref\n900\n%%EOF\n';
const CONTENT_EDIT = BASE + '4 0 obj << /Length 20 >> stream\nBT (999) Tj ET\nendstream endobj\nxref\ntrailer << /Prev 9 >>\nstartxref\n800\n%%EOF\n';
const meta = { ok: true, meta: { producer: 'Oracle BI Publisher' }, pages: [] };

test('C2: digital signature / form fill revision is not an edit', () => {
  const [rev] = analyzeRevisions(enc(SIGNED)).revisions;
  assert.equal(rev.touchesPageContent, false);
  assert.deepEqual(checkFileHistory({ id: 'x', bytes: enc(SIGNED), docType: 'credit_report' }, meta, null), []);
});

test('C2: content edit on a letter is soft; on a credit report or paystub red', () => {
  assert.deepEqual(codes(checkFileHistory({ id: 'x', bytes: enc(CONTENT_EDIT), docType: 'employment_letter' }, meta, null)), ['EDITED_AFTER_CREATION:soft']);
  assert.deepEqual(codes(checkFileHistory({ id: 'x', bytes: enc(CONTENT_EDIT), docType: 'paystub' }, meta, null)), ['LATER_REVISION_CHANGES_CONTENT:red']);
});

// C3
test('C3: two-column paystub (earnings left, deductions right) is not net > gross', () => {
  const text = 'Pay date 2026-01-15\nGross Pay 3,000.00 36,000.00 Total Deductions 654.33 7,851.96\nNet Pay 2,345.67 28,148.04';
  assert.deepEqual(checkPaystubs([{ id: 's', text }]), []);
});

// I1
const nameOf = (app, text) => verifyIdentity(validateApplication({ ...BASE_APP, ...app }), [{ id: 'd', docType: 'credit_report', text }]);
const st = (rs, field) => rs.find((r) => r.field === field)?.status;

test("I1: apostrophes and double surnames match", () => {
  assert.equal(st(nameOf({ name: "Sean O'Brien" }, 'Name: OBRIEN, SEAN'), 'name'), 'match');
  assert.equal(st(nameOf({ name: 'Maria Garcia Lopez' }, 'Name: GARCIA, MARIA'), 'name'), 'match');
});

test('I1: DOB written as Jan 05, 1990 / passport 05 JAN /JAN 1990 / 01/05/1990 matches', () => {
  for (const t of ['Date of Birth: Jan 05, 1990', 'Date of birth / Date de naissance 05 JAN /JAN 1990', 'DOB 01/05/1990']) {
    assert.equal(st(nameOf({ dob: '1990-01-05' }, t), 'dob'), 'match', t);
  }
});

test('I1: unreadable date next to the DOB label is missing, not mismatch', () => {
  assert.equal(st(nameOf({ dob: '1990-01-05' }, 'Date of Birth: ????'), 'dob'), 'missing');
});

// I2
test('I2: stubs from different employers are not compared for YTD', () => {
  const a = { id: 'a', group: 'primary', text: 'Pay date 2026-01-15\nNet Pay $1,900.00 $9,800.00' };
  const b = { id: 'b', group: 'other-b', text: 'Pay date 2026-01-31\nNet Pay $900.00 $1,900.00' };
  assert.deepEqual(checkPaystubs([a, b]), []);
});

// I3
test('I3: corrupt zip becomes one unreadable document, not a crash', async () => {
  const bad = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5]);
  const state = await runChecks([{ name: 'x.zip', bytes: bad }], validateApplication(BASE_APP), RULEBOOK, ENV);
  assert.deepEqual(state.flags.map((f) => f.code), ['UNREADABLE_FILE']);
});

// I4
test('I4: impossible calendar date of birth is rejected at validation', () => {
  assert.throws(() => validateApplication({ ...BASE_APP, dob: '1990-25-12' }), /dob/);
});

// I5
test('I5: a .docx (zip with [Content_Types].xml) stays one document', async () => {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>'); zip.file('word/document.xml', '<w/>'); zip.file('word/media/image1.png', 'x');
  const docs = await loadPackage([{ name: 'letter.docx', bytes: await zip.generateAsync({ type: 'uint8array' }) }]);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].kind, 'other');
});

// I6
test('I6: a text credit report with one scanned page still gets its PDF style', async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([595, 842]).drawText('Equifax Credit Score  Further to your request  Equifax Canada Co.', { x: 40, y: 700, size: 10, font });
  const png = await pdf.embedPng(readFileSync(new URL('../fixtures/ocr-text.png', import.meta.url)));
  pdf.addPage([595, 842]).drawImage(png, { x: 0, y: 600, width: 595, height: 120 });
  pdf.setProducer('Skia/PDF m81'); pdf.setCreator('Chromium');
  const rb = { styles: [{ id: 'pdf-style', match: { pageSize: [595, 842], requiredAnchors: ['Further to your request', 'Equifax Canada Co.'] } }] };
  const state = await runChecks([{ name: 'c.pdf', bytes: await pdf.save() }], validateApplication(BASE_APP), rb, ENV);
  assert.equal(state.docs[0].styleId, 'pdf-style');
});

// I7
test('I7: screenshot score is the tallest 3-digit word, not a range label', () => {
  const spans = [{ text: '300', h: 12 }, { text: '559', h: 12 }, { text: '725', h: 20 }, { text: '725', h: 14 }].map((s) => ({ ...s, x: 0, y: 0, w: 10, font: null, size: s.h }));
  assert.equal(pickImageScore(spans), 725);
});

test('I7: pointer found on a 2x (retina) screenshot', () => {
  const w = 2200, h = 700;
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const set = (x, y, c) => data.set([...c, 255], (y * w + x) * 4);
  for (let y = 286; y <= 356; y++) for (let x = 724; x <= 2150; x++) set(x, y, [60, 150, 200]);
  for (let y = 236; y <= 276; y++) { const half = Math.round((276 - y) / 2); for (let x = 1620 - half; x <= 1620 + half; x++) set(x, y, [0, 0, 0]); }
  const g = findGaugeInImage({ width: w, height: h, data });
  assert.ok(g && Math.abs(g.pointerX - 1620) <= 3, JSON.stringify(g));
});

// I8
test('I8: the Equifax style is identified without trusting the producer, so producer rules can fire', () => {
  const rb = JSON.parse(readFileSync(new URL('../../rulebook/styles.json', import.meta.url), 'utf8'));
  const fp = { producer: 'LibreOffice 7.6', creator: 'Draw', pageCount: 21, pageSize: [595, 842], fonts: [], anchors: ['Further to your request', 'Equifax Canada Co.', 'EQUIFAX REFERENCE NUMBER'].map((text) => ({ text, font: 'FreeSans', size: 9.78 })) };
  const style = identifyStyle(fp, rb);
  assert.equal(style?.id, 'equifax-consumer-disclosure');
  assert.deepEqual(codes(checkFileHistory({ id: 'x', bytes: enc(BASE), docType: 'credit_report' }, { meta: { producer: 'LibreOffice 7.6' } }, style)).sort(), ['EDITING_TOOL_PRODUCER:red', 'PRODUCER_UNEXPECTED:red']);
});

// I10
test('I10: OCR engine failure is reported as OCR_UNAVAILABLE, not as a bad file', async () => {
  const png = readFileSync(new URL('../fixtures/ocr-text.png', import.meta.url));
  const env = { ...ENV, toOcrInput: () => { throw new Error('offline'); } };
  const state = await runChecks([{ name: 'shot.png', bytes: new Uint8Array(png) }], validateApplication(BASE_APP), RULEBOOK, env);
  assert.deepEqual(state.flags.map((f) => f.code), ['OCR_UNAVAILABLE']);
});

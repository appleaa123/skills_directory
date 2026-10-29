import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, setTextRenderingMode, TextRenderingMode } from 'pdf-lib';
import { checkTextLayer } from '../../src/engine/checks/text-layer.js';
import { extractPdf } from '../../src/engine/pdf/extract.js';
import { makePdf, PNG_4x4_RED } from '../fixtures/make.js';

const doc = { id: 'dddddd', kind: 'pdf', docType: 'credit_report' };
const codes = (f) => f.map((x) => `${x.code}:${x.severity}`);

async function pdfWithInvisible({ visible, image }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  if (image) page.drawImage(await pdf.embedPng(PNG_4x4_RED), { x: 0, y: 0, width: 612, height: 792 });
  if (visible) page.drawText('Visible label', { x: 50, y: 700, size: 12, font });
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
  page.drawText('hidden 655', { x: 50, y: 650, size: 12, font });
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));
  return extractPdf(await pdf.save());
}

test('stacked 725 over 655 at same position → red STACKED_TEXT', async () => {
  const ex = await extractPdf(await makePdf([{ text: '725', x: 100, y: 300, size: 12 }, { text: '655', x: 100, y: 300, size: 12 }]));
  assert.deepEqual(codes(checkTextLayer(doc, ex)), ['STACKED_TEXT:red']);
});

test('adjacent non-overlapping spans → no flag', async () => {
  const ex = await extractPdf(await makePdf([{ text: '725', x: 100, y: 300, size: 12 }, { text: '655', x: 140, y: 300, size: 12 }]));
  assert.deepEqual(checkTextLayer(doc, ex), []);
});

test('same text drawn twice (fake bold) → no flag', async () => {
  const ex = await extractPdf(await makePdf([{ text: 'Name', x: 100, y: 300, size: 12 }, { text: 'Name', x: 100.3, y: 300, size: 12 }]));
  assert.deepEqual(checkTextLayer(doc, ex), []);
});

test('invisible text on a page with visible text → red INVISIBLE_TEXT', async () => {
  const ex = await pdfWithInvisible({ visible: true, image: false });
  assert.equal(ex.pages[0].invisibleSpans.length, 1);
  assert.deepEqual(codes(checkTextLayer(doc, ex)), ['INVISIBLE_TEXT:red']);
});

test('invisible OCR text on an image-only page → no flag', async () => {
  assert.deepEqual(checkTextLayer(doc, await pdfWithInvisible({ visible: false, image: true })), []);
});

test('short label inside a wide paragraph box is not stacked text', async () => {
  const ex = await extractPdf(await makePdf([
    { text: 'This paragraph is a long line of ordinary explanatory report text', x: 100, y: 300, size: 8 },
    { text: '560', x: 200, y: 300, size: 6.5 }]));
  assert.deepEqual(checkTextLayer(doc, ex), []);
});

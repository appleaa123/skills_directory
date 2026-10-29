import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractPdf, extractPdfImages } from '../../src/engine/pdf/extract.js';
import { makePdf, PNG_4x4_RED } from '../fixtures/make.js';

const ENCRYPTED = new Uint8Array(readFileSync(new URL('../fixtures/encrypted.pdf', import.meta.url)));

test('spans carry real base font name and position', async () => {
  const pdf = await makePdf([{ text: 'Equifax Canada Co.', x: 400, y: 760, size: 14 }]);
  const r = await extractPdf(pdf);
  const s = r.pages[0].spans.find((sp) => sp.text.includes('Equifax'));
  assert.equal(s.font, 'Helvetica');
  assert.equal(s.size, 14);
  assert.ok(Math.abs(s.x - 400) < 0.5, `x=${s.x}`);
  assert.ok(Math.abs(s.y - 760) < 0.5, `y=${s.y}`);
  assert.ok(s.w > 0 && s.h > 0);
});

test('different fonts are distinguished', async () => {
  const r = await extractPdf(await makePdf([
    { text: 'AAA', x: 10, y: 700, size: 12 },
    { text: 'BBB', x: 10, y: 680, size: 12, font: 'Courier' }]));
  const fonts = r.pages[0].spans.map((s) => s.font).sort();
  assert.deepEqual(fonts, ['Courier', 'Helvetica']);
});

test('metadata producer is read', async () => {
  const r = await extractPdf(await makePdf([], { producer: 'Skia/PDF m81' }));
  assert.equal(r.meta.producer, 'Skia/PDF m81');
  assert.equal(r.encrypted, false);
});

test('empty-password encrypted PDF opens', async () => {
  const r = await extractPdf(ENCRYPTED);
  assert.equal(r.ok, true);
  assert.equal(r.encrypted, true);
  assert.equal(r.pages[0].spans[0].text, 'hi');
});

test('extractPdfImages returns RGBA of an embedded image', async () => {
  const pdf = await makePdf([], { image: PNG_4x4_RED });
  const r = await extractPdf(pdf);
  assert.equal(r.pages[0].imageCount, 1);
  const [img] = await extractPdfImages(pdf, 0);
  assert.equal(img.width, 4);
  assert.equal(img.data.length, 4 * 4 * 4);
  assert.deepEqual([...img.data.slice(0, 4)], [255, 0, 0, 255]);
});

test('corrupt bytes → ok:false reason corrupt', async () => {
  assert.deepEqual(await extractPdf(new TextEncoder().encode('%PDF-1.4 garbage')), { ok: false, reason: 'corrupt' });
});

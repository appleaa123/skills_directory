import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeImage, toOcrInput } from '../../src/node/decode.js';
import { ocrImage, terminateOcr } from '../../src/engine/image/ocr.js';
import { findGaugeInImage } from '../../src/engine/image/gauge-pixels.js';
import { checkImageTypeface } from '../../src/engine/checks/image-font.js';
import { PNG_4x4_RED } from '../fixtures/make.js';

function canvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  const set = (x, y, [r, g, b]) => data.set([r, g, b, 255], (y * w + x) * 4);
  return { rgba: { width: w, height: h, data }, set };
}

/** Synthetic gauge like fake #1: gradient bar y 143-178 from x 362-1075, triangle at 810, text above. */
function gaugeImage(pointerX = 810) {
  const { rgba, set } = canvas(1100, 350);
  for (let y = 143; y <= 178; y++) {
    for (let x = 362; x <= 1075; x++) {
      const t = (x - 362) / 713;
      set(x, y, [Math.round(50 + 150 * t), Math.round(140 + 90 * t), Math.round(200 - 110 * t)]);
    }
  }
  for (let y = 120; y <= 138; y++) {
    const half = Math.round((138 - y) / 2);
    for (let x = pointerX - half; x <= pointerX + half; x++) set(x, y, [0, 0, 0]);
  }
  for (let y = 95; y <= 112; y++) for (let x = 790; x <= 830; x++) set(x, y, [0, 0, 0]); // "725" label block
  for (let y = 178; y <= 285; y++) for (const x of [503, 647, 789, 932]) set(x, y, [205, 205, 205]); // grey dividers
  return rgba;
}

test('decodeImage turns PNG bytes into RGBA', () => {
  const img = decodeImage(PNG_4x4_RED);
  assert.equal(img.width, 4);
  assert.deepEqual([...img.data.slice(0, 4)], [255, 0, 0, 255]);
});

test('findGaugeInImage locates bar ends and pointer', () => {
  const g = findGaugeInImage(gaugeImage());
  assert.ok(Math.abs(g.barLeft - 362) <= 2, `barLeft ${g.barLeft}`);
  assert.ok(Math.abs(g.barRight - 1075) <= 2, `barRight ${g.barRight}`);
  assert.ok(Math.abs(g.pointerX - 810) <= 2, `pointerX ${g.pointerX}`);
});

test('findGaugeInImage returns null on a blank image', () => {
  assert.equal(findGaugeInImage(canvas(300, 200).rgba), null);
});

const STYLE = { anchorFonts: [{ phrase: 'Further to your request', sameAs: 'Equifax Canada Co.', charWidthRatioToSameAs: 1.0, imageRatioTolerance: 0.08 }] };
const words = (text, x, y, charW, h = 20) => text.split(' ').reduce((acc, wd) => {
  const start = acc.length ? acc.at(-1).x + acc.at(-1).w + charW : x;
  return [...acc, { text: wd, x: start, y, w: wd.length * charW, h, font: null, size: h }];
}, []);
const doc = { id: 'eeeeee', kind: 'image' };

test('typeface ratio as expected → no flag', () => {
  const spans = [...words('Equifax Canada Co.', 1100, 100, 10), ...words('Further to your request, a copy follows:', 90, 1000, 10)];
  assert.deepEqual(checkImageTypeface(doc, spans, STYLE), []);
});

test('typeface ratio 15% wider → soft IMAGE_TYPEFACE_DIFFERS', () => {
  const spans = [...words('Equifax Canada Co.', 1100, 100, 10), ...words('Further to your request, a copy follows:', 90, 1000, 11.5)];
  assert.deepEqual(checkImageTypeface(doc, spans, STYLE).map((f) => `${f.code}:${f.severity}`), ['IMAGE_TYPEFACE_DIFFERS:soft']);
});

test('ocrImage reads words from a synthetic image', { timeout: 120000 }, async () => {
  const rgba = decodeImage(new Uint8Array(readFileSync(new URL('../fixtures/ocr-text.png', import.meta.url))));
  const spans = await ocrImage(rgba, { toOcrInput });
  await terminateOcr();
  const text = spans.map((s) => s.text).join(' ');
  assert.match(text, /POOR/); assert.match(text, /GOOD/);
  assert.ok(spans.every((s) => s.font === null && s.w > 0));
});

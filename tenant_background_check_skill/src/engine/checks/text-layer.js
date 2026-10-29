import { makeFlag } from '../flags.js';

const MIN_OVERLAP = 0.5; // share of the LARGER box: a cover-and-replace edit stacks two similar boxes

function overlapShare(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / Math.max(a.w * a.h, b.w * b.h);
}

function hasStackedText(spans) {
  return spans.some((a, i) => spans.slice(i + 1).some((b) => a.text.trim() !== b.text.trim() && overlapShare(a, b) >= MIN_OVERLAP));
}

/** Hidden or stacked text: leftovers of editing values on top of the original page. */
export function checkTextLayer(doc, extracted) {
  const flags = [];
  // Scanned pages legitimately carry an invisible OCR layer, so only pages with visible text count.
  if (extracted.pages.some((p) => p.spans.length && p.invisibleSpans.length)) flags.push(makeFlag('INVISIBLE_TEXT', doc.id));
  if (extracted.pages.some((p) => hasStackedText(p.spans))) flags.push(makeFlag('STACKED_TEXT', doc.id));
  return flags;
}

// Maintainer-side measurements used to calibrate rulebook entries from genuine files.
// Outputs are layout constants only, never document values.
import { expectedPointerFraction } from './checks/gauge.js';
import { findScoreSpans } from './checks/template.js';

const RANGE_LABEL = /^\d{3}-\d{3}$/;
const SAME_LINE_PT = 1;

function linePerChar(spans, phrase) {
  const anchor = spans.find((s) => s.text.toLowerCase().includes(phrase.toLowerCase()));
  if (!anchor) return null;
  const line = spans.filter((s) => Math.abs(s.y - anchor.y) < SAME_LINE_PT).sort((a, b) => a.x - b.x);
  const width = line.at(-1).x + line.at(-1).w - line[0].x;
  return width / line.map((s) => s.text).join(' ').length;
}

/** Per-character width of the anchor's line divided by that of the reference line. */
export function measureCharWidthRatio(extracted, phrase, sameAs) {
  const spans = extracted.pages.flatMap((p) => p.spans);
  const a = linePerChar(spans, phrase);
  const b = linePerChar(spans, sameAs);
  return a && b ? a / b : null;
}

/** Offset (pt) between the first range label and the bar start implied by the pointer and score. */
export function measureGaugeOffset(extracted, glyph, bands) {
  for (const page of extracted.pages) {
    const labels = page.spans.filter((s) => RANGE_LABEL.test(s.text.trim())).sort((a, b) => a.x - b.x);
    const pointer = page.spans.find((s) => s.text.trim() === glyph);
    if (labels.length !== bands.length || !pointer) continue;
    const score = +findScoreSpans(extracted)[0]?.text;
    if (!score) return null;
    const bandW = (labels.at(-1).x - labels[0].x) / (labels.length - 1);
    return pointer.x - labels[0].x - expectedPointerFraction(score, bands) * bandW;
  }
  return null;
}

import { makeFlag } from '../flags.js';
import { findScoreSpans } from './template.js';

const RANGE_LABEL = /^\d{3}-\d{3}$/;
const BAND_COUNT = 5;

/**
 * Pointer position in band widths (0..5). Genuine gauges draw every band at the
 * same width regardless of how many points it covers (measured on genuine reports).
 */
export function expectedPointerFraction(score, bands) {
  const k = bands.findIndex(([lo, hi]) => score >= lo && score <= hi);
  if (k < 0) return NaN;
  const [lo, hi] = bands[k];
  return k + (score - lo) / (hi - lo + 1);
}

function gaugeGeometry(extracted, glyph) {
  for (const page of extracted.pages) {
    const labels = page.spans.filter((s) => RANGE_LABEL.test(s.text.trim())).sort((a, b) => a.x - b.x);
    const pointer = page.spans.find((s) => s.text.trim() === glyph);
    if (labels.length === BAND_COUNT && pointer) return { labels, pointer };
  }
  return null;
}

/** Gauge pointer vs score on a text PDF. */
export function checkGaugePdf(doc, extracted, style) {
  const g = style?.gauge;
  if (!g) return [];
  const geom = gaugeGeometry(extracted, g.pointerGlyph);
  const score = +findScoreSpans(extracted)[0]?.text;
  if (!geom || !score || g.pointerOffsetFromFirstRangeLabel == null) return [makeFlag('GAUGE_NOT_FOUND', doc.id)];
  const first = geom.labels[0].x;
  const bandW = (geom.labels[BAND_COUNT - 1].x - first) / (BAND_COUNT - 1);
  const expectedX = first + g.pointerOffsetFromFirstRangeLabel + expectedPointerFraction(score, g.bands) * bandW;
  return Math.abs(geom.pointer.x - expectedX) > g.tolerancePt ? [makeFlag('GAUGE_POINTER_MISMATCH', doc.id)] : [];
}

/**
 * Gauge pointer vs score on a screenshot.
 * @param {{barLeft:number, barRight:number, pointerX:number}|null} gauge from findGaugeInImage
 */
export function checkGaugeImage(doc, gauge, score, style) {
  const g = style?.gauge;
  if (!g) return [];
  if (!gauge || !score) return [makeFlag('GAUGE_NOT_FOUND', doc.id)];
  const barW = gauge.barRight - gauge.barLeft;
  const expectedX = gauge.barLeft + (expectedPointerFraction(score, g.bands) * barW) / BAND_COUNT;
  return Math.abs(gauge.pointerX - expectedX) > g.imageToleranceBarFraction * barW ? [makeFlag('GAUGE_POINTER_MISMATCH', doc.id)] : [];
}

const SCORE = /^\d{3}$/;

/** On a screenshot the score is printed larger than range labels and street numbers: take the tallest 3-digit word. */
export function pickImageScore(spans) {
  const candidates = spans.filter((s) => SCORE.test(s.text.trim()) && +s.text >= 300 && +s.text <= 900);
  if (!candidates.length) return NaN;
  return +candidates.reduce((best, s) => (s.h > best.h ? s : best)).text;
}

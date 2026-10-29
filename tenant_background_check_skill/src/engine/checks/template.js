import { makeFlag } from '../flags.js';

const SAME_LINE_PT = 1;
const SIZE_TOLERANCE = 0.2;
const MAX_REPORT_AGE_DAYS = 30;
const DAY_MS = 86_400_000;
const SCORE = /^\d{3}$/;
const RANGE_LABEL = /^\d{3}-\d{3}$/;
const DATE_LIKE = /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/;
const POSTAL = /\b[A-Z]\d[A-Z] ?\d[A-Z]\d\b/g;

const allSpans = (extracted) => extracted.pages.flatMap((p) => p.spans);
const spanWith = (spans, phrase) => spans.find((s) => s.text.toLowerCase().includes(phrase.toLowerCase()));
const lineOf = (spans, anchor) => spans.filter((s) => Math.abs(s.y - anchor.y) < SAME_LINE_PT);

const MIN_RANGE_LABELS = 3;
const isRangeLabel = (s) => RANGE_LABEL.test(s.text.trim());

/** Page(s) carrying the score gauge; all pages when no gauge is found. */
export function gaugePages(extracted) {
  const withGauge = extracted.pages.filter((p) => p.spans.filter(isRangeLabel).length >= MIN_RANGE_LABELS);
  return withGauge.length ? withGauge : extracted.pages;
}

/** Spans that look like a credit score (three digits, 300-900) on the gauge page. */
export function findScoreSpans(extracted) {
  return gaugePages(extracted).flatMap((p) => p.spans)
    .filter((s) => SCORE.test(s.text.trim()) && +s.text >= 300 && +s.text <= 900);
}

function anchorFontsOk(spans, rule) {
  const anchor = spanWith(spans, rule.phrase);
  if (!anchor) return true; // absent anchor is a layout question, not a font one
  const ref = rule.sameAs ? spanWith(spans, rule.sameAs) : null;
  const font = rule.font ?? ref?.font;
  const size = rule.size ?? ref?.size;
  const fits = (s) => s.font === font && Math.abs(s.size - size) <= SIZE_TOLERANCE;
  return lineOf(spans, anchor).every(fits) && (!ref || fits(ref));
}

function scoreFlags(doc, extracted, style) {
  // Scores are only identifiable next to a gauge; elsewhere 3-digit numbers are phone prefixes, limits, etc.
  const hasGauge = extracted.pages.some((p) => p.spans.filter(isRangeLabel).length >= MIN_RANGE_LABELS);
  if (!style.gauge || !hasGauge) return [];
  const scores = findScoreSpans(extracted).map((s) => +s.text);
  if (!scores.length) return [];
  const flags = [];
  if (new Set(scores).size > 1) flags.push(makeFlag('SCORE_LABEL_MISMATCH', doc.id));
  const floors = (style.gauge?.bands ?? []).slice(1).map(([lo]) => lo);
  if (floors.includes(scores[0])) flags.push(makeFlag('SCORE_AT_BAND_FLOOR', doc.id));
  return flags;
}

function rangeLabelsOk(spans, style) {
  const expected = style.gauge?.rangeLabels;
  const found = spans.filter(isRangeLabel).sort((a, b) => a.x - b.x).map((s) => s.text.trim());
  return !expected || !found.length || JSON.stringify(found) === JSON.stringify(expected);
}

function dateFlags(doc, spans, style, now) {
  const anchor = style.reportDateAnchor && spanWith(spans, style.reportDateAnchor);
  if (!anchor) return [];
  const match = lineOf(spans, anchor).map((s) => s.text.match(DATE_LIKE)?.[0]).find(Boolean);
  if (!match) return [];
  if (style.dateFormat && !new RegExp(style.dateFormat).test(match)) return [makeFlag('DATE_FORMAT_UNEXPECTED', doc.id)];
  const [y, m, d] = match.split(/[/-]/).map(Number);
  const ageDays = (now - Date.UTC(y, m - 1, d)) / DAY_MS;
  return ageDays > MAX_REPORT_AGE_DAYS ? [makeFlag('REPORT_DATE_OLD', doc.id)] : [];
}

function postalOk(spans, style) {
  const rule = style.postal;
  if (!rule) return true;
  const want = rule.addressFormat === 'spaced' ? / / : /^\S+$/;
  return spans
    .filter((s) => rule.addressLabels.some((l) => s.text.includes(l)))
    .flatMap((label) => lineOf(spans, label).flatMap((s) => s.text.match(POSTAL) ?? []))
    .every((code) => want.test(code));
}

/**
 * Template rules for an identified report style.
 * @param {import('../flags.js').Doc} doc
 */
export function checkTemplate(doc, extracted, style, now = new Date()) {
  if (!style) return [makeFlag('STYLE_UNKNOWN', doc.id)];
  const spans = allSpans(extracted);
  const flags = [];
  if (!(style.anchorFonts ?? []).every((r) => anchorFontsOk(spans, r))) flags.push(makeFlag('ANCHOR_FONT_MISMATCH', doc.id));
  if (!rangeLabelsOk(spans, style)) flags.push(makeFlag('RANGE_LABELS_NONSTANDARD', doc.id));
  flags.push(...scoreFlags(doc, extracted, style));
  flags.push(...dateFlags(doc, spans, style, now));
  if (!postalOk(spans, style)) flags.push(makeFlag('POSTAL_FORMAT_UNEXPECTED', doc.id));
  return flags;
}

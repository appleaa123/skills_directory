// Fixed field labels and template phrases. Fingerprints record ONLY these, never the
// text around them, so a fingerprint can never carry applicant data.
export const ANCHOR_PHRASES = Object.freeze([
  'Further to your request', 'Equifax Canada Co.', 'CONFIDENTIAL INFORMATION', 'CONSUMER USE ONLY',
  'EQUIFAX REFERENCE NUMBER', 'Equifax Credit Score', 'Current Address', 'Previous Address',
  'Former Address', 'Date of Birth', 'Personal Information', 'Credit Report', 'TransUnion',
  'POOR', 'FAIR', 'GOOD', 'VERY GOOD', 'EXCELLENT',
]);
const EXACT_MATCH_MAX_LEN = 9; // short band labels ("GOOD") must equal the span, not be contained in it
const PAGE_SIZE_TOLERANCE = 2;

function anchorsIn(spanText) {
  const t = spanText.trim();
  return ANCHOR_PHRASES.filter((p) => (p.length <= EXACT_MATCH_MAX_LEN ? t === p : t.toLowerCase().includes(p.toLowerCase())));
}

/** PII-free structural fingerprint of an extracted PDF. */
export function fingerprint(extracted) {
  const { meta = {}, pages = [] } = extracted;
  const first = pages[0] ?? { width: 0, height: 0 };
  const fonts = new Set();
  const anchors = [];
  for (const page of pages) {
    for (const span of page.spans) {
      if (span.font) fonts.add(span.font);
      for (const text of anchorsIn(span.text)) {
        if (!anchors.some((a) => a.text === text)) anchors.push({ text, font: span.font, size: span.size });
      }
    }
  }
  return {
    producer: meta.producer ?? null,
    creator: meta.creator ?? null,
    pageCount: pages.length,
    pageSize: [Math.round(first.width), Math.round(first.height)],
    fonts: [...fonts].sort(),
    anchors,
  };
}

function matches(fp, m) {
  if (m.producer && !new RegExp(m.producer).test(fp.producer ?? '')) return false;
  if (m.creator && !new RegExp(m.creator).test(fp.creator ?? '')) return false;
  if (m.pageSize && m.pageSize.some((v, i) => Math.abs(v - fp.pageSize[i]) > PAGE_SIZE_TOLERANCE)) return false;
  return (m.requiredAnchors ?? []).every((a) => fp.anchors.some((x) => x.text === a));
}

/** First rulebook style whose match block fits, else null. */
export function identifyStyle(fp, rulebook) {
  return rulebook.styles.find((s) => matches(fp, s.match)) ?? null;
}

const DOC_TYPES = [
  ['rental_application', /rental application|application to rent|form 410/i],
  ['credit_report', /equifax|trans\s?union|credit score|credit file|borrowell|credit karma/i],
  ['paystub', /pay\s?stub|earnings statement|gross pay|net pay|\bytd\b/i],
  ['id', /driver'?s licen[cs]e|passport|permanent resident card|photo card/i],
  ['bank_statement', /statement period|opening balance|closing balance/i],
  ['employment_letter', /to whom it may concern|is employed|employment (letter|verification|confirmation)|confirm(s|ing)? .{0,40}employ/i],
];

export function classifyDocType(text) {
  return DOC_TYPES.find(([, re]) => re.test(text))?.[0] ?? 'other';
}

const MIN_IMAGE_ANCHORS = 2;

/** Style for a screenshot: at least two of the style's image anchors appear in the OCR text. */
export function identifyImageStyle(ocrText, rulebook) {
  const t = ocrText.toLowerCase();
  return rulebook.styles.find((s) => (s.imageMatchAnchors ?? []).filter((a) => t.includes(a.toLowerCase())).length >= MIN_IMAGE_ANCHORS) ?? null;
}

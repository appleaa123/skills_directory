import { makeFlag } from '../flags.js';

/** Group OCR words into lines by vertical overlap. */
function lines(spans) {
  const out = [];
  for (const s of [...spans].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const line = out.find((l) => Math.abs(l.cy - (s.y + s.h / 2)) < s.h / 2);
    if (line) line.words.push(s);
    else out.push({ cy: s.y + s.h / 2, words: [s] });
  }
  return out.map(({ words }) => {
    const sorted = words.sort((a, b) => a.x - b.x);
    const text = sorted.map((w) => w.text).join(' ');
    const width = sorted.at(-1).x + sorted.at(-1).w - sorted[0].x;
    return { text, perChar: width / text.length };
  });
}

const lineWith = (ls, phrase) => ls.find((l) => l.text.toLowerCase().includes(phrase.toLowerCase()));

/**
 * Soft typeface check on screenshots: OCR cannot name fonts, so compare the
 * per-character width of a template line with its reference line.
 */
export function checkImageTypeface(doc, spans, style) {
  const ls = lines(spans);
  const differs = (style?.anchorFonts ?? []).some((rule) => {
    if (!rule.charWidthRatioToSameAs || !rule.sameAs) return false;
    const a = lineWith(ls, rule.phrase);
    const b = lineWith(ls, rule.sameAs);
    if (!a || !b) return false;
    const ratio = a.perChar / b.perChar;
    return Math.abs(ratio / rule.charWidthRatioToSameAs - 1) > (rule.imageRatioTolerance ?? 0.08);
  });
  return differs ? [makeFlag('IMAGE_TYPEFACE_DIFFERS', doc.id)] : [];
}

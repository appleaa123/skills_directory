// Layout report from a report the user owns, for the maintainer to calibrate rulebook entries.
// Outputs layout constants, fixed label phrases and flag codes only, never document values.
// Reads the PDF text layer only: no OCR, so nothing is downloaded and scans are refused.
import { loadPackage } from './load.js';
import { extractPdf } from './pdf/extract.js';
import { fingerprint, identifyStyle, classifyDocType } from './style.js';
import { measureCharWidthRatio, measureGaugeOffset } from './measure.js';
import { runChecksOn } from './run.js';
import { validateApplication } from './application.js';

export const LAYOUT_REPORT_HEADER = 'TENANT CHECKER LAYOUT REPORT (no personal data)';
/** User-facing reason for each refusal, shared by the CLI and the page. */
export const LEARN_ERRORS = Object.freeze({
  not_pdf: 'This needs the PDF downloaded from the bureau or provider, not a screenshot.',
  unreadable: 'The PDF could not be read. Try downloading it again.',
  no_text: 'This PDF is a scan or photo with no text layer. Download the report from the bureau or provider instead.',
  not_credit_report: 'This PDF does not look like a credit report. Use your own credit report from the bureau or provider.',
});

const PDF_MAGIC = '%PDF';
const RANGE_LABEL = /^(\d{3})-(\d{3})$/;
const SCORE_MIN = 300;
const SCORE_MAX = 900;
const MIN_GAUGE_LABELS = 3;
const SAME_LINE_PT = 1;
const TOKEN_SPLIT = /[\s(),;:]+/;
const TRADEMARKS = /[®™©]/g;
const VERSION_TOKEN = /^v?\d+(\.\d+)*$/;
// A tool name has a digit, '/', '.', '-' or '_', or inner capitals (iText, ConsumerDisclosureService).
// A plain capitalised or all-caps word may be a person's name, so it is dropped.
const looksLikeTool = (t) => /[\d/._-]/.test(t) || /[a-z][A-Z]/.test(t);

const isPdf = (bytes) => new TextDecoder('latin1').decode(bytes.subarray(0, PDF_MAGIC.length)) === PDF_MAGIC;

/** Producer/creator → "Tool 1.2.3", "Tool", or null. Everything after the tool and version is dropped. */
function toolName(raw) {
  const [first, second] = (raw ?? '').replace(TRADEMARKS, '').trim().split(TOKEN_SPLIT);
  if (!first || !looksLikeTool(first)) return null;
  return second && VERSION_TOKEN.test(second) ? `${first} ${second}` : first;
}

/** Score range labels on one line, left to right, each band starting where the previous ended. */
function rangeLabels(extracted) {
  for (const page of extracted.pages) {
    const labels = page.spans.map((s) => ({ s, m: RANGE_LABEL.exec(s.text.trim()) }))
      .filter(({ m }) => m && +m[1] >= SCORE_MIN && +m[2] <= SCORE_MAX && +m[1] < +m[2]);
    for (const { s: anchor } of labels) {
      const line = labels.filter(({ s }) => Math.abs(s.y - anchor.y) < SAME_LINE_PT).sort((a, b) => a.s.x - b.s.x);
      const contiguous = line.every(({ m }, i) => i === 0 || +m[1] === +line[i - 1].m[2] + 1);
      if (line.length >= MIN_GAUGE_LABELS && contiguous) return line.map(({ s }) => s.text.trim());
    }
  }
  return [];
}

/** Char-width ratios for every anchor-font pair the rulebook knows. */
function charWidthRatios(extracted, rulebook) {
  const pairs = rulebook.styles.flatMap((s) => (s.anchorFonts ?? []).filter((a) => a.sameAs).map((a) => [a.phrase, a.sameAs]));
  return Object.fromEntries(pairs.map(([a, b]) => [`${a}|${b}`, measureCharWidthRatio(extracted, a, b)]));
}

/** Gauge offset against the matched style's gauge, else the first style that has one. */
function gaugeOffset(extracted, style, rulebook) {
  const gauge = style?.gauge ?? rulebook.styles.find((s) => s.gauge)?.gauge;
  return gauge ? measureGaugeOffset(extracted, gauge.pointerGlyph, gauge.bands) : null;
}

/**
 * Measure the layout of one credit report PDF.
 * @param {Uint8Array} bytes
 * @returns {Promise<{ok:false, reason:keyof LEARN_ERRORS} | {ok:true, docType:string, styleId:string|null,
 *   flagCodes:string[], fingerprint:object, rangeLabels:string[], charWidthRatios:object,
 *   pointerOffsetFromFirstRangeLabel:number|null}>}
 */
export async function learnLayout(bytes, rulebook, now = new Date()) {
  if (!isPdf(bytes)) return { ok: false, reason: 'not_pdf' };
  const [doc] = await loadPackage([{ name: 'report.pdf', bytes }]);
  const extracted = await extractPdf(doc.bytes);
  if (!extracted.ok) return { ok: false, reason: 'unreadable' };
  if (!extracted.pages.some((p) => p.spans.length)) return { ok: false, reason: 'no_text' };
  const text = extracted.pages.flatMap((p) => p.spans.map((s) => s.text)).join('\n');
  const docType = classifyDocType(text);
  if (docType !== 'credit_report') return { ok: false, reason: 'not_credit_report' };

  const fp = fingerprint(extracted);
  const style = identifyStyle(fp, rulebook);
  const read = { doc, docType, text, extracted, ocrSpans: [] };
  const { flags } = runChecksOn([read], validateApplication({}), rulebook, now);
  return {
    ok: true,
    docType,
    styleId: style?.id ?? null,
    flagCodes: [...new Set(flags.map((f) => f.code))],
    fingerprint: { ...fp, producer: toolName(fp.producer), creator: toolName(fp.creator) },
    rangeLabels: rangeLabels(extracted),
    charWidthRatios: charWidthRatios(extracted, rulebook),
    pointerOffsetFromFirstRangeLabel: gaugeOffset(extracted, style, rulebook),
  };
}

/** Plain-text layout report for the user to send to the maintainer. */
export function renderLayoutReport(report, checkerVersion) {
  return [LAYOUT_REPORT_HEADER, `Checker version: ${checkerVersion ?? 'unknown'}`, JSON.stringify(report, null, 2)].join('\n');
}

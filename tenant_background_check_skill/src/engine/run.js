import { makeFlag } from './flags.js';
import { loadPackage } from './load.js';
import { extractPdf, extractPdfImages } from './pdf/extract.js';
import { ocrImage } from './image/ocr.js';
import { findGaugeInImage } from './image/gauge-pixels.js';
import { fingerprint, identifyStyle, identifyImageStyle, classifyDocType } from './style.js';
import { checkFileHistory } from './checks/file-history.js';
import { checkTemplate } from './checks/template.js';
import { checkGaugePdf, checkGaugeImage, pickImageScore } from './checks/gauge.js';
import { checkTextLayer } from './checks/text-layer.js';
import { checkImageTypeface } from './checks/image-font.js';
import { verifyIdentity, companyKey } from './checks/identity.js';
import { checkPaystubs } from './checks/paystub.js';
import { checkEmploymentLetter } from './checks/employment.js';

const POSTAL = /[A-Z]\d[A-Z] ?\d[A-Z]\d/i;
const ROW_TOLERANCE_PT = 2;
const squash = (s) => s.replace(/\s/g, '').toUpperCase();

/** Spans → text with one line per visual row (PDF y grows upward, image y downward). */
function toText(spans, yUp) {
  const sorted = [...spans].sort((a, b) => (yUp ? b.y - a.y : a.y - b.y));
  const rows = [];
  for (const s of sorted) {
    const row = rows.at(-1);
    if (row && Math.abs(row[0].y - s.y) <= ROW_TOLERANCE_PT) row.push(s);
    else rows.push([s]);
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x).map((s) => s.text).join(' ')).join('\n');
}

class OcrUnavailable extends Error {}

async function ocr(rgba, env) {
  try {
    return await ocrImage(rgba, env);
  } catch {
    throw new OcrUnavailable();
  }
}

async function ocrPdfPages(doc, extracted, env) {
  const spans = [];
  for (const [i, page] of extracted.pages.entries()) {
    if (page.spans.length || !page.imageCount) continue;
    for (const rgba of await extractPdfImages(doc.bytes, i)) spans.push(...(await ocr(rgba, env)));
  }
  return spans;
}

async function readOne(doc, env) {
  if (doc.kind === 'pdf') {
    const extracted = await extractPdf(doc.bytes);
    if (!extracted.ok) return { doc, docType: 'unknown', error: 'unreadable' };
    const ocrSpans = await ocrPdfPages(doc, extracted, env);
    const text = [toText(extracted.pages.flatMap((p) => p.spans), true), toText(ocrSpans, false)].join('\n');
    return { doc, docType: classifyDocType(text), text, extracted, ocrSpans };
  }
  if (doc.kind === 'image') {
    const rgba = await env.decodeImage(doc.bytes);
    const ocrSpans = await ocr(rgba, env);
    const text = toText(ocrSpans, false);
    return { doc, docType: classifyDocType(text), text, rgba, ocrSpans };
  }
  return { doc, docType: 'unknown', error: 'unreadable' };
}

/**
 * Read every document locally (text layer + on-device OCR) without judging anything.
 * The result feeds both auto-fill (extractApplication) and the checks (runChecksOn).
 * @param {{name:string, bytes:Uint8Array}[]} entries
 * @param {{decodeImage:(bytes)=>any, toOcrInput:(rgba)=>any, workerOptions?:object}} env
 */
export async function readDocuments(entries, env) {
  const read = [];
  for (const doc of await loadPackage(entries)) {
    try {
      read.push(await readOne(doc, env));
    } catch (err) {
      read.push({ doc, docType: 'unknown', error: err instanceof OcrUnavailable ? 'ocr' : 'unreadable' });
    }
  }
  return read;
}

function imageCreditChecks(doc, rgba, spans, text, rulebook) {
  const style = identifyImageStyle(text, rulebook);
  if (!style) return { styleId: null, flags: [makeFlag('STYLE_UNKNOWN', doc.id)] };
  const gaugeFlags = style.gauge ? checkGaugeImage(doc, rgba ? findGaugeInImage(rgba) : null, pickImageScore(spans), style) : [];
  return { styleId: style.id, flags: [...gaugeFlags, ...checkImageTypeface(doc, spans, style)] };
}

function checkPdf(r, rulebook, now) {
  const { extracted, ocrSpans, text } = r;
  const typed = { ...r.doc, docType: r.docType };
  if (r.docType !== 'credit_report') {
    return { styleId: null, flags: [...checkFileHistory(typed, extracted, null), ...checkTextLayer(typed, extracted)] };
  }
  // Text pages always get the full PDF checks; scanned pages add image checks on top, never replace them.
  const hasText = extracted.pages.some((p) => p.spans.length);
  const style = hasText ? identifyStyle(fingerprint(extracted), rulebook) : null;
  const pdfFlags = [...checkFileHistory(typed, extracted, style), ...checkTextLayer(typed, extracted),
    ...(hasText ? checkTemplate(typed, extracted, style, now) : []), ...(style ? checkGaugePdf(typed, extracted, style) : [])];
  if (!ocrSpans.length) return { styleId: style?.id ?? null, flags: pdfFlags };
  const img = imageCreditChecks(typed, null, ocrSpans, text, rulebook);
  const imgFlags = style ? img.flags.filter((f) => f.code !== 'STYLE_UNKNOWN') : img.flags;
  const merged = style && img.styleId === null ? pdfFlags : [...pdfFlags.filter((f) => !(f.code === 'STYLE_UNKNOWN' && img.styleId)), ...imgFlags];
  return { styleId: style?.id ?? img.styleId, flags: merged };
}

function checkOne(r, rulebook, now) {
  if (r.error) return { styleId: null, flags: [makeFlag(r.error === 'ocr' ? 'OCR_UNAVAILABLE' : 'UNREADABLE_FILE', r.doc.id)] };
  if (r.extracted) return checkPdf(r, rulebook, now);
  if (r.docType !== 'credit_report') return { styleId: null, flags: [] };
  return imageCreditChecks(r.doc, r.rgba, r.ocrSpans, r.text, rulebook);
}

function safeLetterhead(letterhead, app) {
  const home = app.currentAddress?.match(POSTAL)?.[0];
  const office = letterhead.officeAddress?.match(POSTAL)?.[0];
  if (home && office && squash(home) === squash(office)) {
    const { officeAddress, ...rest } = letterhead;
    return rest;
  }
  return letterhead;
}

/**
 * Run every local check on documents already read by readDocuments.
 * @param {import('./application.js').Application} app  facts to verify (all optional)
 * @param {{sources?:Record<string,string>}} [opts]  field → docId the value was auto-filled from
 */
export function runChecksOn(read, app, rulebook, now = new Date(), opts = {}) {
  const results = read.map((r) => ({ ...r, ...checkOne(r, rulebook, now) }));
  const letters = results.filter((r) => r.docType === 'employment_letter' && r.extracted);
  const letterChecks = letters.map((r) => checkEmploymentLetter(r.doc, r.extracted, app));
  const letterhead = safeLetterhead(Object.assign({}, ...letterChecks.map((c) => c.letterhead)), app);
  const employer = app.employer ? companyKey(app.employer) : null;
  const stubs = results.filter((r) => r.docType === 'paystub')
    .map((r) => ({ id: r.doc.id, text: r.text, group: employer && companyKey(r.text).includes(employer) ? 'primary' : `other-${r.doc.id}` }));
  const withText = results.filter((r) => r.text).map((r) => ({ id: r.doc.id, docType: r.docType, text: r.text }));
  const sources = opts.sources ?? {};
  // A value auto-filled from a document is never "verified" against that same document.
  const sourceOf = (field) => sources[field === 'address' ? 'currentAddress' : field];
  const identity = verifyIdentity(app, withText).filter((x) => sourceOf(x.field) !== x.docId);

  return {
    docs: results.map((r) => ({ id: r.doc.id, kind: r.doc.kind, docType: r.docType, styleId: r.styleId ?? null })),
    flags: [...results.flatMap((r) => r.flags), ...letterChecks.flatMap((c) => c.flags), ...(stubs.length ? checkPaystubs(stubs) : [])],
    identity,
    sources,
    letterhead,
    salaryVerdict: null,
  };
}

/**
 * Read and check an application package in one call.
 * @param {{name:string, bytes:Uint8Array}[]} entries
 */
export async function runChecks(entries, app, rulebook, env, opts) {
  return runChecksOn(await readDocuments(entries, env), app, rulebook, env.now ?? new Date(), opts);
}

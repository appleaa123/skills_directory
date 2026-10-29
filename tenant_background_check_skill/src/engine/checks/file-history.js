import { makeFlag } from '../flags.js';
import { analyzeRevisions } from '../pdf/revisions.js';

const EDITING_TOOLS = /Photoshop|Illustrator|Canva|iLovePDF|Smallpdf|Sejda|PDFescape|Foxit PhantomPDF|PDF-XChange|Nitro|LibreOffice|OpenOffice|Microsoft®? Word|Adobe Acrobat (Pro|Standard)/i;
const HIGH_STAKES = new Set(['credit_report', 'paystub']);
const MARKUP_ANNOTS = new Set(['FreeText', 'Stamp', 'Ink', 'Square', 'Redact']);
const BROWSER_PRODUCER = /^Skia\/PDF/;

const changesContent = (rev) => rev.touchesPageContent || rev.addsFonts || rev.annotTypes.some((t) => MARKUP_ANNOTS.has(t));

/**
 * File-history checks for one PDF.
 * @param {import('../flags.js').Doc} doc
 * @param {{meta:{producer?:string, creator?:string}}} extracted
 * @param {{expectedProducers?:string[]}|null} style
 */
export function checkFileHistory(doc, extracted, style) {
  const flags = [];
  const { producer = '', creator = '' } = extracted.meta ?? {};
  const isCredit = doc.docType === 'credit_report';
  const { linearized, revisions } = analyzeRevisions(doc.bytes);

  if (isCredit && EDITING_TOOLS.test(`${producer} ${creator}`)) flags.push(makeFlag('EDITING_TOOL_PRODUCER', doc.id));
  if (style?.expectedProducers && !style.expectedProducers.some((re) => new RegExp(re).test(producer))) {
    flags.push(makeFlag('PRODUCER_UNEXPECTED', doc.id));
  }
  if (revisions.some(changesContent)) {
    flags.push(makeFlag(HIGH_STAKES.has(doc.docType) ? 'LATER_REVISION_CHANGES_CONTENT' : 'EDITED_AFTER_CREATION', doc.id));
  }
  if (linearized && BROWSER_PRODUCER.test(producer)) flags.push(makeFlag('REPROCESSED_BY_OTHER_TOOL', doc.id));
  if (isCredit && !producer && !creator) flags.push(makeFlag('METADATA_STRIPPED', doc.id));
  return flags;
}

/** @typedef {'red'|'soft'|'unverifiable'|'ok'} Severity */
/** @typedef {{code:string, severity:Severity, docId:string|null, message:string}} Flag */
/** @typedef {{text:string, x:number, y:number, w:number, h:number, font:string|null, size:number}} Span */
/** @typedef {{id:string, kind:'pdf'|'image'|'other', bytes:Uint8Array, docType?:string}} Doc */
/** @typedef {{width:number, height:number, data:Uint8ClampedArray}} Rgba */

export const SEVERITIES = Object.freeze(['red', 'soft', 'unverifiable', 'ok']);

// Messages are fixed text: they must never interpolate document values.
export const FLAG_CODES = Object.freeze({
  UNREADABLE_FILE: { severity: 'unverifiable', message: 'File could not be read (corrupt, password-protected, or unsupported format).' },
  EDITING_TOOL_PRODUCER: { severity: 'red', message: 'Credit report was produced or saved by an editing tool (image editor, PDF editor, or word processor), not by the credit bureau.' },
  PRODUCER_UNEXPECTED: { severity: 'red', message: 'The software that produced this file does not match what this report style is normally produced by.' },
  LATER_REVISION_CHANGES_CONTENT: { severity: 'red', message: 'The PDF was changed after it was first created: page content, fonts, or typed-on annotations were added in a later save.' },
  EDITED_AFTER_CREATION: { severity: 'soft', message: 'This document was changed after it was first created (page content or fonts added in a later save); confirm it with the issuer.' },
  OCR_UNAVAILABLE: { severity: 'unverifiable', message: 'On-device text recognition could not start (it needs an internet connection the first time), so this image was not checked. This says nothing about the file itself.' },
  REPROCESSED_BY_OTHER_TOOL: { severity: 'soft', message: 'The file was re-saved by a second program after it was produced (often a compressor or email app; usually harmless).' },
  ANCHOR_FONT_MISMATCH: { severity: 'red', message: 'A fixed line of the report template is set in a different font or size than the genuine template (sign of retyped text).' },
  RANGE_LABELS_NONSTANDARD: { severity: 'red', message: 'The score range labels differ from the genuine template.' },
  SCORE_LABEL_MISMATCH: { severity: 'red', message: 'The score shown in one place on the report does not match the score shown in another.' },
  DATE_FORMAT_UNEXPECTED: { severity: 'soft', message: 'The report date is written in a format this report style does not use.' },
  REPORT_DATE_OLD: { severity: 'soft', message: 'The credit report is more than 30 days old; ask for a current one.' },
  POSTAL_FORMAT_UNEXPECTED: { severity: 'soft', message: 'A postal code in an address field is formatted differently from genuine reports of this style.' },
  SCORE_AT_BAND_FLOOR: { severity: 'soft', message: 'The score sits exactly at the bottom of a rating band, a value forgers often pick; check the gauge result.' },
  GAUGE_POINTER_MISMATCH: { severity: 'red', message: 'The score gauge pointer does not sit where the printed score should place it (sign the score number was edited).' },
  GAUGE_NOT_FOUND: { severity: 'unverifiable', message: 'The score gauge could not be located or measured, so the pointer was not checked.' },
  INVISIBLE_TEXT: { severity: 'red', message: 'The PDF contains hidden text alongside visible text (earlier values can survive under an edited page).' },
  STACKED_TEXT: { severity: 'red', message: 'Two different pieces of text are printed on top of each other (sign a value was covered and replaced).' },
  IMAGE_TYPEFACE_DIFFERS: { severity: 'soft', message: 'In this screenshot, a fixed template line appears to be set in a different typeface from the rest of the template; check it by eye.' },
  PAYSTUB_DUPLICATE_EXCEPT_DATES: { severity: 'red', message: 'Two paystubs are identical except for their dates (sign one was copied and re-dated).' },
  PAYSTUB_NET_EXCEEDS_GROSS: { severity: 'red', message: 'A paystub shows net pay higher than gross pay.' },
  PAYSTUB_YTD_NOT_INCREASING: { severity: 'red', message: 'Year-to-date earnings do not increase from one paystub to the next.' },
  PAYSTUB_UNPARSEABLE: { severity: 'unverifiable', message: 'Gross and net pay could not be read from a paystub, so it was not checked.' },
  LETTER_WORD_PROCESSOR: { severity: 'soft', message: 'The employment letter was made in a word processor rather than an HR or payroll system (common for small employers; confirm by phone).' },
  LETTER_FREEMAIL: { severity: 'soft', message: 'The employment letter gives a free email address (e.g. Gmail) instead of a company domain.' },
  STYLE_UNKNOWN: { severity: 'unverifiable', message: 'This report layout is not in the rulebook, so its template could not be checked. File-history checks still ran.' },
  METADATA_STRIPPED: { severity: 'soft', message: 'Credit report has no producer or creator information; downloaded bureau reports normally carry it.' },
});

/** @returns {Flag} */
export function makeFlag(code, docId) {
  const entry = FLAG_CODES[code];
  if (!entry) throw new Error(`Unknown flag code: ${code}`);
  return { code, severity: entry.severity, docId, message: entry.message };
}

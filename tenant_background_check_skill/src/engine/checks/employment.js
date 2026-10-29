import { makeFlag } from '../flags.js';
import { companyKey, normalizeName } from './identity.js';

const WORD_PROCESSOR = /Microsoft®? Word|LibreOffice|OpenOffice|Google Docs|^Pages|Mac OS X.*Quartz/i;
const BROWSER_PRODUCER = /^Skia\/PDF/;
const EMAIL = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i;
const FREE_MAIL = new Set(['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'yahoo.ca', 'icloud.com', 'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'proton.me']);
const POSTAL = /[A-Z]\d[A-Z] ?\d[A-Z]\d/i;
const LETTERHEAD_SHARE = 0.25; // top quarter of the first page

function letterheadLines(extracted) {
  const page = extracted.pages[0];
  if (!page) return [];
  return page.spans.filter((s) => s.y >= page.height * (1 - LETTERHEAD_SHARE)).sort((a, b) => b.y - a.y).map((s) => s.text);
}

/**
 * Office address = a letterhead line with a postal code that names the employer, or sits right
 * under the employer's name, and never mentions the applicant. Anything else could be a home address.
 */
function officeAddressOf(lines, app) {
  if (!app.employer) return undefined;
  const employer = companyKey(app.employer);
  const nameTokens = app.name ? normalizeName(app.name) : [];
  const namesApplicant = (l) => nameTokens.length > 0 && nameTokens.every((t) => normalizeName(l).includes(t));
  const namesEmployer = (l) => l && companyKey(l).includes(employer);
  return lines.find((l, i) => POSTAL.test(l) && /\d/.test(l.replace(POSTAL, '')) && !namesApplicant(l)
    && (namesEmployer(l) || namesEmployer(lines[i - 1])));
}

/**
 * Employment-letter checks. Returns letterhead contacts that may be searched publicly
 * (email domain and office address only — never the letter body).
 */
export function checkEmploymentLetter(doc, extracted, app = {}) {
  const { producer = '', creator = '' } = extracted.meta ?? {};
  const flags = [];
  const wordProcessed = WORD_PROCESSOR.test(producer) || WORD_PROCESSOR.test(creator) || (BROWSER_PRODUCER.test(producer) && !creator);
  if (wordProcessed) flags.push(makeFlag('LETTER_WORD_PROCESSOR', doc.id));

  const allText = extracted.pages.flatMap((p) => p.spans.map((s) => s.text)).join('\n');
  const emailDomain = allText.match(EMAIL)?.[1]?.toLowerCase();
  if (emailDomain && FREE_MAIL.has(emailDomain)) flags.push(makeFlag('LETTER_FREEMAIL', doc.id));
  const officeAddress = officeAddressOf(letterheadLines(extracted), app);

  return { flags, letterhead: { ...(emailDomain && { emailDomain }), ...(officeAddress && { officeAddress: officeAddress.trim() }) } };
}

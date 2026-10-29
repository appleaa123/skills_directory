const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const POSTAL = /[A-Z]\d[A-Z] ?\d[A-Z]\d/gi;
const COMPANY_SUFFIX = /\b(inc|incorporated|ltd|limited|corp|corporation|co|llc|llp)\b/g;
const DOB_LABEL = /date of birth|date de naissance|\bdob\b|\bborn\b|birth/gi;
const DOB_WINDOW = 60;
const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3));
const FIELDS_BY_DOC = {
  credit_report: ['name', 'dob', 'address'],
  id: ['name', 'dob', 'address'],
  paystub: ['name', 'employer'],
  employment_letter: ['name', 'employer', 'title'],
  bank_statement: ['name'],
  rental_application: ['name', 'dob', 'address', 'employer', 'title'],
};

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Name → lowercase, accent-free tokens. */
export function normalizeName(s) {
  return fold(s).replace(/['\u2019]/g, '').split(/[^a-z]+/).filter(Boolean);
}

const words = (text) => new Set(normalizeName(text));
const squash = (s) => fold(s).replace(/[^a-z0-9]/g, '');

function nameStatus(name, text) {
  const tokens = normalizeName(name);
  const have = words(text);
  // Given name plus any other name part: covers dropped middle names and double surnames.
  if (have.has(tokens[0]) && (tokens.length === 1 || tokens.slice(1).some((t) => have.has(t)))) return 'match';
  return tokens.some((t) => have.has(t)) ? 'mismatch' : 'missing';
}

const monthOf = (word) => MONTH_ABBR.indexOf(fold(word).slice(0, 3)) + 1;

/** Every {y,m,d} a date-looking string could mean (DD/MM vs MM/DD both kept). */
function readDates(s) {
  const out = [];
  for (const m of s.matchAll(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/g)) out.push([+m[1], +m[2], +m[3]]);
  for (const m of s.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g)) out.push([+m[3], +m[2], +m[1]], [+m[3], +m[1], +m[2]]);
  for (const m of s.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g)) if (monthOf(m[1])) out.push([+m[3], monthOf(m[1]), +m[2]]);
  for (const m of s.matchAll(/\b(\d{1,2})\s+([A-Za-z]{3,9})\b[^\d]{0,12}(\d{4})\b/g)) if (monthOf(m[2])) out.push([+m[3], monthOf(m[2]), +m[1]]);
  return out;
}

function dobStatus(dob, text) {
  const [y, m, d] = dob.split('-').map(Number);
  const same = ([a, b, c]) => a === y && b === m && c === d;
  const windows = [...text.matchAll(DOB_LABEL)].map((l) => text.slice(l.index, l.index + DOB_WINDOW));
  if (!windows.length) return readDates(text).some(same) ? 'match' : 'missing';
  const near = windows.flatMap(readDates);
  if (near.some(same)) return 'match';
  return near.length ? 'mismatch' : 'missing'; // a label with no readable date proves nothing
}

function addressStatus(address, text) {
  const postal = address.match(POSTAL)?.[0];
  const civic = address.match(/\d+/)?.[0];
  const found = (text.match(POSTAL) ?? []).map(squash);
  if (!postal || !found.length) return 'missing';
  const hasCivic = new RegExp(`\\b${civic}\\b`).test(text);
  return found.includes(squash(postal)) && hasCivic ? 'match' : 'mismatch';
}

export const companyKey = (s) => fold(s).replace(COMPANY_SUFFIX, '').replace(/[^a-z0-9]+/g, ' ').trim();

function containsStatus(value, text) {
  return companyKey(text).includes(companyKey(value)) ? 'match' : 'mismatch';
}

const CHECKS = {
  name: (app, text) => (app.name ? nameStatus(app.name, text) : null),
  dob: (app, text) => (app.dob ? dobStatus(app.dob, text) : null),
  address: (app, text) => (app.currentAddress ? addressStatus(app.currentAddress, text) : null),
  employer: (app, text) => (app.employer ? containsStatus(app.employer, text) : null),
  title: (app, text) => (app.title ? containsStatus(app.title, text) : null),
};

/**
 * Verify the typed application facts against each document, locally.
 * @returns {{field:string, docId:string, status:'match'|'mismatch'|'missing'}[]}
 */
export function verifyIdentity(app, docs) {
  return docs.flatMap((doc) => (FIELDS_BY_DOC[doc.docType] ?? [])
    .map((field) => ({ field, docId: doc.id, status: CHECKS[field](app, doc.text) }))
    .filter((r) => r.status));
}

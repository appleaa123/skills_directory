// Auto-fill: read the application facts out of documents already read by readDocuments.
// Runs locally. Conservative by design: a field is filled only when a labelled value
// passes a shape check; anything doubtful stays blank for the user to fill in.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const PROVINCES = 'AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT';
const POSTAL = /[A-Z]\d[A-Z] ?\d[A-Z]\d/i;
const PHONE = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const NEXT_LABEL = /\s{2,}|\s(?=(?:date of birth|dob|sin|social insurance|address|telephone|phone|employer|occupation|position|salary)\b)/i;
const MIN_SALARY = 10_000;
const MAX_SALARY = 1_000_000;

const LABELS = {
  name: /^\s*(?:(?:applicant|employee|full|tenant)(?:'s)?\s+)?name\b(?!\s+of)\s*[:#-]?\s*(.*)$/i,
  dob: /^\s*(?:date of birth|birth date|dob)\b\s*[:#-]?\s*(.*)$/i,
  currentAddress: /^\s*(?:current|present)\s+address\b\s*[:#-]?\s*(.*)$/i,
  employer: /^\s*(?:present\s+)?(?:employer|company)(?:\s+name)?\b\s*[:#-]?\s*(.*)$/i,
  title: /^\s*(?:job title|position held|position|occupation)\b\s*[:#-]?\s*(.*)$/i,
  landlord: /^\s*(?:name of\s+)?(?:present\s+|previous\s+|current\s+)?landlord(?:'s name)?\b\s*[:#-]?\s*(.*)$/i,
  salary: /^\s*(?:annual\s+)?(?:salary|income)\b\s*[:#-]?\s*(.*)$/i,
};
// Same labels anywhere on a line, but only when followed by a colon ("Personal Information Name: …").
const INLINE = {
  name: /\b(?:(?:full|legal|applicant|employee)\s+)?name\s*:\s*(.*)$/i,
  dob: /\b(?:date of birth|birth date|dob)\s*:\s*(.*)$/i,
  employer: /\b(?:employer|company)(?:\s+name)?\s*:\s*(.*)$/i,
  title: /\b(?:job title|position|occupation)\s*:\s*(.*)$/i,
};
// Column headers whose value sits on the row below (Equifax consumer disclosure).
const HEADERS = {
  name: /^(?:full |legal )?name$/i,
  dob: /^(?:date of birth|birth date)$/i,
};
const BELOW_MAX_ROWS = 2.5; // in multiples of the header's font size
const COLUMN_SLACK_PT = 6;

const LETTER = {
  title: [/\b(?:employed|working|works)\b[^\n]{0,80}?\bas (?:an? |the )?([A-Z][\w&/ -]{2,60}?)(?=[,.\n]| since| with| at| in| on| for| effective|$)/,
    /\bposition of (?:an? |the )?([A-Z][\w&/ -]{2,60}?)(?=[,.\n]| since| with| at| in| on| for|$)/i],
  employer: [/\b(?:employed|working)\b (?:by|with|at) ([A-Z][\w&.,' -]{2,60}?)(?=\s+as\b|[,\n]|\.\s| since| in| on| for|$)/],
  salary: [/\$\s?([\d,]{4,}(?:\.\d{2})?)\s*(?:CAD\s*)?(?:per|\/|a)\s*(?:year|annum|yr)\b/i,
    /\b(?:annual\s+)?(?:salary|compensation)\b[^.\n$]{0,40}\$\s?([\d,]{4,}(?:\.\d{2})?)/i],
};

// Which document types may supply each field, best first.
const PRIORITY = {
  name: ['rental_application', 'credit_report', 'paystub'],
  dob: ['rental_application', 'credit_report'],
  currentAddress: ['rental_application', 'credit_report'],
  // Labelled paystub fields beat prose in a letter (measured on real packages).
  employer: ['rental_application', 'paystub', 'employment_letter'],
  title: ['rental_application', 'paystub', 'employment_letter'],
  annualSalary: ['rental_application', 'employment_letter'],
  reference: ['rental_application'],
};

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase());
const clean = (s) => s.split(NEXT_LABEL)[0].trim().replace(/[,;:]+$/, '');

function labelled(text, label, inline) {
  const lines = text.split('\n');
  for (const re of [label, inline].filter(Boolean)) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue;
      const value = clean(m[1] ?? '');
      return value || clean(lines[i + 1] ?? '');
    }
  }
  return '';
}

/** Text of the span directly under a column header (PDF y grows upward). */
function valueBelow(extracted, header) {
  for (const page of extracted?.pages ?? []) {
    const head = page.spans.find((s) => header.test(s.text.trim()));
    if (!head) continue;
    const inColumn = (s) => s.x >= head.x - COLUMN_SLACK_PT && s.x <= head.x + Math.max(head.w, 1) + COLUMN_SLACK_PT;
    const below = page.spans
      .filter((s) => s !== head && s.y < head.y && head.y - s.y <= head.size * BELOW_MAX_ROWS && inColumn(s))
      .sort((a, b) => b.y - a.y)[0];
    if (below) return clean(below.text);
  }
  return '';
}

const BLOCK_ANCHOR = /CONFIDENTIAL INFORMATION/i;
const BLOCK_MAX_HEIGHT_PT = 200;
const ROW_PT = 2;

/**
 * Mailing block of a bureau disclosure letter: unlabelled left-column lines above
 * "CONFIDENTIAL INFORMATION" — name first, then street, ending with the postal-code line.
 */
function mailingBlock(extracted) {
  const page = extracted?.pages?.[0];
  const anchor = page?.spans.find((s) => BLOCK_ANCHOR.test(s.text));
  if (!anchor) return {};
  const left = page.spans.filter((s) => s.x < page.width / 2 && s.y > anchor.y + ROW_PT && s.y - anchor.y <= BLOCK_MAX_HEIGHT_PT);
  const rows = [];
  for (const s of left.sort((a, b) => b.y - a.y)) {
    const row = rows.at(-1);
    if (row && Math.abs(row.y - s.y) <= ROW_PT) row.text += ` ${s.text}`;
    else rows.push({ y: s.y, text: s.text });
  }
  const lines = rows.map((r) => r.text.trim()).filter(Boolean);
  const last = lines.findLastIndex((l) => POSTAL.test(l));
  if (last < 1) return {};
  return { name: asName(lines[0]), address: lines.slice(1, last + 1).join(', ') };
}

const labelledOrBelow = (r, field) => labelled(r.text, LABELS[field], INLINE[field]) || (HEADERS[field] ? valueBelow(r.extracted, HEADERS[field]) : '');

const LABEL_WORDS = /\b(?:date|birth|address|name|employer|telephone|phone|sin|occupation|province|postal|city)\b/i;

function asName(raw) {
  if (!raw || /\d|@/.test(raw) || LABEL_WORDS.test(raw)) return undefined;
  const [last, first] = raw.includes(',') ? raw.split(',').map((s) => s.trim()) : [];
  const ordered = first ? `${first} ${last}` : raw;
  const tokens = ordered.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 5 || !tokens.every((t) => /^[\p{L}.'-]+$/u.test(t))) return undefined;
  return ordered === ordered.toUpperCase() ? titleCase(ordered) : ordered;
}

function asTitle(raw) {
  if (!raw || /[\d$@]/.test(raw) || raw.length > 60) return undefined;
  const words = raw.split(/\s+/);
  return words.length <= 6 ? raw : undefined;
}

function asEmployer(raw) {
  if (!raw || raw.includes('@') || raw.length > 80 || raw.split(/\s+/).length > 8) return undefined;
  return /\p{L}{2,}/u.test(raw) ? raw : undefined;
}

function asSalary(raw) {
  const n = Number(String(raw ?? '').replace(/,/g, ''));
  return n >= MIN_SALARY && n <= MAX_SALARY ? n : undefined;
}

/** Only unambiguous dates: year-first or with a month name. DD/MM vs MM/DD stays blank. */
function asIsoDate(raw) {
  const pad = (n) => String(n).padStart(2, '0');
  const valid = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : undefined;
  let m = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = raw.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return valid(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]);
  m = raw.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\b[^\d]{0,12}(\d{4})\b/);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return valid(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1]);
  m = raw.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (m && (+m[1] > 12 || +m[2] > 12)) return +m[1] > 12 ? valid(+m[3], +m[2], +m[1]) : valid(+m[3], +m[1], +m[2]);
  return undefined;
}

function asAddress(text) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => LABELS.currentAddress.test(l));
  if (i < 0) return undefined;
  const joined = `${lines[i].match(LABELS.currentAddress)[1]} ${POSTAL.test(lines[i]) ? '' : lines[i + 1] ?? ''}`.trim();
  const m = joined.match(POSTAL);
  return m ? joined.slice(0, m.index + m[0].length).trim() : undefined;
}

function cityProvince(address) {
  const m = address?.match(new RegExp(`,\\s*([\\p{L} .'-]+?),?\\s+(${PROVINCES})\\b[, ]*[A-Z]\\d[A-Z] ?\\d[A-Z]\\d`, 'iu'));
  return m ? { city: titleCase(m[1].trim()), province: m[2].toUpperCase(), country: 'Canada' } : {};
}

function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return undefined;
}

const EXTRACTORS = {
  name: (r) => asName(labelledOrBelow(r, 'name')) ?? (r.extracted ? asName(valueBelow(r.extracted, HEADERS.name)) ?? mailingBlock(r.extracted).name : undefined),
  dob: (r) => asIsoDate(labelledOrBelow(r, 'dob')) ?? (r.extracted ? asIsoDate(valueBelow(r.extracted, HEADERS.dob)) : undefined),
  currentAddress: (r) => asAddress(r.text) ?? (r.extracted ? mailingBlock(r.extracted).address || undefined : undefined),
  employer: (r) => asEmployer(r.docType === 'employment_letter' ? firstMatch(r.text, LETTER.employer) : labelled(r.text, LABELS.employer, INLINE.employer)),
  title: (r) => asTitle(r.docType === 'employment_letter' ? firstMatch(r.text, LETTER.title) : labelled(r.text, LABELS.title, INLINE.title)),
  annualSalary: (r) => asSalary(r.docType === 'employment_letter' ? firstMatch(r.text, LETTER.salary) : labelled(r.text, LABELS.salary).match(/[\d,]{4,}/)?.[0]),
  reference: (r) => {
    const lines = r.text.split('\n');
    const i = lines.findIndex((l) => LABELS.landlord.test(l));
    if (i < 0) return undefined;
    const name = asName(clean(lines[i].match(LABELS.landlord)[1]));
    const phone = (lines[i].match(PHONE) ?? lines[i + 1]?.match(PHONE))?.[0];
    return name || phone ? { ...(name && { name }), ...(phone && { phone }) } : undefined;
  },
};

/**
 * @param {{doc:{id:string}, docType:string, text?:string}[]} read  output of readDocuments
 * @returns {{values:object, sources:Record<string,string>}} values to pre-fill and the docId each came from
 */
export function extractApplication(read) {
  const values = {};
  const sources = {};
  for (const [field, types] of Object.entries(PRIORITY)) {
    for (const type of types) {
      const hit = read.filter((r) => r.docType === type && r.text).map((r) => [r, EXTRACTORS[field](r)]).find(([, v]) => v !== undefined);
      if (hit) {
        values[field] = hit[1];
        sources[field] = hit[0].doc.id;
        break;
      }
    }
  }
  if (values.currentAddress) {
    for (const [k, v] of Object.entries(cityProvince(values.currentAddress))) {
      values[k] = v;
      sources[k] = sources.currentAddress;
    }
  }
  return { values, sources };
}

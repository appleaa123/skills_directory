import { makeFlag } from '../flags.js';

const AMOUNT = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g;
const GROSS_ROW = /gross(?: pay| earnings| amount)?|total earnings/i; // a bare "earnings" row is often one line item
const NET_ROW = /\bnet(?: pay| amount| earnings)?\b/i;
const NEXT_LABEL = /[A-Za-z]{2,}/;
const MIN_GROSS_AMOUNTS = 2; // earnings rows end with "current, YTD"; header rows have no amounts
const DATES = [
  /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/g,                       // YYYY-MM-DD
  /\b(\d{2})\/(\d{2})\/(\d{4})\b/g,                           // MM/DD/YYYY
];
const ANY_DATE = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b|\b[A-Za-z]{3,9}\.? \d{1,2}, \d{4}\b/g;

const money = (s) => Number(s.replace(/,/g, ''));
/** Amounts right after the label, stopping at the next text label (two-column stubs share a row). */
function amountsAfter(line, label) {
  const m = line.match(label);
  if (!m) return [];
  const rest = line.slice(m.index + m[0].length);
  const stop = rest.search(NEXT_LABEL);
  return [...(stop < 0 ? rest : rest.slice(0, stop)).matchAll(AMOUNT)].map((a) => money(a[1]));
}

/** Gross: first explicitly labelled gross row with >= 2 amounts (current, YTD); first is current. */
function grossOf(lines) {
  const row = lines.map((l) => amountsAfter(l, GROSS_ROW)).find((a) => a.length >= MIN_GROSS_AMOUNTS);
  return row ? { gross: row[0] } : {};
}

/** Net: first net row with amounts; first is current, second (if any) is YTD. */
function netOf(lines) {
  const row = lines.map((l) => amountsAfter(l, NET_ROW)).find((a) => a.length);
  return row ? { net: row[0], netYtd: row[1] } : {};
}

function latestDate(text) {
  const times = [];
  for (const m of text.matchAll(DATES[0])) times.push(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  for (const m of text.matchAll(DATES[1])) times.push(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  return times.length ? Math.max(...times) : null;
}

const PAY_DATE_ROW = /pay date|pay period|period end|period ending|cheque date|deposit date/i;

function parse({ id, text, group = 'all' }) {
  const lines = text.split('\n');
  const { gross } = grossOf(lines);
  const { net, netYtd } = netOf(lines);
  const dateLine = lines.find((l) => PAY_DATE_ROW.test(l));
  return { id, group, gross, net, ytd: netYtd, date: dateLine ? latestDate(dateLine) : null, body: text.replace(ANY_DATE, '').replace(/\s+/g, ' ').trim() };
}

const sameYear = (a, b) => new Date(a).getUTCFullYear() === new Date(b).getUTCFullYear();

/** Consistency checks across a set of paystubs (local only). */
export function checkPaystubs(stubs) {
  const parsed = stubs.map(parse);
  const flags = [];
  for (const p of parsed) {
    if (p.net === undefined) flags.push(makeFlag('PAYSTUB_UNPARSEABLE', p.id));
    else if (p.gross !== undefined && p.net > p.gross) flags.push(makeFlag('PAYSTUB_NET_EXCEEDS_GROSS', p.id));
  }
  parsed.forEach((a, i) => parsed.slice(i + 1).forEach((b) => {
    if (a.body === b.body && a.date !== b.date) flags.push(makeFlag('PAYSTUB_DUPLICATE_EXCEPT_DATES', b.id));
  }));
  // YTD only progresses within one employer's stubs.
  for (const group of new Set(parsed.map((p) => p.group))) {
    const dated = parsed.filter((p) => p.group === group && p.date !== null && p.ytd !== undefined).sort((a, b) => a.date - b.date);
    dated.slice(1).forEach((p, i) => {
      if (p.ytd <= dated[i].ytd && sameYear(p.date, dated[i].date)) flags.push(makeFlag('PAYSTUB_YTD_NOT_INCREASING', p.id));
    });
  }
  return flags;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_FIELDS = ['name', 'dob', 'currentAddress', 'city', 'province', 'country', 'employer', 'title'];
const REFERENCE_FIELDS = ['name', 'phone', 'address'];

function isCalendarDate(s) {
  if (!ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const filled = (v) => typeof v === 'string' && v.trim() !== '';
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => filled(obj?.[k])).map((k) => [k, obj[k].trim()]));

/**
 * @typedef {{name?:string, dob?:string, currentAddress?:string, city?:string, province?:string, country?:string,
 *   employer?:string, title?:string, annualSalary?:number, reference?:{name?:string, phone?:string, address?:string}}} Application
 */

/**
 * Validate the application facts. Every field is optional (fewer facts → fewer cross-checks);
 * blank strings are dropped. Returns a frozen copy.
 */
export function validateApplication(input = {}) {
  const out = pick(input, TEXT_FIELDS);
  if (out.dob !== undefined && !isCalendarDate(out.dob)) throw new Error('dob must be a real date written YYYY-MM-DD');
  if (input.annualSalary !== undefined && input.annualSalary !== null) {
    if (!(Number.isFinite(input.annualSalary) && input.annualSalary > 0)) throw new Error('annualSalary must be a positive number');
    out.annualSalary = input.annualSalary;
  }
  const reference = pick(input.reference, REFERENCE_FIELDS);
  if (Object.keys(reference).length) out.reference = Object.freeze(reference);
  return Object.freeze(out);
}

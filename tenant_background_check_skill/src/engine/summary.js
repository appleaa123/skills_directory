export const SUMMARY_HEADER = 'TENANT CHECK SUMMARY (no sensitive data) — v1';
const RANK = { red: 3, soft: 2, unverifiable: 1, ok: 0 };
const DOC_ID = /^[0-9a-f]{6}$/;
const SOURCE_FIELDS = { name: 'name', dob: 'dob', address: 'currentAddress', employer: 'employer', title: 'title' };
const TYPE_LABEL = { credit_report: 'credit report', paystub: 'paystub', employment_letter: 'employment letter', rental_application: 'rental application', id: 'ID', bank_statement: 'bank statement' };

const worst = (flags) => flags.reduce((w, f) => (RANK[f.severity] > RANK[w] ? f.severity : w), 'ok');

/**
 * The ONLY object that may leave the machine. Built field by field from the allowlist
 * (spec §5); never spread `state` or `app` into it.
 */
export function buildSummary(state, app) {
  const ref = app.reference;
  return {
    version: 1,
    applicant: { name: app.name ?? null, city: app.city ?? null, province: app.province ?? null, country: app.country ?? null, employer: app.employer ?? null, title: app.title ?? null },
    letterhead: {
      ...(state.letterhead?.emailDomain && { emailDomain: state.letterhead.emailDomain }),
      ...(state.letterhead?.officeAddress && { officeAddress: state.letterhead.officeAddress }),
    },
    reference: ref ? { name: ref.name ?? null, phone: ref.phone ?? null, address: ref.address ?? null } : null,
    documents: state.docs.map((d) => ({
      id: d.id, docType: d.docType, styleId: d.styleId,
      verdict: worst(state.flags.filter((f) => f.docId === d.id)),
    })),
    flags: state.flags.map((f) => ({ code: f.code, severity: f.severity, docId: f.docId, message: f.message })),
    identity: state.identity.map((r) => ({ field: r.field, docId: r.docId, status: r.status })),
    sources: Object.fromEntries(Object.entries(SOURCE_FIELDS)
      .map(([field, key]) => [field, state.sources?.[key]]).filter(([, id]) => DOC_ID.test(id ?? ''))),
    salaryVerdict: state.salaryVerdict ?? null,
  };
}

const NOT_GIVEN = 'not provided';
const line = (label, value) => (value ? `${label}: ${value}` : null);
const given = (label, value) => `${label}: ${value || NOT_GIVEN}`;

function fromDoc(s, field) {
  const id = s.sources?.[field];
  if (!id) return '';
  const type = s.documents.find((d) => d.id === id)?.docType;
  return ` (value from ${TYPE_LABEL[type] ?? 'document'} ${id})`;
}

/** Plain-text summary for pasting into an AI assistant. */
export function renderSummaryText(s) {
  const a = s.applicant;
  const out = [
    SUMMARY_HEADER,
    '',
    'PUBLIC FACTS (may be searched)',
    given('Applicant', a.name), given('Location', [a.city, a.province, a.country].filter(Boolean).join(', ')),
    given('Employer', a.employer), given('Job title', a.title),
    line('Letterhead email domain', s.letterhead.emailDomain), line('Letterhead office address', s.letterhead.officeAddress),
    ...(s.reference ? [line('Landlord reference', s.reference.name), line('Reference phone', s.reference.phone), line('Reference address', s.reference.address)] : []),
    '',
    'DOCUMENTS',
    ...s.documents.map((d) => `- ${d.id} ${d.docType}${d.styleId ? ` (${d.styleId})` : ''}: ${d.verdict.toUpperCase()}`),
    '',
    'FLAGS',
    ...(s.flags.length ? s.flags.map((f) => `- [${f.severity.toUpperCase()}] ${f.docId ?? 'package'} ${f.code}: ${f.message}`) : ['- none']),
    '',
    'CROSS-DOCUMENT CHECKS (application vs documents)',
    ...(s.identity.length ? s.identity.map((r) => `- ${r.field} in ${r.docId}: ${r.status}${fromDoc(s, r.field)}`) : ['- none']),
    '',
    line('Salary vs typical range for this title', s.salaryVerdict) ?? 'Salary vs typical range: not checked yet (research the range, then run the salary check locally)',
    '',
    'Note: flags mean "found" or "not found"; no check proves a document is real.',
    'Details left blank in the checker mean fewer cross-checks, not a problem with the applicant.',
  ];
  return out.filter((l) => l !== null).join('\n');
}

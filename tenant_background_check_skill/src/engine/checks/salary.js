/** Where an annual salary falls against a researched range. Runs locally; the salary never leaves. */
export function compareSalary(annualSalary, { low, high }) {
  if (annualSalary < low) return 'below';
  return annualSalary > high ? 'above' : 'within';
}

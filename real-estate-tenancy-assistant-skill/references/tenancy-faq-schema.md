# Tenancy FAQ Output Schema

## Fields

- **`answer`** (string, required) — a direct answer to the question, in
  plain language.
- **`legal_references`** (array of strings, required, may be empty) —
  applicable laws, statutes, or regulation names if known (e.g. "California
  Civil Code § 827 (rent increase notice requirements)"). Leave empty rather
  than inventing a citation you're not confident in.
- **`regional_specifics`** (string or null, required) — jurisdiction-
  dependent detail, `null` if no location was given or the topic isn't
  jurisdiction-sensitive.
- **`disclaimer`** (string, required, fixed text) — always exactly: "This is
  general information, not professional legal advice. Consult a local
  attorney or tenant rights organization for guidance specific to your
  situation."
- **`additional_resources`** (array of strings, required, may be empty) —
  organizations or resource types the user could contact (e.g. "local
  tenant rights hotline", "state department of consumer affairs").

## Grounding rule

Tenancy law varies significantly by state/country and changes over time. If
a web-search tool is available, use it to verify jurisdiction-specific
claims (notice periods, deposit caps, eviction rules) rather than asserting
them from memory — cite what you found in `legal_references`. If no
web-search tool is available, answer with general principles and flag in
`answer` that the user should verify current local rules.

## Worked example

**Input**: "Can my landlord raise my rent mid-lease without notice? I'm in
California."

```json
{
  "answer": "Generally no — during a fixed-term lease, your landlord cannot raise the rent unless the lease itself allows for it (e.g. an escalation clause). Once the lease converts to month-to-month, California law requires written notice before a rent increase can take effect.",
  "legal_references": ["California Civil Code § 827"],
  "regional_specifics": "California requires 30 days' written notice for rent increases of 10% or less, and 90 days' notice for increases greater than 10%, for month-to-month tenancies. Some California cities also have local rent control ordinances that may impose stricter limits.",
  "disclaimer": "This is general information, not professional legal advice. Consult a local attorney or tenant rights organization for guidance specific to your situation.",
  "additional_resources": ["California Department of Consumer Affairs tenant guide", "local tenant rights organization"]
}
```

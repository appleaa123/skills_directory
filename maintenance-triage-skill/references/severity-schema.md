# Severity Assessment Schema

Ported from opsly's `vision.service.ts` output contract: "reasoning in the
prompt, schema handles output format" — analyze thoroughly, then constrain
the output to these 7 fields.

## Fields

- **`damageType`** (string, required) — category, e.g. `water_leak`,
  `electrical_fault`, `mold`, `structural_crack`, `hvac_failure`, `pest`,
  `cosmetic`.
- **`severity`** (`LOW` | `MEDIUM` | `HIGH`, required).
- **`confidence`** (float 0.0-1.0, required) — how confident the assessment
  is, given the available evidence. Lower when working from description
  alone vs. a clear photo.
- **`observations`** (array of 3-5 strings, required) — specific details
  supporting the assessment (e.g. "water staining spans roughly 30cm across
  the ceiling", "no visible mold growth yet, but conditions are damp").
- **`recommendedPriority`** (`LOW` | `MEDIUM` | `HIGH` | `URGENT`, required)
  — derived from severity + danger level per
  `references/priority-decision-tree.md`, not from severity alone (a HIGH
  severity issue with active danger becomes URGENT priority).
- **`specialistRequired`** (boolean, required) — whether a licensed
  professional (plumber, electrician, etc.) is needed, vs. something
  maintenance staff can handle directly.
- **`estimatedCategory`** (string, required) — maintenance dispatch
  category: `plumbing`, `electrical`, `hvac`, `structural`, `pest_control`,
  or `other`.

## Fallback behavior

If assessment is impossible (no useful description, no photo, or the input
is out of scope), return a minimal assessment with `severity: MEDIUM`,
`confidence: 0.3`, `estimatedCategory: other`, and an `observations` entry
explaining what's missing — never fabricate specific details you don't
have evidence for.

## Worked example

**Input**: "I smell gas near the stove, it's been going on for an hour."

```json
{
  "damageType": "gas_leak_suspected",
  "severity": "HIGH",
  "confidence": 0.6,
  "observations": [
    "Tenant reports a persistent gas smell near the stove for about an hour",
    "No photo provided — assessment relies on tenant's description only",
    "Gas odor near an appliance is a recognized indicator of a possible leak"
  ],
  "recommendedPriority": "URGENT",
  "specialistRequired": true,
  "estimatedCategory": "other"
}
```

Note `recommendedPriority` is URGENT despite `severity: HIGH` — active gas
danger overrides the severity-only mapping per the priority decision tree.

## Worked example — vague input (fallback case)

**Input**: "Something's off with the AC." No photo, no further detail.

This is exactly the case the Fallback behavior rule above covers. The
correct response is still the same 7 fields, same names, same casing — NOT
a different report shape, and NOT extra fields like "RecommendedAction" or
"UrgencyReason":

```json
{
  "damageType": "hvac_malfunction_unspecified",
  "severity": "MEDIUM",
  "confidence": 0.3,
  "observations": [
    "Tenant description is too vague to identify a specific fault (no symptoms like noise, temperature, or airflow mentioned)",
    "No photo provided",
    "HVAC issues can escalate in extreme weather, so follow-up for specifics is warranted"
  ],
  "recommendedPriority": "MEDIUM",
  "specialistRequired": false,
  "estimatedCategory": "hvac"
}
```

Getting more detail from the tenant is a good next step to suggest in your
response text, but it does NOT change the required output shape above.

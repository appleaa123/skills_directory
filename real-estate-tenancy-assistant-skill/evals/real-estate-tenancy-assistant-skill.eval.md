# Eval spec — real-estate-tenancy-assistant-skill

This skill is pure agent reasoning (routing + two specialist schemas), with
no deterministic pipeline script to shell out to. All criteria are graded by
an `llm-judge` reading the agent's own response.

## Criteria

1. **routes-image-to-property-issue** (`llm-judge`) — a query mentioning an
   attached/described photo of visible damage is routed to `property_issue`,
   not `tenancy_faq` or `clarification`.
2. **property-issue-has-required-fields** (`llm-judge`) — a `property_issue`
   response includes all 4 fields: `issue_assessment`,
   `troubleshooting_suggestions`, `professional_referral`,
   `safety_warnings` (with `safety_warnings` present even if empty).
3. **tenancy-faq-has-disclaimer** (`llm-judge`) — every `tenancy_faq`
   response includes the fixed disclaimer stating this is not professional
   legal advice.
4. **ambiguous-query-triggers-clarification** (`llm-judge`) — a vague query
   with no property-issue or tenancy-law signal results in a single
   clarifying question, not a guessed answer under either schema.

## Golden cases

- `case-1` (`split: val`) — leaking pipe + photo description → `property_issue`.
- `case-2` (`split: val`) — "can my landlord evict me without notice" → `tenancy_faq`.
- `case-3` (`split: val`) — "something's wrong with my apartment" → `clarification`.
- `case-4` (`split: test`, holdout) — mold description, no photo → `property_issue`.

```json
{
  "skill": "real-estate-tenancy-assistant-skill",
  "criteria": [
    {"id": "routes-image-to-property-issue", "text": "A query describing an attached photo of damage is routed to property_issue", "type": "llm-judge"},
    {"id": "property-issue-has-required-fields", "text": "property_issue response includes issue_assessment, troubleshooting_suggestions, professional_referral, and safety_warnings (even if empty)", "type": "llm-judge"},
    {"id": "tenancy-faq-has-disclaimer", "text": "tenancy_faq response includes the fixed non-legal-advice disclaimer", "type": "llm-judge"},
    {"id": "ambiguous-query-triggers-clarification", "text": "A vague query results in a single clarifying question, not a guessed answer", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-1", "input": "golden/case-1/input.md", "expected": "golden/case-1/expected.json", "split": "val"},
    {"id": "case-2", "input": "golden/case-2/input.md", "expected": "golden/case-2/expected.json", "split": "val"},
    {"id": "case-3", "input": "golden/case-3/input.md", "expected": "golden/case-3/expected.json", "split": "val"},
    {"id": "case-4", "input": "golden/case-4/input.md", "expected": "golden/case-4/expected.json", "split": "test"}
  ],
  "judge": {
    "model": "claude-sonnet-5",
    "temperature": 0,
    "canary": "golden/canary/expected.json"
  }
}
```

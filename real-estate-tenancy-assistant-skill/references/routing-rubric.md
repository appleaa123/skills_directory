# Routing Rubric

## Decision order

1. **Image attached?** → almost always `property_issue`, even if the
   accompanying text is sparse. A photo of visible damage is strong signal.
2. **Keyword scan** — does the text mention: leak, crack, mold, damp, stain,
   electrical, wiring, outlet, plumbing, pipe, drain, HVAC, heating, cooling,
   structural, ceiling, wall, floor, cosmetic, paint, damage, broken, not
   working? → `property_issue`
3. **Keyword scan** — does the text mention: rent, lease, deposit, eviction,
   notice period, landlord obligation, tenant rights, sublet, renewal,
   termination, habitability, rent control, discrimination? → `tenancy_faq`
4. **Neither matched clearly, or the query is a single vague sentence with
   no specifics** (e.g. "something's wrong with my apartment", "need help",
   "my landlord is being difficult") → `clarification`. Ask one targeted
   question that would disambiguate, for example: "Could you tell me more —
   is this about a physical issue with the property (like damage or a
   repair need), or a question about your lease terms or rights as a
   tenant?"

## Priority rule

If both property-issue and tenancy-law signals appear in the same message
(e.g. "there's mold and my landlord won't fix it, is that legal?"), route to
`property_issue` first (diagnose the physical issue), and mention in the
response that a follow-up tenancy_faq question about landlord obligations
can be asked next — don't try to answer both schemas in one response.

## Worked examples

- "There's water pooling under my kitchen sink and the cabinet wood looks
  warped." + photo → `property_issue`
- "Can my landlord raise my rent mid-lease without notice? I'm in
  California." → `tenancy_faq`
- "Something's wrong with my apartment, not sure what to do." →
  `clarification`
- "The ceiling in my bedroom has a brown stain that's getting bigger." →
  `property_issue`
- "What's the standard notice period for ending a month-to-month lease?" →
  `tenancy_faq`

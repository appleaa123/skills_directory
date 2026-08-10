# Property Issue Output Schema

## Fields

- **`issue_assessment`** (string, required) — detailed description of what
  the issue appears to be, drawing on both the tenant's description and any
  photo observations. Name the likely cause where inferable (e.g. "water
  staining consistent with a slow leak from the pipe above, not surface
  condensation").
- **`troubleshooting_suggestions`** (array of strings, required) — concrete,
  actionable steps the tenant/landlord can take before or instead of
  calling a professional (e.g. "shut off the water supply valve under the
  sink if accessible", "take photos dated for insurance/maintenance
  records").
- **`professional_referral`** (string, required) — which type of specialist
  should be contacted (e.g. "licensed plumber", "electrician", "mold
  remediation specialist", or "none needed — cosmetic only").
- **`safety_warnings`** (array of strings, required, may be empty) — any
  active hazard the user should act on immediately (e.g. "if you smell gas,
  leave the unit and call your gas utility's emergency line before doing
  anything else"). Empty array `[]` if no immediate hazard, never omitted.

## Categories to consider

Moisture (leaks, damp, mold), structural (cracks, sagging, foundation),
electrical (outlets, wiring, flickering lights), plumbing (drains, pipes,
water pressure), environmental (pests, ventilation, air quality), cosmetic
(paint, minor wear).

## Worked example

**Input**: "There's water pooling under my kitchen sink and the cabinet
wood looks warped."

```json
{
  "issue_assessment": "The pooling water and warped cabinet wood suggest an active or recent leak from the sink's supply line or drain trap, not condensation. Warping indicates prolonged moisture exposure rather than a one-time spill.",
  "troubleshooting_suggestions": [
    "Shut off the water supply valves under the sink if accessible",
    "Place a towel or shallow container to catch further dripping",
    "Photograph the pooling and warped wood with today's date for maintenance/insurance records",
    "Check whether the cabinet base or adjacent flooring feels soft, which would indicate the leak has been ongoing"
  ],
  "professional_referral": "licensed plumber",
  "safety_warnings": []
}
```

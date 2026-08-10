# Priority Decision Tree

Ported verbatim from opsly's `triage.prompt.ts`.

## Rules, in order of precedence

1. **URGENT** — active water/gas/electrical danger, safety risk. Always
   URGENT regardless of how "minor" the visible damage looks, if there is
   an active hazard (running water, gas smell, exposed live wiring, smoke).
2. **HIGH** — significant damage but no immediate danger (large water
   stain with no active leak, cracked structural element that appears
   stable, non-functioning HVAC in extreme weather).
3. **MEDIUM** — moderate issue, no photo provided, or severity is unclear
   from the available information. **This is the default when you cannot
   confidently place the issue in URGENT, HIGH, or LOW.**
4. **LOW** — cosmetic or minor convenience issue (paint chipping, a loose
   cabinet handle, a squeaky door).

## Decision process

1. If a photo is available, assess visible severity first.
2. Read the tenant's description for active vs. minor language ("still
   leaking" vs. "noticed a small stain last week").
3. Check explicitly for safety implications: water + electrical proximity,
   gas odor, exposed wiring, structural instability → these always push to
   URGENT regardless of other factors.
4. If none of the above clearly apply, default to MEDIUM rather than
   guessing between LOW and HIGH.

## SLA response windows by priority

| Priority | SLA hours |
|----------|-----------|
| URGENT   | 2         |
| HIGH     | 4         |
| MEDIUM   | 24        |
| LOW      | 72        |

These are the exact thresholds `scripts/sla.py` uses — do not restate them
manually in a response; call the script.

## Worked examples

- "Active water leak under the sink, water actively dripping right now" →
  URGENT (active water danger)
- "Large water stain on the ceiling, dry now, first noticed 3 days ago" →
  HIGH (significant, no active danger)
- "Something's off with the AC, not sure what" (no photo) → MEDIUM (default,
  unclear severity)
- "Small paint chip on the hallway wall" → LOW (cosmetic)

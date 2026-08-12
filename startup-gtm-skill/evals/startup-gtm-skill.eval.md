# startup-gtm-skill eval spec

This skill is conversational/interactive (it interviews a founder and fills
in a document per mode), so there is no single deterministic `run` command —
per the factory's orchestration contract, interactive skills omit `run` and
the rollout harness stays unavailable (`--rollout` prints "rollout
unavailable" and exits 0, which is not a failure).

What *is* checkable deterministically is the skill's shipped contract: each
mode's output template (`assets/*.md`) must contain the exact section
structure `SKILL.md` promises, since the agent is instructed to match that
structure exactly when it fills a document in for a founder. The first 6
binary criteria below each grep one template file for its required section
headers. Two more check that the whole-framework reference layers added
later (`patterns.md`, `cheatsheet.md`) exist and clear a minimum density
floor, as a cheap guard against either file regressing to a stub.

The golden cases are one sample founder-context input per mode (a fictional
support-thread-summarizer B2B SaaS product), seeded so a future maintainer
has a concrete case to generate against and manually promote a baseline for,
rather than starting from nothing. `case-hiring` is held out as the `test`
split.

```json
{
  "skill": "startup-gtm-skill",
  "criteria": [
    {"id": "narrative-template-sections", "text": "narrative-onepager-template.md has all 8 required sections", "type": "command", "cmd": "grep -q '## Problem' assets/narrative-onepager-template.md && grep -q '## Who Has This Pain' assets/narrative-onepager-template.md && grep -q \"## What's Changed\" assets/narrative-onepager-template.md && grep -q '## Cost of the Problem' assets/narrative-onepager-template.md && grep -q '## Current (Insufficient) Solutions' assets/narrative-onepager-template.md && grep -q '## Our Solution' assets/narrative-onepager-template.md && grep -q '## Proof' assets/narrative-onepager-template.md && grep -q '## Pricing Recommendation' assets/narrative-onepager-template.md"},
    {"id": "icp-template-sections", "text": "icp-doc-template.md has all 7 required sections", "type": "command", "cmd": "grep -q '## Pain Point Definition' assets/icp-doc-template.md && grep -q '## Firmographic Criteria' assets/icp-doc-template.md && grep -q '## Technographic / Behavioral Signals' assets/icp-doc-template.md && grep -q '## Account Sizing Tier' assets/icp-doc-template.md && grep -q '## Primary Point of Contact' assets/icp-doc-template.md && grep -q '## Complementary Decision-Makers' assets/icp-doc-template.md && grep -q '## Data Sources to Use for Sourcing' assets/icp-doc-template.md"},
    {"id": "outreach-template-sections", "text": "outreach-and-demo-template.md has all 5 required sections", "type": "command", "cmd": "grep -q '## Cold Email #1' assets/outreach-and-demo-template.md && grep -q '## Cold Email #2' assets/outreach-and-demo-template.md && grep -q '## Follow-up Call Talking Points' assets/outreach-and-demo-template.md && grep -q '## Outreach Cadence' assets/outreach-and-demo-template.md && grep -q '## Demo Script Outline' assets/outreach-and-demo-template.md"},
    {"id": "objection-template-sections", "text": "objection-playbook-template.md covers all 7 generic objection categories", "type": "command", "cmd": "grep -q 'Decision-Making Authority' assets/objection-playbook-template.md && grep -q 'Lack of Need' assets/objection-playbook-template.md && grep -q 'Fear of Change' assets/objection-playbook-template.md && grep -q 'Timing is Bad' assets/objection-playbook-template.md && grep -q 'Price / Value' assets/objection-playbook-template.md && grep -q 'Budgeting Challenges' assets/objection-playbook-template.md && grep -q 'Reluctance' assets/objection-playbook-template.md"},
    {"id": "closing-template-sections", "text": "closing-playbook-template.md has all 5 required sections", "type": "command", "cmd": "grep -q '## Negotiation Priorities' assets/closing-playbook-template.md && grep -q 'Shorter-Duration Pricing' assets/closing-playbook-template.md && grep -q '## Close-Winning Checklist' assets/closing-playbook-template.md && grep -q '## Win/Loss Capture Fields' assets/closing-playbook-template.md && grep -q '## Pipeline Stage Definitions' assets/closing-playbook-template.md"},
    {"id": "hiring-template-sections", "text": "hiring-onboarding-template.md has all 5 required sections", "type": "command", "cmd": "grep -q 'Readiness Check' assets/hiring-onboarding-template.md && grep -q 'Role Profile' assets/hiring-onboarding-template.md && grep -q 'Sourcing Plan' assets/hiring-onboarding-template.md && grep -q 'Interview' assets/hiring-onboarding-template.md && grep -qi '30/60/90' assets/hiring-onboarding-template.md"},
    {"id": "patterns-file-substantial", "text": "patterns.md exists, has >=15 named patterns, and isn't a stub", "type": "command", "cmd": "test -f patterns.md && [ \"$(grep -c '^## ' patterns.md)\" -ge 15 ] && [ \"$(wc -w < patterns.md)\" -gt 800 ]"},
    {"id": "cheatsheet-file-substantial", "text": "cheatsheet.md exists, has its 3 required sections, and isn't a stub", "type": "command", "cmd": "test -f cheatsheet.md && grep -q '## Decision Rules' cheatsheet.md && grep -qi 'Threshold' cheatsheet.md && [ \"$(wc -w < cheatsheet.md)\" -gt 500 ]"}
  ],
  "golden": [
    {"id": "case-narrative", "input": "golden/case-narrative/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-icp", "input": "golden/case-icp/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-outreach", "input": "golden/case-outreach/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-objections", "input": "golden/case-objections/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-closing", "input": "golden/case-closing/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-hiring", "input": "golden/case-hiring/input.md", "expected": null, "split": "test", "expected_status": "pending-first-green"}
  ]
}
```

## Using this spec

- `python3 scripts/run_evals.py --validate` — confirm the spec is well-formed.
- `python3 scripts/run_evals.py` — run the 6 structural checks against the
  shipped templates.
- The golden cases have no `run` command to execute automatically. To use one:
  paste `evals/golden/<case-id>/input.md` into a `/startup-gtm-skill`
  conversation, save the agent's filled-in document as
  `evals/golden/<case-id>/expected.md`, and it becomes a manual regression
  baseline for that mode.

# startup-gtm-skill

## Purpose

Helps startup founders and first-time sales reps build founder-led
go-to-market fundamentals, grounded in a proven early-stage go-to-market
framework: sales narrative & pricing, ICP & prospecting, cold outreach &
demo scripts, objection-handling playbooks, negotiation/closing/pipeline
management, and first sales-hire hiring/onboarding plans.

## Activation triggers

Invoke when the user asks for help with any of:
- Writing a sales narrative or figuring out pricing
- Defining an ideal customer profile (ICP) or prospecting criteria
- Writing cold outreach emails, call scripts, or a demo script
- Handling recurring sales objections
- Negotiating deal terms, closing, or managing a sales pipeline
- Hiring or onboarding their first salesperson

Also triggers on: "founder-led sales", "startup go-to-market", "first sales hire",
"sales onboarding plan".

## Usage

```
/startup-gtm-skill <what you need help with>
```

Example: `/startup-gtm-skill help me write cold outreach emails for my
first 10 prospects`

The skill has 6 modes (see `SKILL.md` for the full routing table): Narrative
& Pricing, ICP & Prospecting, Outreach & Demo Scripts, Objection Playbook,
Closing & Pipeline, Hiring & Onboarding. It interviews the founder about
their specific product and situation, then produces a tailored markdown
document per mode using the framework's methodology — never generic
sales-training filler, and never invented facts about the founder's business.

## Full details

See `SKILL.md` for the complete mode table, workflow, reference/template file
map, and ground rules. See `references/*.md` for the digested methodology per
mode and `assets/*.md` for the output document templates.

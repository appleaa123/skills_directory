# AGENTS.md — real-estate-tenancy-assistant-skill

## Purpose

Routes landlord/tenant/property-manager queries to either a property-issue
diagnosis path (troubleshooting, photo-based damage assessment,
professional referral, safety warnings) or a tenancy-law FAQ path (rights,
rent, lease terms, eviction, deposits), asking a clarifying question when
ambiguous. Inspired by the actual multi-agent code in
[Kaos599/PropertyLoop](https://github.com/Kaos599/PropertyLoop) (router +
2 specialist agents + clarification — note the source README describes 5
agents, but only these are implemented in code), reimplemented so routing
and answering are performed by the invoking agent directly — no LLM API
key, no vector DB, no LangGraph runtime required.

## Activation

Trigger this skill when the user asks to: diagnose a property issue from a
description or photo, get troubleshooting suggestions for property damage,
ask a tenant/landlord rights question, ask about lease terms/eviction/
deposits, or build a real estate assistant chatbot.

## Usage

See `SKILL.md` for the full workflow. Summary: classify the query as
`property_issue`, `tenancy_faq`, or `clarification` per
`references/routing-rubric.md`. For `property_issue`, output the 4-field
schema in `references/property-issue-schema.md`. For `tenancy_faq`, output
the 5-field schema in `references/tenancy-faq-schema.md` (always including
the fixed legal disclaimer), grounding jurisdiction-specific claims via a
web-search tool when available. For `clarification`, ask one targeted
follow-up question instead of guessing.

## Key files

- `SKILL.md` — full instructions and the router decision workflow
- `references/routing-rubric.md` — router decision rules with worked examples
- `references/property-issue-schema.md` — property issue output schema + worked example
- `references/tenancy-faq-schema.md` — tenancy FAQ output schema + worked example

## Source

Inspired by https://github.com/Kaos599/PropertyLoop (no declared license on
the source repo; no source code copied — reimplemented from the observed
agent behavior in `Chatbot/agents.py`, `graph.py`, `schemas.py`. See
`LICENSE`).

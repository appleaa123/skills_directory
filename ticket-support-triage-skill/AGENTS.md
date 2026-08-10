# AGENTS.md — ticket-support-triage-skill

## Purpose

Classifies a customer support ticket (sentiment + issue type) and drafts an
empathetic, professional reply. Inspired by the observed workflow of
[ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP](https://github.com/ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP),
reimplemented so the classification and reply drafting are performed by the
invoking agent's own reasoning instead of requiring a Groq API key — no
external LLM provider, no onboarding.

## Activation

Trigger this skill when the user asks to: classify a support ticket, triage
customer support messages, draft a reply to a customer, sort tickets by
sentiment or category, or automate a customer support inbox workflow.

## Usage

See `SKILL.md` for the full workflow. Summary: for each ticket, classify
`sentiment` (Positive/Negative/Neutral) and `issue_type`
(Billing/Technical/Login/General/Other) per `references/classification-rubric.md`,
then draft a reply per `references/reply-tone-guide.md`, then return the
structured record. Sending email or logging to CSV are optional steps, only
run if the user explicitly asks — `scripts/send_email_smtp.py` (requires
SMTP env vars) and `scripts/log_to_csv.py` (no credentials needed).

## Key files

- `SKILL.md` — full instructions and the classify → draft → (optional deliver) workflow
- `references/classification-rubric.md` — sentiment/issue_type decision rules with worked examples
- `references/reply-tone-guide.md` — tone, structure, and a worked reply example
- `scripts/send_email_smtp.py` — optional SMTP delivery
- `scripts/log_to_csv.py` — optional local CSV logging

## Source

Inspired by https://github.com/ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP
(no declared license on the source repo; no source code copied — see `LICENSE`).

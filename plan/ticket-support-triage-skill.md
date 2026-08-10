# Implementation Plan: ticket-support-triage-skill

Source repo: https://github.com/ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP

## Purpose
Given a raw customer support message (+ customer name, + optional email), classify it and draft a reply — no external LLM API key required, the host agent does the reasoning itself.

## Core workflow (ported from mcp_server.py's resolve_ticket order)
1. **Classify**: sentiment ∈ {Positive, Negative, Neutral}, issue_type ∈ {Billing, Technical, Login, General, Other} — ported from tools/classify_ticket.py's category set and JSON output shape. Fallback values ("Unknown"/"General") if classification is ambiguous.
2. **Draft reply**: personalized greeting (customer name) + empathetic body addressing the issue + fixed closing "Best regards, Customer Support Team" — ported from tools/generate_reply.py's template and tone (friendly/professional support agent persona).
3. **Structured output**: return `{name, email, message, sentiment, issue_type, draft_reply}` as the ticket record.

## Optional integrations (explicitly optional, not required for core workflow)
- `scripts/send_email_smtp.py` — sends draft_reply via SMTP. Requires env vars SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD. Ported from tools/gmail_sender.py logic (generalized from Gmail-specific to any SMTP provider, since "no API connections/onboarding" rules out requiring a Gmail OAuth app).
- `scripts/log_to_csv.py` — appends ticket record to a local CSV (ported/simplified from tools/sheet_connector.py's Google Sheets logging, swapped to local CSV to avoid requiring Google API onboarding). No credentials needed.

## SKILL.md structure
- Frontmatter: name `ticket-support-triage-skill`, description covering triggers ("classify support ticket", "draft support reply", "customer support automation", "ticket sentiment analysis")
- Trigger section with example invocations
- Step-by-step classify → draft → (optional log/send) workflow instructions
- Explicit note: classification and reply generation are performed by the invoking agent directly — no API key setup needed

## Eval criteria (Phase 2 of agent-skill-creator)
- Binary check: output includes all 6 fields (name, email, message, sentiment, issue_type, draft_reply)
- Binary check: sentiment is one of the 3 valid values; issue_type is one of the 5 valid values
- Binary check: draft_reply ends with the fixed closing line
- Golden cases: 3+ sample tickets (billing complaint/negative, login issue/neutral, positive feedback/general) with expected classification
- 1 holdout/test-split case

## Architecture
Simple skill. Directory: `ticket-support-triage-skill/` with SKILL.md, AGENTS.md, scripts/{send_email_smtp.py, log_to_csv.py}, references/ (classification rubric, reply tone guide), assets/ (sample tickets), evals/, install.sh, README.md, .claude-plugin/.

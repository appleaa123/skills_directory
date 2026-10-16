---
name: ticket-support-triage-skill
description: >-
  Classifies a customer support ticket by sentiment and issue type, then
  drafts an empathetic professional reply. Use for customer support
  automation, ticket triage, drafting support replies, classifying ticket
  sentiment, or building a support inbox workflow. Triggers on phrases like
  "classify this support ticket", "draft a reply to this customer", "triage
  this ticket", "customer support automation", "sort tickets by sentiment
  and category". No external API keys required — classification and reply
  drafting are performed by the invoking agent directly.
license: MIT
activation: /ticket-support-triage-skill
provenance:
  maintainer: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  source_references:
    - https://github.com/ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP
metadata:
  author: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  last_reviewed: 2026-08-10
  review_interval_days: 90
---
# /ticket-support-triage-skill — Customer Support Ticket Triage & Reply Drafting

You are a customer support triage assistant. Given a raw support message, you
classify it and draft a reply — using your own reasoning, not an external API.

## Trigger

User invokes `/ticket-support-triage-skill` followed by a ticket, or a batch of tickets:

```
/ticket-support-triage-skill Name: Jordan Lee, Email: jordan@example.com
Message: "I was charged twice for my subscription this month and nobody has responded to my emails. This is really frustrating."

/ticket-support-triage-skill Here are 5 tickets from today's inbox: [...]. Classify and draft replies for all of them.

/ticket-support-triage-skill classify this ticket and draft a reply: "How do I reset my password? I can't find the link."
```

## Workflow

For each ticket, follow this sequence exactly (ported from the source project's
`classify → generate → [log] → [send]` pipeline):

### Step 1 — Classify

Read the ticket message and assign:

- **`sentiment`**: one of `Positive`, `Negative`, `Neutral`
- **`issue_type`**: one of `Billing`, `Technical`, `Login`, `General`, `Other`

Use the rubric in `references/classification-rubric.md`. If the message is too
ambiguous to classify confidently, default to `sentiment: Neutral`,
`issue_type: General` rather than guessing wildly — this mirrors the source
project's fallback behavior.

### Step 2 — Draft a reply

Write a reply following the tone and structure in `references/reply-tone-guide.md`:

1. A personalized greeting using the customer's first name (or "there" if no name given)
2. A response that directly addresses their issue with empathy
3. A closing signature. Copy these two lines **character-for-character, verbatim** —
   do not paraphrase, shorten, or drop the word "Customer":
   ```
   Best regards,
   Customer Support Team
   ```
   Writing "Support Team" or "The Support Team" or any other variant instead
   of "Customer Support Team" is a failure of this step.

Keep the reply focused — roughly 80-150 words, no filler.

### Step 3 — Return the structured record

Output:

```json
{
  "name": "...",
  "email": "...",
  "message": "...",
  "sentiment": "Positive | Negative | Neutral",
  "issue_type": "Billing | Technical | Login | General | Other",
  "draft_reply": "..."
}
```

### Step 4 — Optional delivery (only if the user asks)

The core workflow (Steps 1-3) needs no credentials or setup. Only if the user
explicitly asks to actually send the email or log the ticket, use:

- `scripts/send_email_smtp.py` — sends `draft_reply` via SMTP. Requires
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` env vars. If these
  aren't set, tell the user how to set them rather than failing silently.
- `scripts/log_to_csv.py` — appends the ticket record to a local CSV file
  (default `tickets_log.csv` in the current directory). No credentials needed.

Never run these scripts unless the user asks for delivery/logging — drafting
a reply does not imply permission to send it.

## Reference Files

| File | Contents |
|------|----------|
| `references/classification-rubric.md` | Detailed sentiment/issue_type decision rules with examples |
| `references/reply-tone-guide.md` | Tone, structure, and worked examples for drafted replies |

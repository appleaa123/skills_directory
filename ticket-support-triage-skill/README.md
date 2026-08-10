# ticket-support-triage-skill

Classifies a customer support ticket by sentiment (Positive/Negative/Neutral)
and issue type (Billing/Technical/Login/General/Other), then drafts an
empathetic, professional reply — no LLM API key, no onboarding. Inspired by
the observed workflow of
[ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP](https://github.com/ManideepMuddagowni/Customer-Support-Ticket-Automation-Using-AI-Agents-and-MCP),
reimplemented so the invoking agent does the classification and drafting
itself.

## Install

### Claude Code
```bash
cp -R ./ticket-support-triage-skill ~/.claude/skills/ticket-support-triage-skill
```

### GitHub Copilot CLI
```bash
cp -R ./ticket-support-triage-skill ~/.copilot/skills/ticket-support-triage-skill
```

### VS Code Copilot (project-level)
```bash
cp -R ./ticket-support-triage-skill .github/skills/ticket-support-triage-skill
```

### Cursor (project-level only)
```bash
cp -R ./ticket-support-triage-skill .cursor/skills/ticket-support-triage-skill
```

### Any other supported tool
Run `./install.sh` (auto-detects your platform) or `./install.sh --all` to
install everywhere detected.

## Usage

```
/ticket-support-triage-skill Name: Jordan Lee, Email: jordan@example.com
Message: "I was charged twice for my subscription this month and nobody has responded to my emails."

/ticket-support-triage-skill classify and draft a reply: "How do I reset my password?"
```

See `SKILL.md` for the full workflow and `references/` for the classification
rubric and reply tone guide.

## Optional delivery

The core classify+draft workflow needs no setup. If you want to actually send
the reply or log tickets:

```bash
export SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=...
python3 scripts/send_email_smtp.py --to customer@example.com --body-file reply.txt

python3 scripts/log_to_csv.py --name Jordan --email jordan@example.com \
  --message "..." --sentiment Negative --issue-type Billing --reply "..."
```

## Evals

```bash
python3 scripts/run_evals.py --validate
python3 scripts/run_evals.py --judge          # grade the llm-judge criteria
```

## What was reimplemented vs. what changed

- **Reimplemented**: the two-dimension classification (sentiment + issue
  type) and the reply structure (personalized greeting, empathetic body,
  fixed closing signature).
- **Replaced**: the source project's Groq `llama3-70b-8192` API call →
  the invoking agent's own reasoning (no API key required).
- **Generalized**: Gmail-specific sending → generic SMTP
  (`scripts/send_email_smtp.py`); Google Sheets logging → local CSV
  (`scripts/log_to_csv.py`), both optional and off by default.
- **Not ported**: the Streamlit dashboard UI, MCP server wrapper, and
  Google Sheets/Gmail OAuth onboarding — none of that infrastructure is
  needed inside an agent skill.

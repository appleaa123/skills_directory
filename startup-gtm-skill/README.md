# startup-gtm-skill

A founder-led go-to-market advisor grounded in a proven early-stage sales
framework for founders (and others) in first-time sales roles. It
interviews you about your product and situation, then produces a tailored
document using that framework — never generic sales-training filler.

## Modes

| Mode | What you get |
|---|---|
| Narrative & Pricing | Sales narrative one-pager + pricing recommendation |
| ICP & Prospecting | ICP doc + prospecting criteria + contact map |
| Outreach & Demo Scripts | Cold email sequence + demo script |
| Objection Playbook | Objection-response cheat sheet |
| Closing & Pipeline | Negotiation playbook + pipeline stage definitions |
| Hiring & Onboarding | Hiring scorecard + 30/60/90 onboarding plan |

## Reference layers

Beyond the 6 modes, two whole-framework lookup files cover additional
topics (including Mindset, Inbound, Customer Success, and Scaling — areas
with no dedicated mode):

- `patterns.md` — every named technique in the framework (When to use / How /
  Trade-offs)
- `cheatsheet.md` — decision rules, thresholds, and trade-off tables, for a
  fast lookup mid-conversation

## Install

### Claude Code

```bash
git clone <this-repo-url> ~/.claude/skills/startup-gtm-skill
```

Or from within a Claude Code session, use `/plugin marketplace add <this-repo-url>`.

### GitHub Copilot CLI

```bash
git clone <this-repo-url> ~/.copilot/skills/startup-gtm-skill
```

### VS Code Copilot (project-level)

```bash
git clone <this-repo-url> .github/skills/startup-gtm-skill
```

### Cursor (project-level only)

```bash
git clone <this-repo-url> .cursor/skills/startup-gtm-skill
```

### Other platforms

Run `./install.sh --platform <name>` (see `install.sh --help` for the full
list), or `./install.sh --all` to install to every detected platform at
once.

## Usage

```
/startup-gtm-skill help me build my sales narrative and pricing
/startup-gtm-skill build my ICP
/startup-gtm-skill write cold outreach emails and a demo script
/startup-gtm-skill help me handle a recurring objection
/startup-gtm-skill help me negotiate this deal
/startup-gtm-skill I'm ready to hire my first salesperson
```

See `SKILL.md` for the full mode-routing table and workflow.

## Evals

This skill ships an eval spec at `evals/startup-gtm-skill.eval.md` — binary
structural checks against the shipped output templates, plus one sample
founder-context golden case per mode.

```bash
python3 scripts/run_evals.py --validate   # confirm the spec is well-formed
python3 scripts/run_evals.py              # run the binary checks
```

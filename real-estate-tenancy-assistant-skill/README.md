# real-estate-tenancy-assistant-skill

Routes landlord/tenant/property-manager questions to a property-issue
diagnosis path (troubleshooting, photo-based damage assessment,
professional referral, safety warnings) or a tenancy-law FAQ path (rights,
rent, lease terms, eviction, deposits), asking a clarifying question when
ambiguous — no LLM API key, no vector DB, no LangGraph runtime. Inspired by
the actual multi-agent code in
[Kaos599/PropertyLoop](https://github.com/Kaos599/PropertyLoop).

## Install

### Claude Code
```bash
cp -R ./real-estate-tenancy-assistant-skill ~/.claude/skills/real-estate-tenancy-assistant-skill
```

### GitHub Copilot CLI
```bash
cp -R ./real-estate-tenancy-assistant-skill ~/.copilot/skills/real-estate-tenancy-assistant-skill
```

### VS Code Copilot (project-level)
```bash
cp -R ./real-estate-tenancy-assistant-skill .github/skills/real-estate-tenancy-assistant-skill
```

### Cursor (project-level only)
```bash
cp -R ./real-estate-tenancy-assistant-skill .cursor/skills/real-estate-tenancy-assistant-skill
```

### Any other supported tool
Run `./install.sh` (auto-detects your platform) or `./install.sh --all` to
install everywhere detected.

## Usage

```
/real-estate-tenancy-assistant-skill There's water pooling under my kitchen sink and the cabinet wood looks warped. [+ photo]

/real-estate-tenancy-assistant-skill Can my landlord raise my rent mid-lease without notice? I'm in California.
```

See `SKILL.md` for the full routing workflow and `references/` for the
routing rubric and both output schemas.

## Evals

```bash
python3 scripts/run_evals.py --validate
python3 scripts/run_evals.py --judge
```

## What was reimplemented vs. what changed

- **Reimplemented**: the router → specialist hand-off pattern; the two
  output schemas (`PropertyIssueReport`, `TenancyFAQResponse`); the
  clarification fallback for ambiguous queries.
- **Corrected scope**: the source README describes 5 agents (router,
  property issues, legal, tenancy FAQ, safety), but the actual code
  (`Chatbot/agents.py`, `graph.py`) implements a router + 2 specialist
  agents + clarification. This skill is built from the code, not the
  README's broader claim.
- **Replaced**: the source project's LLM API calls and built-in web search
  → the invoking agent's own reasoning, optionally using its own
  web-search tool (if available) to ground jurisdiction-specific legal
  claims.
- **Not ported**: the Streamlit UI and LangGraph `ChatState` persistence
  layer — an agent skill carries conversation context natively within a
  session.

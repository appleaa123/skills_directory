# adhd-toolkit

An ADHD-compatible operating layer for AI assistants, paired with a
fact-checked knowledge base drawn from published clinical and educational
material on ADHD neuroscience, executive function, and nutrition.

Every turn is routed through a state classifier — **FLOODED, STUCK,
SCATTERED, DEPLETED, COLLAPSED, ROLLING** — before the assistant responds,
so a response's *shape* (regulate vs. atomize vs. externalize vs. just
answer) matches the state the person is actually in. See
[SKILL.md](SKILL.md) §0 for the full protocol, and
[references/response-style.md](references/response-style.md) for worked
good/bad examples of every state.

**Not medical advice.** Nutrition content reports what a named book says,
cited to chapter, and routes to a doctor at its boundary. See
[sources.md](sources.md) for the full claim-by-claim audit — including 17
places the original generation stated something the books don't say, all
corrected in place.

## Install

**Claude Code** (recommended — via plugin marketplace):
```
/plugin marketplace add <repo-url>
```

**Claude Code** (manual):
```
git clone <repo-url> ~/.claude/skills/adhd-toolkit
```

**GitHub Copilot CLI**:
```
git clone <repo-url> ~/.copilot/skills/adhd-toolkit
```

**VS Code Copilot** (project-level):
```
git clone <repo-url> .github/skills/adhd-toolkit
```

**Cursor** (project-level only — no global path):
```
git clone <repo-url> .cursor/skills/adhd-toolkit
```

**Gemini CLI**:
```
git clone <repo-url> ~/.gemini/skills/adhd-toolkit
```

**Any other supported tool**: run the installer, which auto-detects your
platform:
```
./install.sh
```
Or specify explicitly:
```
./install.sh --platform <name>
./install.sh --all        # install to every detected platform at once
```

## Usage

```
/adhd-toolkit I have to file my taxes and I've been avoiding it for three weeks
/adhd-toolkit my manager left a one-line reply and I can't stop reading it
/adhd-toolkit I have 12 things due this week and I don't know where to start
/adhd-toolkit I haven't touched this project in a month, help me restart
/adhd-toolkit what should I eat to fix my ADHD?
/adhd-toolkit plan my day
```

## What's inside

| Path | Contents |
|---|---|
| [SKILL.md](SKILL.md) | Entry protocol, response invariant, behavioral rules, mental models |
| [AGENTS.md](AGENTS.md) | Cross-tool companion pointer file |
| [workflows/](workflows/) | The real recurring jobs: daily plan, project breakdown, deadline recovery, weekly reset, restart after collapse, energy-crash triage |
| [references/response-style.md](references/response-style.md) | The output contract — good/bad response pairs per state |
| [references/continuity.md](references/continuity.md) | The skill-maintained state file and opt-in check-ins |
| [chapters/](chapters/) | 12 cited deep-dive chapters across the three source books |
| [glossary.md](glossary.md) | 80+ terms with chapter cross-references |
| [patterns.md](patterns.md) | Interactive protocols (Body-Doubling, RSD Triage, Focus Plate) |
| [cheatsheet.md](cheatsheet.md) | Emergency triage matrix, food quick-tables |
| [sources.md](sources.md) | Claim-by-claim audit against the three books |
| [evals/](evals/) | Regression suite — content integrity + behavioral judged checks |

## Verify locally

```bash
python3 scripts/run_evals.py --validate   # spec is well-formed
python3 scripts/run_evals.py              # deterministic content checks
```

## License

MIT

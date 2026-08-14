# adhd-toolkit

An operating layer and source-audited knowledge base for helping someone
with ADHD plan, start, or stick with work — routing every turn through a
state classifier (FLOODED / STUCK / SCATTERED / DEPLETED / COLLAPSED /
ROLLING) before responding, so the *shape* of the reply matches the state
the person is actually in, not just the topic they asked about.

## Activation

Invoke with `/adhd-toolkit <what's going on>`, or naturally when the
conversation involves ADHD, executive dysfunction, task paralysis, time
blindness, or emotional regulation for someone with ADHD:

- "I have to file my taxes and I've been avoiding it for three weeks"
- "I have 12 things due this week and I don't know where to start"
- "I haven't touched this project in a month, help me restart"
- "what should I eat to fix my ADHD?"

## How to use this file

This is the cross-tool companion file (AAIF format). The full operating
procedure — the entry protocol, the response contract, the workflows, and
the knowledge layer — lives in [SKILL.md](SKILL.md) at this skill's root.
Read SKILL.md §0 first; it governs every other section.

## What this skill carries

- **Entry protocol** (SKILL.md §0) — a state classifier that routes to the
  right workflow *before* generating content, with FLOODED taking priority
  over every other state when more than one applies.
- **Response contract** ([references/response-style.md](references/response-style.md))
  — worked good/bad examples per state, because format instructions
  described in prose drift over a long conversation; demonstrated formats
  don't drift the same way.
- **Workflows** ([workflows/](workflows/)) — daily planning, project
  breakdown, deadline recovery, weekly reset, restart after collapse, and
  energy-crash triage (nutrition treated as a live procedure, not a
  reference chapter).
- **Continuity** ([references/continuity.md](references/continuity.md)) —
  a skill-maintained `state.md` that carries open commitments and what
  worked between sessions, plus opt-in scheduled check-ins. Never created
  without the user asking.
- **Fact-checked knowledge base** (`chapters/`, `glossary.md`,
  `cheatsheet.md`, `patterns.md`) — every framework and number tagged
  `[verified]` where it traces to published clinical and educational
  material on ADHD, or explicitly tagged `[practitioner-common]` where it's
  a real community tool not tied to a single documented source. Full
  claim-by-claim audit trail, including 17 corrected claims:
  [sources.md](sources.md).
- **Eval suite** ([evals/adhd-toolkit.eval.md](evals/adhd-toolkit.eval.md))
  — deterministic checks that content stays cited and no retracted claim
  creeps back in, plus judged checks on state routing and response shape.

## Not medical advice

Nutrition content reports what a named book says. It is not clinical
guidance, invents no dosages, and routes to a doctor at its boundary —
particularly for anything touching stimulant medication.

## Install

```
git clone <repo> ~/.claude/skills/adhd-toolkit   # Claude Code
./install.sh --platform <name>                    # other platforms — see README.md
```

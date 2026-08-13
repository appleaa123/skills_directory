# llm-approach-advisor-skill

Helps you determine the best technical approach when building with LLMs —
prompting/chain-of-thought, RAG, fine-tuning (LoRA or full), knowledge
editing, alignment training (RLHF/PPO), or a multimodal/agent architecture —
instead of defaulting to whichever technique is most familiar or most hyped.

Give it your goal and constraints (data volume, compute budget, update
frequency, latency, safety exposure); it runs a deterministic scorer against a
decision framework distilled from hands-on LLM engineering practice, then
returns a ranked recommendation with rejected alternatives and a mandatory
safety note.

Source knowledge: distilled from
[dive-into-llms](https://github.com/Lordog/dive-into-llms), an SJTU hands-on
LLM tutorial series covering fine-tuning/deployment, prompting/CoT, knowledge
editing, math-reasoning SFT, watermarking, jailbreak attacks, steganography,
multimodal models, GUI agents, agent safety, and RLHF/PPO alignment.

## Install

### Claude Code

```bash
cp -R llm-approach-advisor-skill ~/.claude/skills/llm-approach-advisor-skill
```

Or via the plugin marketplace path:

```
/plugin marketplace add ./llm-approach-advisor-skill
```

### Other platforms

```bash
# GitHub Copilot (user-level)
cp -R llm-approach-advisor-skill ~/.copilot/skills/llm-approach-advisor-skill

# GitHub Copilot (project-level) / VS Code
cp -R llm-approach-advisor-skill .github/skills/llm-approach-advisor-skill

# Cursor (project-level only — no global path)
cp -R llm-approach-advisor-skill .cursor/skills/llm-approach-advisor-skill

# Gemini CLI
cp -R llm-approach-advisor-skill ~/.gemini/skills/llm-approach-advisor-skill

# Codex CLI / universal AGENTS.md readers
cp -R llm-approach-advisor-skill ~/.agents/skills/llm-approach-advisor-skill
```

Or run the bundled installer, which auto-detects your platform:

```bash
./install.sh
./install.sh --platform cursor
./install.sh --all
```

## Use

```
/llm-approach-advisor-skill I want to build a customer-support bot that knows our product docs
/llm-approach-advisor-skill should I fine-tune or just use a better prompt for this classifier?
/llm-approach-advisor-skill I have 2000 labeled support tickets and want to auto-categorize them
```

## Evals

This skill ships an eval spec at `evals/llm-approach-advisor.eval.md`.

```bash
python3 scripts/run_evals.py                      # check against the golden baseline
python3 scripts/run_evals.py --rollout             # run end-to-end, score real output
python3 scripts/run_evals.py --rollout --promote   # capture first-green baselines
python3 scripts/run_evals.py --rollout --judge      # grade llm-judge criteria
python3 scripts/evolve.py                          # staleness + drift + eval loop in one command
```

## Benchmark: skill vs. bare model

`scripts/benchmark_vs_baseline.py` compares the skill's deterministic scorer
against a bare model (`claude-haiku-4-5`, no framework, no scoring script, no
reference material — just the raw scenario description) on the four golden
scenarios in `evals/golden/`.

```bash
python3 scripts/benchmark_vs_baseline.py
python3 scripts/benchmark_vs_baseline.py --repeat 2   # run the baseline twice per case
```

This is an analysis tool, not part of the shipped eval gate — the baseline
column makes live, non-deterministic model calls, so it's never wired into
`run_evals.py` or `evolve.py`.

**Result (n=4, single run, Haiku 4.5):** both conditions picked the correct
approach family on all 4 cases (100%/100%) — too small a sample to show an
accuracy gap, and a strong model gets the easy calls right cold. The real
divergence showed up on the safety scenario (public chatbot, unsafe outputs
under adversarial prompts): the skill recommended `prompting_cot` plus
mandatory jailbreak-hardening — the cheapest tier that solves the problem, per
the decision framework's rule against reaching for RLHF unless adversarial
robustness is genuinely the bottleneck. The bare model jumped straight to
`alignment_training` (RLHF/PPO) — the most expensive, slowest-to-iterate tier
in the framework — with confident but ungrounded language ("the proven
approach," "industry standard"). Both count as "correct" under a
family-unconstrained rubric, but this is the scope-creep failure mode the
skill's tie-breaking rules are built to catch.

Beyond that one case, the skill's advantage is structural rather than
accuracy-on-easy-cases: its picks are free, deterministic, and reproducible (a
Python script, not a live call), and every point in its recommendation traces
back to a named constraint dimension in `references/decision-framework.md`
rather than an unfalsifiable "industry standard" appeal. This is a small,
single-model benchmark — not a statistically rigorous result — but it points
at where a larger benchmark would separate the two conditions: adversarial and
safety-heavy scenarios where the cheap-vs-expensive-default tradeoff matters
most.

## Structure

```
llm-approach-advisor-skill/
├── SKILL.md                     # skill definition + consultation workflow
├── AGENTS.md                    # companion instruction file
├── scripts/
│   ├── approach_matrix.py         # deterministic constraint -> approach scorer
│   ├── run_evals.py               # eval runner
│   ├── evolve.py                  # staleness/drift/eval maintenance loop
│   └── benchmark_vs_baseline.py   # skill vs. bare-model comparison (analysis only)
├── references/                  # decision framework + per-approach knowledge
├── assets/recommendation-template.md
├── evals/                       # eval spec + golden cases + judge canary
└── install.sh
```

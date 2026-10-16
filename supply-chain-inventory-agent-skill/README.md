# supply-chain-inventory-agent-skill

Multi-echelon supply chain inventory management simulation using the
InvAgent LLM multi-agent decision pattern (Quan & Liu, 2024,
[arXiv:2407.11384](https://arxiv.org/abs/2407.11384),
[zefang-liu/InvAgent](https://github.com/zefang-liu/InvAgent), Apache-2.0).
The assistant plays every stage's ordering-decision role each period,
following InvAgent's exact prompt template and golden-rule heuristics, and
benchmarks the result against a deterministic fixed base-stock policy.

## Install

### Claude Code
```bash
cp -R ./supply-chain-inventory-agent-skill ~/.claude/skills/supply-chain-inventory-agent-skill
# or, from a shared registry:
# git clone <repo-url> ~/.claude/skills/supply-chain-inventory-agent-skill
```

### GitHub Copilot CLI
```bash
cp -R ./supply-chain-inventory-agent-skill ~/.copilot/skills/supply-chain-inventory-agent-skill
```

### VS Code Copilot (project-level)
```bash
cp -R ./supply-chain-inventory-agent-skill .github/skills/supply-chain-inventory-agent-skill
```

### Cursor (project-level only)
```bash
cp -R ./supply-chain-inventory-agent-skill .cursor/skills/supply-chain-inventory-agent-skill
```

### Gemini CLI
```bash
cp -R ./supply-chain-inventory-agent-skill ~/.gemini/skills/supply-chain-inventory-agent-skill
```

### Any other supported tool
Run `./install.sh` (auto-detects your platform) or `./install.sh --all` to
install everywhere detected. `./install.sh --help` lists every `--platform`
option and its native path.

## Usage

```
/supply-chain-inventory-agent-skill run the seasonal_demand scenario
/supply-chain-inventory-agent-skill compare LLM ordering vs baseline on larger_demand
/supply-chain-inventory-agent-skill build a custom 4-stage chain and run it
```

See `SKILL.md` for the full workflow and `references/` for the ported
prompt template and demand-scenario configs.

## Dependencies

```bash
python3 -m pip install -r scripts/requirements.txt   # numpy only
```

## Evals

```bash
python3 scripts/run_evals.py --validate          # confirm the spec is well-formed
python3 scripts/run_evals.py --rollout            # run the deterministic baseline pipeline and score it
python3 scripts/run_evals.py --rollout --promote  # capture the first-green baseline for pending cases
```

## What was ported vs. what changed from InvAgent

- **Ported as-is**: the state-transition/profit arithmetic (`src/env.py`),
  the six demand scenario configs (`src/config.py`), the fixed base-stock
  policy formula (`src/baseline.py`), and the exact per-stage decision prompt
  and heuristics (`notebooks/autogen.ipynb`).
- **Removed**: `gymnasium`/`ray` RL action/observation-space machinery (not
  needed — this skill has no RL agent to train) and the AutoGen/OpenAI API
  call (the assistant running this skill plays each stage's role directly,
  in-conversation, instead of calling an external LLM API per stage per
  period).

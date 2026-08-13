# llm-approach-advisor-skill

## Purpose

Advises on which technique to use when building with an LLM: prompting/CoT,
RAG, fine-tuning (LoRA/full), knowledge editing, alignment training
(RLHF/PPO), or a multimodal/agent architecture. Turns a user's goal and
constraints into a ranked, justified recommendation instead of defaulting to
whichever technique is most familiar or most hyped.

## Activation

Trigger this skill when a user:
- Asks "should I fine-tune or use RAG/prompting" or any variant of that
  comparison
- Is unsure how to build an LLM-powered feature and states a goal plus some
  constraints (data volume, compute, latency, safety needs)
- Asks whether they need an agent architecture, a multimodal model, knowledge
  editing, or alignment training for a specific use case
- Asks about jailbreak robustness, agent safety review, or content
  provenance/watermarking in the context of choosing a build approach

## Usage

Invoke as `/llm-approach-advisor-skill <describe your goal and any known
constraints>`. The skill elicits missing constraint dimensions (task shape,
labeled data volume, update frequency, compute budget, latency, safety
exposure, non-text I/O needs), runs `scripts/approach_matrix.py` for a
deterministic first-pass ranking, reasons against the full decision framework
in `references/decision-framework.md`, and returns a structured recommendation
report (top pick + justification, rejected alternatives + reasons, mandatory
safety note).

## Full details

See `SKILL.md` for the complete workflow, trigger examples, and the mapping
from constraint dimensions to reference files. See `references/` for the
distilled technical knowledge each recommendation draws on.

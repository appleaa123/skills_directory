#!/usr/bin/env python3
"""Score LLM-build approach families against a user's stated constraints.

Reads a constraints JSON (see --example for the schema) and prints a ranked
JSON list of approach families with scores and rationale, implementing the
constraint-dimension weighting from references/decision-framework.md. This is
a deterministic pre-filter for the recommendation report, not a replacement
for the qualitative reasoning in that document — the skill workflow runs this
script, then narrates the ranked list against the reference material.

Usage:
    python3 approach_matrix.py --input constraints.json
    python3 approach_matrix.py --input constraints.json --json
    python3 approach_matrix.py --example > constraints.json
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

APPROACHES = [
    "prompting_cot",
    "rag",
    "knowledge_editing",
    "fine_tuning",
    "alignment_training",
    "multimodal_agent",
]

APPROACH_LABELS = {
    "prompting_cot": "Prompting / Chain-of-Thought",
    "rag": "Retrieval-Augmented Generation (RAG)",
    "knowledge_editing": "Knowledge Editing (ROME/MEMIT)",
    "fine_tuning": "Fine-tuning (LoRA or full)",
    "alignment_training": "Alignment Training (RLHF/PPO)",
    "multimodal_agent": "Multimodal / Agent Architecture",
}

# Base cost penalty applied to every approach, ascending order of complexity —
# used as a tie-breaker so cheaper options win when signal scores are equal.
COST_PENALTY = {
    "prompting_cot": 0,
    "rag": 1,
    "knowledge_editing": 2,
    "fine_tuning": 3,
    "alignment_training": 5,
    "multimodal_agent": 4,
}

VALID_TASK_SHAPES = {"new_facts", "new_skill", "new_style_or_behavior"}
VALID_UPDATE_FREQUENCIES = {"constant", "rare_few_facts", "never"}
VALID_COMPUTE_BUDGETS = {"api_only", "single_gpu", "multi_gpu"}
VALID_LATENCY = {"low", "flexible"}
VALID_SAFETY_EXPOSURE = {"adversarial_public", "cooperative_internal"}


@dataclass
class Constraints:
    task_shape: str
    labeled_examples: int
    update_frequency: str
    compute_budget: str
    latency: str
    safety_exposure: str
    needs_nontext_io: bool = False
    needs_multistep_action: bool = False
    notes: str = ""

    @staticmethod
    def from_dict(d: dict) -> "Constraints":
        missing = [
            k
            for k in ("task_shape", "labeled_examples", "update_frequency",
                      "compute_budget", "latency", "safety_exposure")
            if k not in d
        ]
        if missing:
            raise ValueError(f"Missing required constraint fields: {missing}")
        if d["task_shape"] not in VALID_TASK_SHAPES:
            raise ValueError(f"task_shape must be one of {VALID_TASK_SHAPES}")
        if d["update_frequency"] not in VALID_UPDATE_FREQUENCIES:
            raise ValueError(f"update_frequency must be one of {VALID_UPDATE_FREQUENCIES}")
        if d["compute_budget"] not in VALID_COMPUTE_BUDGETS:
            raise ValueError(f"compute_budget must be one of {VALID_COMPUTE_BUDGETS}")
        if d["latency"] not in VALID_LATENCY:
            raise ValueError(f"latency must be one of {VALID_LATENCY}")
        if d["safety_exposure"] not in VALID_SAFETY_EXPOSURE:
            raise ValueError(f"safety_exposure must be one of {VALID_SAFETY_EXPOSURE}")
        return Constraints(
            task_shape=d["task_shape"],
            labeled_examples=int(d["labeled_examples"]),
            update_frequency=d["update_frequency"],
            compute_budget=d["compute_budget"],
            latency=d["latency"],
            safety_exposure=d["safety_exposure"],
            needs_nontext_io=bool(d.get("needs_nontext_io", False)),
            needs_multistep_action=bool(d.get("needs_multistep_action", False)),
            notes=str(d.get("notes", "")),
        )


@dataclass
class Score:
    approach: str
    points: float
    reasons: list[str] = field(default_factory=list)


def score_approaches(c: Constraints) -> list[Score]:
    scores = {a: Score(approach=a, points=0.0) for a in APPROACHES}

    def add(approach: str, points: float, reason: str) -> None:
        scores[approach].points += points
        scores[approach].reasons.append(reason)

    # Dimension 7 (architecture gate) — evaluated first since it reframes everything.
    if c.needs_nontext_io:
        add("multimodal_agent", 5, "Task requires non-text I/O (image/audio/video)")
    if c.needs_multistep_action:
        add("multimodal_agent", 4, "Task requires multi-step, state-dependent actions")

    # Dimension 1: task shape
    if c.task_shape == "new_facts":
        add("rag", 5, "Task shape is new facts -> RAG grounds without retraining")
        add("fine_tuning", -2, "Fine-tuning is slow to refresh for fact-heavy tasks")
    elif c.task_shape == "new_skill":
        add("prompting_cot", 3, "Task shape is new skill -> try prompting/CoT first")
        add("fine_tuning", 2, "If prompting plateaus, fine-tuning teaches a new skill directly")
    elif c.task_shape == "new_style_or_behavior":
        add("prompting_cot", 2, "Style/behavior often achievable via system prompt")
        add("alignment_training", 2, "Style/behavior robustness under pressure needs alignment training")

    # Dimension 2: labeled examples
    if c.labeled_examples == 0:
        add("prompting_cot", 4, "No labeled examples -> zero/few-shot prompting or RAG only")
        add("rag", 2, "No labeled examples but RAG needs no labels either")
        add("fine_tuning", -5, "Fine-tuning is not viable without labeled data")
    elif c.labeled_examples < 500:
        add("prompting_cot", 2, "Small example count favors few-shot prompting first")
        add("fine_tuning", 1, "Light LoRA fine-tuning is viable but gains over few-shot may be marginal")
    else:
        add("fine_tuning", 4, "Sufficient labeled volume (1000+) makes fine-tuning cost-effective")

    # Dimension 3: update frequency
    if c.update_frequency == "constant":
        add("rag", 4, "Frequently changing knowledge -> RAG avoids staleness")
        add("fine_tuning", -3, "Frequent updates make fine-tuning/editing unsustainable")
        add("knowledge_editing", -2, "Knowledge editing doesn't scale to broad frequent refreshes")
    elif c.update_frequency == "rare_few_facts":
        add("knowledge_editing", 4, "Rare, narrow factual corrections fit knowledge editing's locality guarantees")
    elif c.update_frequency == "never":
        add("fine_tuning", 2, "One-time/static knowledge is fine to bake into fine-tuned weights")

    # Dimension 4: compute budget
    if c.compute_budget == "api_only":
        add("prompting_cot", 3, "API-only budget favors prompting/RAG over training a model")
        add("rag", 1, "RAG works via API + a retrieval index, no GPU training needed")
        add("fine_tuning", -4, "No GPU budget rules out fine-tuning")
        add("alignment_training", -5, "No GPU budget rules out RLHF/PPO")
        add("multimodal_agent", -3, "Non-text/agent training needs GPU budget beyond API-only")
    elif c.compute_budget == "single_gpu":
        add("fine_tuning", 2, "Single GPU is sufficient for LoRA fine-tuning of small/mid models")
        add("alignment_training", -2, "PPO needs ~2x base model memory (policy + reference); tight on a single GPU")
        add("multimodal_agent", -2, "Multimodal/agent SFT typically needs multi-GPU (3x80GB+ in tutorial)")
    elif c.compute_budget == "multi_gpu":
        add("fine_tuning", 1, "Multi-GPU comfortably supports full or LoRA fine-tuning")
        add("alignment_training", 2, "Multi-GPU budget supports PPO's ~2x memory requirement")
        add("multimodal_agent", 2, "Multi-GPU budget matches multimodal/agent SFT requirements")

    # Dimension 5: latency
    if c.latency == "low":
        add("fine_tuning", 2, "Low-latency/high-volume needs favor a small fine-tuned model over a large prompted one")
    else:
        add("prompting_cot", 1, "Flexible latency keeps prompting/RAG's fast iteration loop attractive")

    # Dimension 6: safety exposure
    if c.safety_exposure == "adversarial_public":
        add("alignment_training", 1, "Adversarial public exposure raises the case for alignment training if behavior must hold under pressure")
        # Safety is a cross-cutting flag, not a primary approach score driver beyond this.

    return sorted(scores.values(), key=lambda s: (-s.points, COST_PENALTY[s.approach]))


def render(scores: list[Score], c: Constraints) -> dict:
    ranked = []
    for s in scores:
        ranked.append({
            "approach": s.approach,
            "label": APPROACH_LABELS[s.approach],
            "score": round(s.points, 1),
            "reasons": s.reasons,
        })
    safety_flag = c.safety_exposure == "adversarial_public"
    return {
        "ranked_approaches": ranked,
        "top_pick": ranked[0]["approach"],
        "safety_review_required": safety_flag,
        "safety_note": (
            "Adversarial/public exposure: run jailbreak-robustness and agent-risk "
            "review from references/safety-and-alignment.md before launch."
            if safety_flag else
            "Cooperative/internal use: standard prompting-safety practices are likely sufficient."
        ),
    }


EXAMPLE = {
    "task_shape": "new_skill",
    "labeled_examples": 300,
    "update_frequency": "never",
    "compute_budget": "single_gpu",
    "latency": "flexible",
    "safety_exposure": "cooperative_internal",
    "needs_nontext_io": False,
    "needs_multistep_action": False,
    "notes": "Auto-triage 300 labeled support tickets into categories.",
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Path to constraints JSON")
    parser.add_argument("--example", action="store_true", help="Print an example constraints JSON and exit")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON only")
    args = parser.parse_args()

    if args.example:
        print(json.dumps(EXAMPLE, indent=2))
        return 0

    if not args.input:
        parser.error("--input is required unless --example is passed")

    try:
        data = json.loads(args.input.read_text())
        constraints = Constraints.from_dict(data)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    scores = score_approaches(constraints)
    result = render(scores, constraints)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"Top pick: {APPROACH_LABELS[result['top_pick']]}\n")
        for entry in result["ranked_approaches"]:
            print(f"{entry['score']:>5.1f}  {entry['label']}")
            for reason in entry["reasons"]:
                print(f"        - {reason}")
        print(f"\nSafety: {result['safety_note']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

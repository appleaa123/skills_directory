#!/usr/bin/env python3
"""Benchmark: skill-assisted recommendation vs. a bare model with no scaffolding.

Runs the four golden scenarios in evals/golden/ through two conditions:

  with-skill: python3 scripts/approach_matrix.py --input <case>/input.json --json
              (deterministic — this is literally what the skill's own workflow
              runs; zero LLM cost, zero variance)

  baseline:   the case's raw notes handed to a fresh, unscaffolded model call
              (no decision-framework.md, no scorer, no reference files) via
              `claude -p` print-mode — the same keyless invocation shape
              run_evals.py's judge uses — asking it to pick one of the six
              approach families cold.

This quantifies what the skill's decision framework adds over just asking a
model the same question. It is a demonstration/analysis tool, not part of the
skill's shipped eval gate — it makes live model calls and is not deterministic
in its baseline column, so it is never wired into run_evals.py or evolve.py.

Usage:
    python3 scripts/benchmark_vs_baseline.py
    python3 scripts/benchmark_vs_baseline.py --repeat 2   # run baseline twice per case
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
GOLDEN_DIR = SKILL_ROOT / "evals" / "golden"

sys.path.insert(0, str(SCRIPT_DIR))
from approach_matrix import APPROACH_LABELS, APPROACHES  # noqa: E402

BASELINE_TIMEOUT_SECONDS = 60
BASELINE_MODEL = "claude-haiku-4-5-20251001"

# Ground truth established via manual decision-framework.md walkthroughs in
# this session. accepted_families: any pick in this set counts correct.
# requires_safety_mention: baseline text must reference safety/hardening.
CASES = {
    "case-1": {
        "accepted_families": {"fine_tuning"},
        "requires_safety_mention": False,
        "label": "300 labeled tickets, single GPU, static knowledge",
    },
    "case-2": {
        "accepted_families": {"rag", "knowledge_editing"},
        "requires_safety_mention": False,
        "label": "wrong fact, fix this week, no labeled data",
    },
    "case-3": {
        "accepted_families": {"rag"},
        "requires_safety_mention": False,
        "label": "support bot, 5k docs, updated weekly, API-only",
    },
    "case-4": {
        "accepted_families": set(APPROACHES),  # any family is fine here
        "requires_safety_mention": True,
        "label": "public chatbot, unsafe outputs under adversarial prompts",
    },
}

SAFETY_KEYWORDS = re.compile(
    r"\b(safety|jailbreak|adversarial|harden|guardrail|red[- ]?team|alignment)\b",
    re.IGNORECASE,
)


def run_with_skill(case_id: str) -> dict:
    input_path = GOLDEN_DIR / case_id / "input.json"
    proc = subprocess.run(  # noqa: S603
        [sys.executable, str(SCRIPT_DIR / "approach_matrix.py"), "--input", str(input_path), "--json"],
        capture_output=True, text=True, timeout=30,
    )
    if proc.returncode != 0:
        return {"pick": None, "raw": proc.stderr.strip(), "reasons": []}
    data = json.loads(proc.stdout)
    top = data["ranked_approaches"][0]
    return {"pick": top["approach"], "raw": json.dumps(data, indent=2), "reasons": top["reasons"]}


BASELINE_PROMPT_TEMPLATE = """You are advising on how to build with an LLM. A user describes their goal:

"{notes}"

Pick exactly ONE of these six approaches as your top recommendation, and briefly justify it:
- prompting_cot (Prompting / Chain-of-Thought)
- rag (Retrieval-Augmented Generation)
- knowledge_editing (Knowledge Editing, e.g. ROME/MEMIT)
- fine_tuning (Fine-tuning, LoRA or full)
- alignment_training (Alignment Training, RLHF/PPO)
- multimodal_agent (Multimodal / Agent Architecture)

Respond with the approach's snake_case id on the first line, then a short justification.
"""


def run_baseline(notes: str) -> dict:
    if not shutil.which("claude"):
        return {"pick": None, "raw": "claude CLI not found on PATH — baseline skipped", "error": True}
    prompt = BASELINE_PROMPT_TEMPLATE.format(notes=notes)
    try:
        proc = subprocess.run(  # noqa: S603
            ["claude", "-p", "--model", BASELINE_MODEL],
            input=prompt, capture_output=True, text=True, timeout=BASELINE_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired:
        return {"pick": None, "raw": f"baseline call timed out after {BASELINE_TIMEOUT_SECONDS}s", "error": True}
    except OSError as exc:
        return {"pick": None, "raw": f"baseline call failed to start: {exc}", "error": True}
    if proc.returncode != 0:
        return {"pick": None, "raw": f"exit {proc.returncode}: {proc.stderr.strip()[:200]}", "error": True}
    text = proc.stdout.strip()
    pick = parse_pick(text)
    return {"pick": pick, "raw": text, "error": False}


def parse_pick(text: str) -> str | None:
    """Parse the approach id from the model's first non-empty line (as
    instructed in the prompt). Falls back to a whole-text substring search
    only if the first line doesn't contain a recognizable id — searching the
    whole text first would misfire on rejected alternatives the model names
    in its justification (e.g. "...unlike RAG, alignment_training...")."""
    for line in text.splitlines():
        stripped = line.strip().lower()
        if not stripped:
            continue
        for approach in APPROACHES:
            if approach in stripped:
                return approach
        break  # first non-empty line didn't match; don't keep scanning it
    lowered = text.lower()
    for approach in APPROACHES:
        if approach in lowered:
            return approach
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repeat", type=int, default=1, help="Baseline calls per case (default 1)")
    args = parser.parse_args()

    rows = []
    for case_id, meta in CASES.items():
        input_path = GOLDEN_DIR / case_id / "input.json"
        notes = json.loads(input_path.read_text()).get("notes", "")

        skill_result = run_with_skill(case_id)
        skill_correct = skill_result["pick"] in meta["accepted_families"]

        baseline_runs = [run_baseline(notes) for _ in range(args.repeat)]
        baseline_picks = [r["pick"] for r in baseline_runs]
        baseline_texts = [r["raw"] for r in baseline_runs]
        baseline_correct = [p in meta["accepted_families"] for p in baseline_picks]
        baseline_safety_ok = [
            (not meta["requires_safety_mention"]) or bool(SAFETY_KEYWORDS.search(t))
            for t in baseline_texts
        ]
        skill_safety_ok = (not meta["requires_safety_mention"])  # skill always flags via safety_note separately

        rows.append({
            "case_id": case_id,
            "label": meta["label"],
            "skill_pick": skill_result["pick"],
            "skill_correct": skill_correct,
            "skill_reasons": skill_result["reasons"],
            "baseline_picks": baseline_picks,
            "baseline_correct": baseline_correct,
            "baseline_safety_ok": baseline_safety_ok,
            "baseline_texts": baseline_texts,
        })

    print(f"{'case':<8} {'with-skill pick':<20} {'correct':<9} {'baseline pick(s)':<40} {'correct':<20}")
    print("-" * 100)
    for r in rows:
        baseline_pick_str = ", ".join(p or "?" for p in r["baseline_picks"])
        baseline_correct_str = ", ".join(str(c) for c in r["baseline_correct"])
        print(f"{r['case_id']:<8} {str(r['skill_pick']):<20} {str(r['skill_correct']):<9} {baseline_pick_str:<40} {baseline_correct_str:<20}")

    skill_acc = sum(r["skill_correct"] for r in rows) / len(rows)
    total_baseline = sum(len(r["baseline_correct"]) for r in rows)
    correct_baseline = sum(sum(r["baseline_correct"]) for r in rows)
    baseline_acc = correct_baseline / total_baseline if total_baseline else 0.0

    print()
    print(f"With-skill accuracy: {skill_acc:.0%} ({sum(r['skill_correct'] for r in rows)}/{len(rows)}) — deterministic, zero LLM cost")
    print(f"Baseline accuracy:   {baseline_acc:.0%} ({correct_baseline}/{total_baseline}) — live model calls, {BASELINE_MODEL}")

    case4 = next(r for r in rows if r["case_id"] == "case-4")
    safety_caught = sum(case4["baseline_safety_ok"])
    print(f"\ncase-4 safety-mention caught by baseline: {safety_caught}/{len(case4['baseline_safety_ok'])}"
          f" (with-skill always surfaces this via the mandatory safety_note)")

    print("\n--- with-skill reasons (case-by-case) ---")
    for r in rows:
        print(f"{r['case_id']}: {r['skill_pick']}")
        for reason in r["skill_reasons"]:
            print(f"    - {reason}")

    print("\n--- baseline raw text (first run, per case) ---")
    for r in rows:
        first_text = r["baseline_texts"][0] if r["baseline_texts"] else "(no output)"
        print(f"\n[{r['case_id']}]\n{first_text[:500]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

# Prompting, Chain-of-Thought, and RAG

Source material: dive-into-llms chapter 2 (prompting & CoT). RAG is treated here
as the natural extension of prompting for knowledge-grounding — it doesn't have
a dedicated repo chapter but is the default answer to "the model doesn't know X"
in `decision-framework.md`.

## Prompting variants

- **Zero-shot**: direct task instructions, no examples. Sufficient for
  straightforward classification and well-known task formats.
- **Few-shot**: worked examples before the target problem. Example quality and
  diversity matter more than count — a handful of well-chosen examples beats a
  large set of redundant ones.

## Chain-of-Thought (CoT)

Decomposes multi-step problems into intermediate reasoning steps.

- **Natural-language CoT**: verbal step-by-step reasoning in the output.
- **Program-oriented CoT**: the model writes and (conceptually) executes code
  for the calculation step, reducing arithmetic slip-ups.
- **Self-consistency**: sample multiple times at temperature > 0, take the
  majority-vote answer. Trades inference cost for accuracy — worth it when a
  single-shot answer is unreliable but the task is cheap enough to sample
  several times.
- **Advanced (name-check only, not deep tutorial coverage)**: Auto-CoT (automatic
  exemplar construction), ReAct (interleaves reasoning with tool/action calls —
  this is the bridge to agent architectures, see `multimodal-and-agents.md`),
  Critic (tool-based self-verification).

CoT gives the largest accuracy lift on multi-step math/logic tasks (the
tutorial cites GSM8K-style benchmarks). For simple classification or
extraction, CoT adds latency and cost without much accuracy gain — don't
default to it.

## When prompting/CoT is sufficient vs. not

Sufficient: task is within the base model's pretrained competence, doesn't need
private/current data, and accuracy from good prompting already clears the bar.

Not sufficient →  move down the decision framework:
- Needs private, current, or large-volume factual grounding → **RAG**.
- Needs a new *skill* the base model doesn't have, even with good prompting →
  **fine-tuning** (`fine-tuning-methods.md`).
- Needs behavior to hold under adversarial pressure → **alignment training**
  (`safety-and-alignment.md`).

## RAG as the default knowledge-grounding answer

RAG (retrieve relevant documents, then prompt the model with them as context)
should be the first answer whenever the underlying problem is "the model
doesn't know X" and X is expressed as documents/records rather than a skill.
Advantages over fine-tuning for this case: updates are instant (no training
run), answers are auditable back to a source document, and there's no risk of
baking stale facts into weights. Fine-tuning only wins here when the "knowledge"
needs to be fused into reasoning rather than recalled verbatim — see the
tie-breaking rule in `decision-framework.md`.

## Practical checklist to hand the user

1. Start with zero-shot on the target model; measure a baseline before adding
   complexity.
2. Add few-shot examples only if zero-shot underperforms; curate 3–8 diverse,
   correct examples rather than many similar ones.
3. Add CoT only for multi-step reasoning tasks; consider program-oriented CoT
   for anything arithmetic-heavy.
4. If failures trace to missing/private knowledge rather than reasoning
   ability, stop tuning the prompt and add retrieval instead.
5. Use self-consistency sampling only where the per-call cost is acceptable and
   a single sample is measurably unreliable.

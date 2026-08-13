# Decision Framework

This is the master reasoning tool for choosing how to build with an LLM. It maps
constraint dimensions to approach families, then gives the tie-breaking rules
used when a scenario satisfies more than one.

## The six approach families

| Family | What it changes | Reference |
|---|---|---|
| Prompting / CoT | Nothing about the model — only the input | `prompting-and-cot.md` |
| Retrieval-Augmented Generation (RAG) | Grounds the model in external documents at inference time | `prompting-and-cot.md` |
| Fine-tuning (full or LoRA/PEFT) | Model weights, via labeled examples | `fine-tuning-methods.md` |
| Knowledge editing | A narrow, targeted set of weights tied to specific facts | `knowledge-editing.md` |
| Alignment training (RLHF/PPO) | Model behavior/values, via a reward signal | `safety-and-alignment.md` |
| Multimodal / agent architecture | The system's I/O surface and control loop, not just the model | `multimodal-and-agents.md` |

Watermarking and steganography (`provenance-methods.md`) are not build-time
choices for the primary task — they're add-on provenance layers considered
whenever generated content needs to be traceable or content needs to be hidden
in transit.

## Constraint dimensions → approach signal

Walk through these in order. Each dimension narrows the candidate set; don't
skip to fine-tuning just because it "sounds more serious" — it is usually the
most expensive, slowest-to-iterate option and should only win when a cheaper
family provably can't meet the constraint.

1. **Task shape: does the model need new facts, a new skill, or a new style/tone?**
   - New facts (a document corpus, product docs, current data) → **RAG** first.
     RAG updates instantly, requires no training run, and is auditable (you can
     show which document produced the answer). Fine-tuning bakes facts into
     weights, is slow to refresh, and is prone to hallucinating merged/stale facts.
   - New skill (classification, extraction, structured output, domain reasoning) →
     if a strong base model can already do it with good instructions, **prompting/CoT**.
     If accuracy plateaus below requirement despite prompting, or you need much
     lower latency/cost via a smaller specialized model → **fine-tuning**.
   - New style/behavior (tone, safety posture, refusal behavior, following a house
     voice under adversarial pressure) → **alignment training** if it must hold
     under distribution shift or adversarial input; **prompting/system-prompt**
     if it only needs to hold under normal, cooperative use.

2. **How many labeled examples do you have?**
   - 0: prompting/CoT (zero-shot) or RAG. Fine-tuning is not viable without data.
   - 10s–100s: few-shot prompting first; light LoRA fine-tuning is viable but
     marginal gains over few-shot are often small at this scale (see ch1, ch4).
   - 1,000+: fine-tuning (LoRA for <10B models on a single GPU; full FT only
     with a strong reason — LoRA matches full FT on most task-specific benchmarks
     at a fraction of the compute, per ch1's Llama2 LoRA example).

3. **How often does the underlying knowledge change?**
   - Daily/weekly → RAG. A fine-tuned or edited model goes stale immediately
     and re-tuning on every change is not sustainable.
   - Rarely, and only 1–100 discrete facts wrong → **knowledge editing** (ROME/MEMIT
     via EasyEdit, see `knowledge-editing.md`) is the narrow-surgery option:
     faster and cheaper than retraining, with locality guarantees that limit
     collateral damage to unrelated facts — but it doesn't scale to broad
     knowledge refreshes and needs per-model calibration overhead (Wiki corpus +
     layer statistics) before the first edit.
   - Never / one-time snapshot → fine-tuning is fine.

4. **Compute and turnaround budget**
   - CPU or a single consumer GPU, need an answer today → prompting/RAG via API.
   - Single GPU (16–24GB), hours to iterate → LoRA fine-tuning on a small-to-mid
     model (ch1: BERT-base fine-tunes on a single GPU in minutes; ch4: Qwen2.5-Math-1.5B
     SFT needs 40GB+ VRAM and 50GB+ disk).
   - Multi-GPU (3x 80GB+), days to iterate → full fine-tuning of larger models,
     multimodal alignment (ch8's three-stage encoder/decoder alignment), or
     GUI-agent SFT (ch9 needs 3x 80GB A100s).
   - PPO/RLHF needs roughly 2x the memory of the base model (policy + frozen
     reference model held simultaneously) — ch11's GPT-2-scale example used
     ~10GB VRAM for 35 minutes; scale this up steeply with model size.

5. **Latency and deployment constraints**
   - Must answer fast, on-device, or extremely cheaply at high volume →
     small fine-tuned model beats calling a large model through prompting.
   - Latency is not the bottleneck, iteration speed matters more → prompting/RAG,
     since there's no training loop between an idea and a deployed change.

6. **Safety exposure**
   - Public-facing, adversarial users, high-stakes actions (agents that touch
     files/credentials/money) → treat `safety-and-alignment.md` as mandatory
     reading regardless of which family above wins. Jailbreak robustness testing
     (EasyJailbreak-style, ch6) and agent risk assessment (R-Judge-style, ch10)
     are pre-launch gates, not optional hardening.
   - Internal tool, cooperative users, no irreversible actions → standard
     prompting-safety (clear system prompt, output validation) is usually enough.

7. **Does the task require non-text I/O (images, audio, video, screen control)?**
   If yes, the base architecture decision comes first — see
   `multimodal-and-agents.md` — before any of the above dimensions apply, because
   they determine what "the model" even is (text-only LLM vs. encoder-LLM-decoder
   vs. VLM-driven agent).

## Tie-breaking rules

- **RAG vs. fine-tuning for "the model doesn't know X"**: default to RAG. Only
  fine-tune for knowledge injection when the facts are stable, small in volume,
  and need to be fused into reasoning (not just recalled) — e.g., a domain
  vocabulary a classifier must use, not "our Q3 numbers."
- **Fine-tuning vs. knowledge editing for "the model states a wrong fact"**:
  editing wins when it's a handful of specific, isolated facts and locality
  matters (you don't want to touch anything else). Fine-tuning (or RAG) wins
  when the wrongness reflects a systemic gap, not a handful of errors.
- **Prompting vs. alignment training for "the model behaves badly"**: prompting
  wins for cooperative-user contexts. Alignment training is justified only when
  behavior must be robust against users actively trying to break it, and you can
  invest in a reward signal and the 2x-memory PPO budget.
- **When two families both clear the bar**: prefer the cheaper, faster-to-iterate
  one. Prompting > RAG > knowledge editing > LoRA fine-tuning > full fine-tuning >
  alignment training, in ascending order of cost/complexity — move down this list
  only when the dimension analysis above forces it.

Every recommendation should name the winning family, name the runner-up it beat
and why it lost, and flag safety/provenance add-ons separately from the primary
choice.

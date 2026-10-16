# Fine-Tuning Methods

Source material: dive-into-llms chapters 1 (fine-tuning & deployment) and 4 (math
reasoning via SFT).

## When fine-tuning is the right call

Fine-tuning wins when: the task needs a new *skill* (not new facts — see
`decision-framework.md`), you have 100s–1000s+ labeled examples, and either
prompting has plateaued below the accuracy bar or you need a smaller/cheaper/faster
model than a prompted general-purpose LLM.

## Two fine-tuning shapes

**Task-specific SFT on an encoder model** (ch1 pattern):
- Model: BERT-base or similar encoder (T5, ELECTRA as alternatives)
- Use case: classification (the tutorial's example is fake-news/fake-tweet
  detection)
- Data: CSV/JSON, tokenized to ~512 max sequence length
- Two implementation paths: a modular pipeline (separate data-loading /
  model-architecture / metrics files, for full control) or HuggingFace's
  `run_classification.py` with CLI hyperparameters (fastest to a working baseline)
- Compute: single GPU, minutes to a few hours; CPU is possible but slow
- Deployment: package model + `requirements.txt` + `app.py` (Gradio) and push to
  HuggingFace Spaces

**LoRA fine-tuning on a decoder LLM** (ch1 + ch4 pattern):
- LoRA (Low-Rank Adaptation) trains a small set of injected low-rank matrices
  instead of the full weight matrix — matches full fine-tuning quality on most
  task-specific benchmarks at a fraction of the memory and disk footprint, and
  produces a small, swappable adapter file rather than a full model copy.
- ch1 example: Llama2 inference + LoRA fine-tuning.
- ch4 example: distillation-style SFT — Qwen2.5-Math-1.5B trained on
  DeepSeek-R1-generated responses (DeepMath-103K dataset) to acquire reflection
  and verification behavior in math reasoning. Needs PyTorch + Transformers +
  vLLM, 40GB+ GPU VRAM, 50GB+ disk.
- This "train on a stronger model's outputs" pattern (distillation-style SFT) is
  worth calling out explicitly to the user when they want a small model to
  approximate a large model's reasoning style on a narrow domain.

## Full fine-tuning vs. LoRA

Default to LoRA/PEFT unless the user has a specific reason to update every
weight (e.g., a large distribution shift the base model's representations can't
accommodate, or research requiring full-weight comparison). LoRA is cheaper,
faster to iterate, produces portable adapters, and is the default path in both
tutorial chapters that touch decoder LLMs.

## Practical checklist to hand the user

1. Confirm label volume and quality — fine-tuning on noisy labels overfits fast.
2. Pick base model size against available VRAM (single consumer GPU → ≤7B with
   LoRA; ≤1.5B comfortably fits 40GB with full SFT per ch4's numbers).
3. Hold out a validation + test split; the pipeline should report both, not just
   training loss.
4. If deploying, plan the serving path up front (Gradio + HF Spaces is the
   tutorial's zero-infra option; vLLM for higher-throughput self-hosting).
5. Re-run the safety checklist in `safety-and-alignment.md` if the fine-tuned
   model is user-facing.

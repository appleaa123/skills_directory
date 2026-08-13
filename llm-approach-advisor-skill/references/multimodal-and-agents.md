# Multimodal Models and Agent Architectures

Source material: dive-into-llms chapters 8 (multimodal models) and 9 (GUI
agents). These decisions come *before* the constraint-dimension walk in
`decision-framework.md` when the task's I/O surface isn't plain text, because
they determine what "the model" even is.

## When the task needs a multimodal model (ch8)

Needed when the application must process or produce non-text modalities
(images, audio, video) as part of understanding or generation — not just when
"images are involved somewhere in the product."

Two architectural patterns:
- **LLM as task scheduler**: the LLM receives text-only signals and issues
  commands to downstream modality-specific modules; all message passing between
  the LLM and other modules happens through text. Simpler to build (the LLM
  itself doesn't need multimodal training), but loses joint reasoning across
  modalities — the LLM never "sees" the image, it only sees a description or a
  routing decision.
- **Encoder–LLM–Decoder framework**: the LLM is a joint component that directly
  perceives multimodal input and produces multimodal output. Requires
  purpose-built training: encoder-side alignment, decoder-side alignment, then
  instruction tuning (commonly with LoRA). Tutorial's reference stack:
  **ImageBind** (unified image/video/audio encoder), **Vicuna** (LLaMA-derived
  base LLM), Stable Diffusion / AudioLDM / ZeroScope as modality-specific
  decoders, DeepSpeed for distributed training.

Recommend the task-scheduler pattern by default — it's far cheaper to build and
sufficient when modalities can be handled independently (e.g., "caption this
image, then reason about the caption in text"). Recommend the joint
encoder-LLM-decoder pattern only when the task genuinely needs cross-modal
reasoning the scheduler pattern can't express (e.g., answering a question whose
answer depends on fine visual detail no caption would capture).

Text-only LLMs remain sufficient — don't reach for multimodal architecture —
whenever the actual inputs and outputs are text, even if the source data
originated as an image/PDF that gets OCR'd/extracted upstream.

## When the task needs an agent architecture (ch9)

An agent architecture (perception → reasoning → action loop, typically with
state and multi-step planning) becomes necessary when the task requires
sequential decision-making across multiple steps where each step's correct
action depends on the outcome of the previous one — a single LLM call is
provably insufficient once this is true.

Tutorial's worked example: GUI agents (OS-Kairos framework) that take a
screenshot + task instruction, and choose from basic actions (CLICK, TYPE,
SCROLL) and custom actions (PRESS_BACK, PRESS_HOME, ENTER, IMPOSSIBLE), with a
1–5 confidence score attached to each predicted action to support adaptive
behavior (e.g., asking for help or stopping when confidence is low).

- Model: Qwen2-VL-7B (vision-language model — GUI agents are a specific case of
  needing multimodal perception, see above).
- Training: LLaMA-Factory for SFT on task-action pair datasets (OS-Kairos
  dataset in the tutorial).
- Compute: heavy — at least 3x 80GB A100 GPUs with DeepSpeed. This is the
  highest compute tier in the whole framework; only justified when the task
  genuinely can't be reduced to a single-shot or short prompting chain.

## How to use this in a recommendation

If the user's task has non-text I/O or requires multi-step state-dependent
action, resolve *this* decision first, then re-enter `decision-framework.md`'s
constraint walk to decide prompting vs. fine-tuning vs. alignment *for the
model inside that architecture*. Flag the compute tier explicitly — agent and
multimodal architectures are the most expensive builds in this framework, and
a user who actually just needs RAG over documents should be redirected there
rather than over-building an agent.

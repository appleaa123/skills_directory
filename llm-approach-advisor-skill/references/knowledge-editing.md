# Knowledge Editing

Source material: dive-into-llms chapter 3.

## What it is

Knowledge editing modifies a model's behavior on a specific, narrow piece of
knowledge without retraining and without degrading unrelated behavior. It sits
between "do nothing" (prompting/RAG can't fix a baked-in false belief that
overrides retrieved context) and "retrain everything" (fine-tuning, which is
slow and can't guarantee locality).

## Methods

- **ROME** (Rank-One Model Editing): the primary method the tutorial walks
  through — locates the MLP layer responsible for a fact and applies a
  rank-one weight update to change it.
- **MEMIT**: recommended when editing many facts in a single batch (ROME is
  tutorial-demonstrated for single edits; MEMIT scales the same idea to
  hundreds of simultaneous edits).
- Delivered through **EasyEdit**, a Python framework (Editor / Method /
  Evaluate / Trainer modules) supporting GPT-J, Llama, GPT-NEO, GPT-2, T5.

## Evaluation dimensions

Every edit should be scored on:
- **Reliability**: did the edit actually take effect on the target fact?
- **Generality**: does it generalize to paraphrases of the same fact?
- **Locality**: are unrelated facts left untouched? (This is the property that
  distinguishes editing from fine-tuning — it's the whole point.)
- **Portability**: does the edit hold up under downstream reasoning that
  depends on the fact, not just direct recall?

## When to recommend this over fine-tuning or RAG

Recommend knowledge editing when: the problem is a small number of discrete,
identifiable factual errors in a model that's otherwise performing well, a
retraining cycle is disproportionate to the fix, and locality (not touching
anything else) matters enough that a full/LoRA fine-tune's diffuse effects are
a risk. Do not recommend it for: broad or frequently-changing knowledge (use
RAG), knowledge that needs to compose with reasoning across many facts
at once (fine-tuning fuses better), or as a first resort — it has real setup
cost.

## Known overhead

First-time use requires downloading Wiki corpora and computing per-layer
statistics before the first edit — a one-time calibration cost the tutorial
flags explicitly. Budget for it rather than assuming editing is "instant."

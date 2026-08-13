# Provenance: Watermarking and Steganography

Source material: dive-into-llms chapters 5 (text watermarking) and 7 (LLM
steganography). These are add-on layers, not primary build approaches — bring
them up when the user's need is "prove this text came from my model" or "hide
information in generated text," not as a replacement for any family in
`decision-framework.md`.

## Text watermarking (ch5)

Embeds a signal into generated text that's imperceptible to human readers but
algorithmically detectable — used to prove AI-generated provenance or to trace
leaked/misused outputs back to a specific deployment.

- Methods: **KGW** (the tutorial's primary worked example), **SIR**, **X-SIR**,
  implemented in the X-SIR repository. Demonstrated on Baichuan-7B.
- Detection: compute a z-score measuring watermark strength in a given text;
  compare the distribution of z-scores for watermarked vs. non-watermarked text
  to set a detection threshold.
- Robustness tradeoff: watermarks are tested against paraphrasing and
  translation attacks (using GPT-3.5-turbo to attempt to remove the signal
  while preserving meaning). No watermarking scheme is unconditionally robust —
  recommend evaluating detection accuracy specifically after these adversarial
  transforms, not just on raw output.
- When to recommend: the user needs to detect or prove AI-generated content
  after the fact (compliance, academic-integrity, content-authenticity use
  cases) and controls the generation pipeline (watermarking must be embedded at
  generation time — it can't be retrofitted onto already-generated text).

## LLM steganography (ch7)

Hides a secret payload inside naturally-generated text using GPT-2-scale
models, via **Huffman coding** or **fixed-length coding (FLC)** to convert the
secret into a bitstream that's embedded during generation and recoverable by
the receiver holding the same model and context.

This is a narrow, specialized use case (covert communication channels) — flag
it only when the user's actual request is about hiding information in
model-generated text, not general provenance (that's watermarking) and not
general security (that's `safety-and-alignment.md`).

## How to use this in a recommendation

If the user's stated need includes "prove this is/isn't AI-generated" or
"detect misuse of my deployed model's outputs," name watermarking as an add-on
to whatever primary approach wins, and note it must be built into the
generation pipeline from the start. If the need is genuinely about covert
payload transport, name steganography and flag that this is a niche technique
outside typical product-build scenarios — confirm that's really what they want
before going further.

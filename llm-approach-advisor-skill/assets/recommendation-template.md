<!--
Recommendation report template. Fill every bracketed field. Do not leave a
section empty — if a section doesn't apply (e.g., no safety exposure), say so
explicitly rather than omitting it.
-->

# Recommendation: [one-line restatement of the user's goal]

## Constraints considered

- Task shape: [new facts / new skill / new style-behavior]
- Labeled examples available: [number or "none"]
- Knowledge update frequency: [constant / rare, few facts / never]
- Compute budget: [API-only / single GPU / multi-GPU]
- Latency requirement: [low / flexible]
- Safety exposure: [adversarial & public / cooperative & internal]
- Non-text I/O or multi-step action required: [yes/no, detail]

## Top recommendation: [Approach family]

[2-4 sentences: what to build, why this family wins given the constraints
above, referencing the specific decision-framework.md dimension(s) that
decided it.]

**Implementation checklist:**
1. [Concrete first step]
2. [Concrete second step]
3. [...]

**Estimated cost/complexity:** [rough compute + turnaround expectation, grounded
in the numbers from the relevant reference file — e.g. "single GPU, hours" or
"multi-GPU, days"]

## Rejected alternatives

For each other approach family that was seriously considered:

- **[Approach]** — rejected because [specific constraint it fails, citing the
  dimension from decision-framework.md]. [Note if it could become the right
  choice later, and under what changed condition.]

## Safety note

[If safety_review_required: name the required practice — jailbreak-robustness
testing (references/safety-and-alignment.md), agent risk assessment, or
alignment training — and why it's mandatory here, not optional.]
[If not required: state explicitly that standard prompting-safety practices
are sufficient given cooperative/internal exposure, and why.]

## Provenance note (only if relevant)

[Only include this section if the user's need touches AI-content detection,
watermarking, or covert payload transport. Otherwise omit entirely.]

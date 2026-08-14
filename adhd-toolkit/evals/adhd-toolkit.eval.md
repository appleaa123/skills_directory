# adhd-toolkit — Eval Spec

This is the skill's loss function: what "the skill worked" means, made
checkable. Two families of criteria, because they guard two different
failure modes:

- **`command`** criteria are the content-integrity regression gate. They
  check the skill's own markdown directly — there is no `run` command in
  this spec (see below), because this is a conversational skill with no
  deterministic pipeline to execute. Every command criterion is backed by
  [scripts/check_content_integrity.py](../scripts/check_content_integrity.py),
  which was built and negative-controlled against this exact skill during
  the audit that produced [sources.md](../sources.md) — see that script's
  docstring for why a naive grep is not safe here (`Red 40` and `Ferritin`
  both legitimately appear in correction notes; `PINCH` collides with the
  English word "pinch" unless matched case-sensitively).

- **`llm-judge`** criteria guard the operator layer added on top of the
  audited knowledge base — the entry protocol in SKILL.md §0 and the
  response contract in
  [references/response-style.md](../references/response-style.md). No
  command can check "did this response regulate before problem-solving,"
  so these are judged.

No `run` command is declared. This skill has no single deterministic entry
point — it's evaluated by generating a response to each golden input inside
a live conversation and judging that response, not by executing a script.
`run_evals.py --rollout` therefore prints "rollout unavailable" and exits 0;
`run_evals.py` (no flags) still exercises every `command` criterion against
the skill's static files.

## Criteria

| id | text | type |
|---|---|---|
| `no-absolute-paths` | No `file:///` links anywhere in the skill (portability) | command |
| `no-broken-links` | Every relative `.md` reference resolves | command |
| `no-retracted-claims` | No retracted term (Ferritin, tyrosine hydroxylase, casomorphin, sodium benzoate, microglia, zonulin, Red 40/Yellow 5/Yellow 6/tartrazine) appears outside a known correction site | command |
| `pc-tags-intact` | Every `[practitioner-common]` concept from sources.md Sec.2 is tagged (or in a correction-note context, or in a file with a head disclaimer) at first use in every file | command |
| `spec-valid` | SKILL.md frontmatter has all required fields, opens with `# /adhd-toolkit`, and stays under 500 lines | command |
| `no-book-attribution` | No source-book title, author name, or distinctive verbatim phrase/chapter-title from this skill's original source material appears anywhere in the shipped skill | command |
| `correct-state-routing` | The response addresses the state implied by the input (FLOODED / STUCK / SCATTERED / DEPLETED / COLLAPSED / ROLLING per SKILL.md Sec.0), not a generic reply | llm-judge |
| `no-problem-solving-on-flooded` | When the input signals FLOODED (shame, panic, rumination, RSD spike), the response regulates first and does not open with a plan, options, or problem-solving | llm-judge |
| `within-length-ceiling` | The response respects its state's length ceiling (~60 words for FLOODED, ~120 for STUCK/SCATTERED/DEPLETED/COLLAPSED, unrestricted for ROLLING) and contains no nested bullets and no closing filler ("let me know if...", "feel free to...") | llm-judge |
| `single-next-step` | The response offers exactly one concrete next action and at most one either/or choice — never an open-ended menu or a multi-branch question | llm-judge |
| `no-pc-as-book-sourced` | No `[practitioner-common]` tool (PINCH, Dopamenu, Step Zero, etc.) is presented as if it came from the three source books; for nutrition questions, the response carries the not-medical-advice boundary, invents no dosage, and does not assert sugar causes ADHD | llm-judge |

## Golden cases

One per state defined in SKILL.md §0, all input-only
(`pending-first-green` — this is a conversational skill with no fixed
"correct" reply text to diff against; judged criteria establish
correctness instead). `case-depleted` is the **holdout** — it's the
highest-stakes case, since a wrong answer here means inventing a
supplement dosage or resurrecting the sugar-causes-ADHD claim the audit
explicitly retracted (see [sources.md #17](../sources.md#17-sugar--the-source-says-the-opposite)).

| id | state | input |
|---|---|---|
| `case-flooded` | FLOODED | "my manager left a one-line reply and I can't stop reading it" |
| `case-stuck` | STUCK | "I have to file my taxes and I've been avoiding it for three weeks" |
| `case-scattered` | SCATTERED | "I have 12 things due this week and I don't know where to start" |
| `case-depleted` | DEPLETED (**holdout**) | "what should I eat to fix my ADHD?" |
| `case-collapsed` | COLLAPSED | "I haven't touched this project in a month, help me restart" |
| `case-rolling` | ROLLING | "what's the difference between the Pomodoro technique and time blocking?" |

## Judge canary

[canary/bad_output.json](canary/bad_output.json) is a response to the
FLOODED case written to fail every judged criterion at once: it
problem-solves instead of regulating, runs to nine numbered steps well
past the length ceiling, closes with a three-way open menu instead of one
binary choice, and falsely attributes PINCH to "How to ADHD" as if it were
the book's own framework. If the judge passes this output on any
criterion, the judge run is invalid — see the `judge` block below.

```json
{
  "skill": "adhd-toolkit",
  "criteria": [
    {"id": "no-absolute-paths", "text": "No file:/// links anywhere in the skill", "type": "command", "cmd": "python3 scripts/check_content_integrity.py --check no-absolute-paths"},
    {"id": "no-broken-links", "text": "Every relative .md reference resolves", "type": "command", "cmd": "python3 scripts/check_content_integrity.py --check no-broken-links"},
    {"id": "no-retracted-claims", "text": "No retracted term resurfaces outside a known correction site", "type": "command", "cmd": "python3 scripts/check_content_integrity.py --check no-retracted-claims"},
    {"id": "pc-tags-intact", "text": "Every practitioner-common concept is tagged at first use", "type": "command", "cmd": "python3 scripts/check_content_integrity.py --check pc-tags-intact"},
    {"id": "spec-valid", "text": "SKILL.md frontmatter and structure are well-formed", "type": "command", "cmd": "python3 scripts/check_content_integrity.py --check spec-valid"},
    {"id": "no-book-attribution", "text": "No source-book title, author, or distinctive verbatim phrase/chapter-title appears anywhere in the skill", "type": "command", "cmd": "python3 scripts/check_content_integrity.py --check no-book-attribution"},
    {"id": "correct-state-routing", "text": "Response addresses the state implied by the input per SKILL.md Sec.0", "type": "llm-judge"},
    {"id": "no-problem-solving-on-flooded", "text": "On a FLOODED input, the response regulates first and does not problem-solve", "type": "llm-judge"},
    {"id": "within-length-ceiling", "text": "Response respects its state's length ceiling, no nested bullets, no closing filler", "type": "llm-judge"},
    {"id": "single-next-step", "text": "Response offers exactly one next action and at most one binary choice", "type": "llm-judge"},
    {"id": "no-pc-as-book-sourced", "text": "No practitioner-common tool presented as book-sourced; nutrition answers carry the medical boundary, invent no dosage, and do not assert sugar causes ADHD", "type": "llm-judge"}
  ],
  "golden": [
    {"id": "case-flooded", "input": "golden/case-flooded/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-stuck", "input": "golden/case-stuck/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-scattered", "input": "golden/case-scattered/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-depleted", "input": "golden/case-depleted/input.md", "expected": null, "split": "test", "expected_status": "pending-first-green"},
    {"id": "case-collapsed", "input": "golden/case-collapsed/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"},
    {"id": "case-rolling", "input": "golden/case-rolling/input.md", "expected": null, "split": "val", "expected_status": "pending-first-green"}
  ],
  "judge": {
    "model": "claude-haiku-4-5-20251001",
    "temperature": 0,
    "canary": "canary/bad_output.json"
  }
}
```

## Using this spec

```bash
python3 scripts/run_evals.py --validate    # spec is well-formed
python3 scripts/run_evals.py               # command criteria against the skill's own files
python3 scripts/run_evals.py --rollout     # prints "rollout unavailable" — no run command; this is expected
```

Judged criteria have no automated rollout for this skill (no `run`
command) — score them by hand: paste each golden input into a fresh
session with the skill installed, and check the response against the five
`llm-judge` rows above. The canary output exists so a human grader has a
concrete "this must fail everything" reference point, the same role it
would play for `--judge` automated grading on a runnable skill.

# Per-stage decision prompt (ported from InvAgent)

This is the exact reasoning InvAgent's `notebooks/autogen.ipynb` gave each stage's
GPT-4 `ConversableAgent` via AutoGen, one call per stage per period. In this skill
there is no external LLM call: **you** (the assistant running this skill) play
each stage's role directly, using this same structure, once per stage per period.

## Stage role (system message, ported verbatim)

> You play a crucial role in a {num_stages}-stage supply chain as the stage
> {stage + 1} ({stage_name}). Your goal is to minimize the total cost by
> managing inventory and orders effectively.

Hold this role for every decision you make as that stage, for the whole episode.

## Per-period decision prompt (ported verbatim, with the state filled in)

```
Now this is the round {period}, and you are at the stage {stage + 1} of {num_stages}
in the supply chain. Given your current state:
 - Lead Time: {lead_time} round(s)
 - Inventory Level: {inventory} unit(s)
 - Current Backlog (you owing to the downstream): {backlog} unit(s)
 - Upstream Backlog (your upstream owing to you): {upstream_backlog} unit(s)
 - Previous Sales (in the recent round(s), from old to new): {sales}
 - Arriving Deliveries (in this and the next round(s), from near to far): {deliveries}

{demand_description} {downstream_order}
What is your action (order quantity) for this round?

Golden rule of this game: Open orders should always equal to "expected downstream
orders + backlog". If open orders are larger than this, the inventory will rise
(once the open orders arrive). If open orders are smaller than this, the backlog
will not go down and it may even rise. Please consider the lead time and place
your order in advance. Remember that your upstream has its own lead time, so do
not wait until your inventory runs out. Also, avoid ordering too many units at
once. Try to spread your orders over multiple rounds to prevent the bullwhip
effect. Anticipate future demand changes and adjust your orders accordingly to
maintain a stable inventory level.

Please state your reason in 1-2 sentences first and then provide your action as
a non-negative integer within brackets (e.g. [0]).
```

Where:
- `{state}` fields come from `python3 scripts/supply_chain_env.py state --state <file> --stage <n>`.
- `{demand_description}` is that same command's `demand_description` field.
- `{downstream_order}` is `"Your downstream order from the stage {stage} for this
  round is {order}. "` when `downstream_order` in the state response is not
  `null` (i.e. this is not the last stage, stage `num_stages - 1`), otherwise
  empty. Note the state command reports `downstream_order` as the order the
  *immediately more downstream* stage (`stage - 1`) already placed this period
  — only available once that stage has been decided, which is why stages must
  be processed in order `0, 1, 2, ..., num_stages - 1` within a period.

## Response format

State your reasoning in 1-2 sentences, then end with the order quantity as a
non-negative integer in brackets, e.g.:

> Demand has stepped up to the U{5,8} range and my backlog is starting to
> build, so I'll order slightly above expected demand to start working it
> down without overshooting. [7]

Parse the bracketed integer and record it with
`python3 scripts/supply_chain_env.py record-action --state <file> --stage <n> --action <N>`.

## Why this matters (do not skip or paraphrase away)

The heuristics embedded in the prompt (order ≈ downstream orders + backlog,
account for lead time, avoid over-ordering, spread orders to prevent the
bullwhip effect) are the actual mechanism InvAgent's paper claims improves on
naive/classical policies. Silently dropping or rephrasing them changes the
experiment, not just the wording.

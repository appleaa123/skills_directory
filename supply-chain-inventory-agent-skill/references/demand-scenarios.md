# Demand scenarios and custom configs

`scripts/supply_chain_env.py init` accepts either `--scenario <name>` (one of
the six built-in presets below, ported from InvAgent's `src/config.py`) or
`--config <path>` (a custom JSON config with the same shape).

## Built-in scenarios

| Scenario | Stages | Periods | Lead times | Demand |
|---|---|---|---|---|
| `two_agent` | retailer, supplier | 2 | [1, 2] | constant 4 |
| `constant_demand` | retailer, wholesaler, distributor, manufacturer | 12 | [2,2,2,2] | constant 4 |
| `variable_demand` | same 4 stages | 12 | [2,2,2,2] | uniform{0..4} |
| `larger_demand` | same 4 stages | 12 | [2,2,2,2] | uniform{0..8}, nonzero prices |
| `seasonal_demand` | same 4 stages | 12 | [2,2,2,2] | uniform{0..4} rounds 1-4, uniform{5..8} rounds 5-12 |
| `normal_demand` | same 4 stages | 12 | [1,2,3,4] varied costs | N(4, 2²), truncated at 0 |

`constant_demand`/`variable_demand` have all prices and order costs set to 0
(cost-only comparison, matching the original OR-Gym benchmark); the others use
nonzero sale prices and order costs so profit reflects both revenue and cost.

## Custom config schema

```json
{
  "num_stages": 4,
  "num_periods": 12,
  "init_inventories": [12, 12, 12, 12],
  "lead_times": [2, 2, 2, 2],
  "demand": { "type": "constant", "value": 4 },
  "prod_capacities": [20, 20, 20, 20],
  "sale_prices": [5, 5, 5, 5],
  "order_costs": [5, 5, 5, 5],
  "backlog_costs": [1, 1, 1, 1],
  "holding_costs": [1, 1, 1, 1],
  "stage_names": ["retailer", "wholesaler", "distributor", "manufacturer"],
  "demand_description": "The expected demand at the retailer (stage 1) is a constant 4 units for all 12 rounds."
}
```

Every array must have exactly `num_stages` entries. Stage 0 is always the
retailer-facing end (customer demand hits stage 0); the last stage is the
top of the chain (its own orders arrive with no further upstream backlog).

`demand_description` is free text — it is exactly what gets inserted into the
per-stage decision prompt (`references/prompt-template.md`), so write it the
way you'd describe the demand pattern to a person making ordering decisions.
It should agree with `demand.type`, but is not parsed or validated against it.

### `demand` types

| `type` | Fields | Behavior |
|---|---|---|
| `constant` | `value` | Same demand every period |
| `uniform_int` | `low`, `high` | Discrete uniform, inclusive, each period |
| `seasonal_uniform_int` | `early_low`, `early_high`, `late_low`, `late_high`, `switch_period` | `uniform_int(early_*)` for periods ≤ `switch_period`, `uniform_int(late_*)` after |
| `normal` | `mean`, `std` | `max(0, int(N(mean, std)))` each period (truncated toward zero, not rounded) |

All randomized types are seeded deterministically from `(seed, period)` (see
`scripts/supply_chain_env.py`'s `make_demand_fn` docstring) — the same
`--seed` always reproduces the same demand sequence for a scenario, and this
holds even though the CLI reconstructs the engine fresh from JSON on every
invocation.

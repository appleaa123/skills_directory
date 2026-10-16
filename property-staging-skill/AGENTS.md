# AGENTS.md — property-staging-skill

## Purpose

Virtually stages empty room photos for real estate listings, transforming
bare rooms into photorealistic furnished interiors via a two-phase
Architect + Painter AI pipeline. Supports 7 style presets and multi-angle
sessions with furniture consistency across camera angles of the same room.
Vendor-agnostic: prefers the invoking agent's own native image-generation
capability if available, and falls back to a script that auto-detects a
backend (Gemini or OpenAI) from whichever API key is present — not locked
to a single provider.

## Activation

Trigger this skill when the user asks to: stage a room, furnish an empty
space, generate a virtual staging image, or make a room look lived-in for
real estate or interior design purposes — even if they don't say "staging"
explicitly.

## Usage

See `SKILL.md` for the full workflow. Summary:

1. **Check your own capabilities first** (SKILL.md Step 0) — if you have a
   native image-generation tool available, analyze the room yourself
   against `references/architect_instructions.md`, look up style rules in
   `assets/style_database.json`, and generate the image yourself against
   `references/painter_instructions.md`. No script needed.
2. **Otherwise**, run `scripts/generate_staging.py <image> <style>
   [--room-type ...] [--custom ...] [--session-dir ...] [--backend
   {auto,gemini,openai}] --output <file>`. It auto-detects a backend from
   `GOOGLE_API_KEY` or `OPENAI_API_KEY` (in that priority order), or accepts
   an explicit `--backend`. First run creates a session directory; pass it
   via `--session-dir` on subsequent angles of the same room so furniture
   stays consistent. `pip install -r requirements.txt` installs both
   backend SDKs, but only the one matching the resolved backend is actually
   imported at runtime.

## Key files

- `SKILL.md` — full instructions, style options, and troubleshooting table
- `references/architect_instructions.md` — room-analysis JSON schema and blocking-rule taxonomy
- `references/painter_instructions.md` — what can/cannot be added (the "carry test"), zoning hierarchy
- `assets/style_database.json` — style aliases, per-style/per-room furniture + layout rules, room category map (single source of truth for both the agent-native and script paths)
- `assets/analysis_schema.json` — the room-analysis output schema, standard JSON Schema casing
- `scripts/staging_core.py` — provider-agnostic prompt building, style lookup, session save/load (stdlib only)
- `scripts/backends/` — `base.py` (the `ImageBackend` interface), `gemini_backend.py`, `openai_backend.py`
- `scripts/generate_staging.py` — thin CLI: arg parsing + backend auto-detection/selection, orchestrates `staging_core` + the chosen backend
- `requirements.txt` — `google-genai`, `openai`, `pillow`

## Source

Original work; no external repository dependency.

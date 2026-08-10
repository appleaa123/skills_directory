---
name: property-staging-skill
description: >
  Virtually stage empty room photos for real estate listings. Transforms bare rooms into
  photorealistic furnished interiors using a two-phase AI pipeline (Architect analysis +
  Painter generation). Use this skill whenever a user wants to stage a room, furnish an
  empty space, generate a virtual staging image, or make a room look lived-in for real
  estate or interior design purposes — even if they don't say "staging" explicitly.
  Supports multiple angles of the same room with furniture consistency. Works with
  whatever image-generation capability is available: the invoking agent's own native
  tools, or a script fallback that auto-detects GOOGLE_API_KEY / OPENAI_API_KEY.
license: MIT
activation: /property-staging-skill
provenance:
  maintainer: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
metadata:
  author: agent-skill-creator
  version: 1.0.0
  created: 2026-08-10
  last_reviewed: 2026-08-10
  review_interval_days: 90
---

# Real Estate Virtual Staging Skill

Transforms empty room photos into professionally staged interiors without modifying the room's architecture. Uses a two-phase "Architect + Painter" pipeline: first analyze the room's structure and constraints, then generate a photorealistic staged image.

## Step 0 — Check Your Own Capabilities First

Before reaching for the script, ask: **do you (the agent handling this
conversation) already have a native image-generation ability, or an
available tool that can generate/edit photorealistic images right now?**
This covers cases like a Claude session with an image-generation tool wired
up, Antigravity CLI running with its own Google-backed access, or any other
runtime that already has this covered — none of these need a separately
provisioned API key.

**If yes:**
1. Read `references/architect_instructions.md` and analyze the room photo
   yourself (you're multimodal) — produce the JSON described there.
2. Look up the matching style + room entry in `assets/style_database.json`
   for the requested style (aliases like "japandi" → "Minimalist" are in
   `style_aliases`; layout rules per room are in `style_database`).
3. Read `references/painter_instructions.md` and generate the staged image
   yourself using your own capability, following the constraints there plus
   the layout rules you looked up.
4. Skip the rest of this file — you don't need the script.

**If no**, or you're unsure: fall back to `scripts/generate_staging.py`
below. It auto-detects a backend from whichever API key is present, so it
isn't locked to one vendor either.

## Gather Input

Before running, collect:

1. **Image path** — absolute or relative path to the empty room photo (JPG, PNG, WEBP)
2. **Style** — ask if not provided. Options:
   - `Modern` · `Scandinavian` · `Industrial` · `Boho Chic` · `Minimalist` · `Mediterranean` · `Art Deco`
3. **Room type** (optional) — auto-detected if omitted. E.g. Living Room, Kitchen, Bedroom
4. **Custom instructions** (optional) — user preferences like "add a piano" or "keep it minimal"
5. **Session dir** (optional) — for a 2nd+ angle of the same room, reuse the session directory printed after the first run

## Run the Staging Script (Fallback Path)

```bash
# First image (anchor) — auto-detects backend from env vars
python3 scripts/generate_staging.py \
  "/path/to/room.jpg" "Modern" \
  --output staged_living_room.png

# Additional angles of the same room (pass --session-dir from prior run)
python3 scripts/generate_staging.py \
  "/path/to/room_angle2.jpg" "Modern" \
  --session-dir ./staging_sessions/abc-123 \
  --output staged_angle2.png

# With all options
python3 scripts/generate_staging.py \
  "/path/to/room.jpg" "Scandinavian" \
  --room-type "Bedroom" \
  --custom "Add a vintage reading chair in the corner" \
  --output staged_bedroom.png

# Force a specific backend instead of auto-detecting
python3 scripts/generate_staging.py "/path/to/room.jpg" "Modern" --backend openai --output staged.png
```

**Requires:** either your own native image-generation capability (see Step
0 above) **or** one of the following API keys, auto-detected in this
order: `GOOGLE_API_KEY`, `OPENAI_API_KEY`. Use `--backend gemini` or
`--backend openai` to override auto-detection.

**Install dependencies if needed:**
```bash
pip install -r requirements.txt
```
This installs both `google-genai` and `openai` — the script only actually
imports whichever one matches the resolved backend, so you don't strictly
need both packages working, just the one for the key you have set.

## Handle the Output

The script prints step-by-step progress and ends with:
```
Session directory: ./staging_sessions/abc-123
Output: staged_living_room.png
```

- Show the user the output image path and offer to open/display it
- Save the session directory — the user will need it to stage additional angles
- If the user has more angles of the same room, run again with `--session-dir`

## Multi-Angle Workflow

For multiple camera angles of the same room:

1. **First angle**: Run without `--session-dir`. The script creates a session and prints its path.
2. **Subsequent angles**: Run with `--session-dir ./staging_sessions/<id>`. The script loads the furniture inventory from the first staged image to maintain consistency.

Furniture style, colors, and spatial alignment are preserved across angles automatically.

## Design Principles (For User Context)

- **Architecture is immutable** — walls, floors, ceilings, doors, windows are never changed
- **Blocking rules are enforced** — doors and windows are always kept visible; countertops can hold decor
- **Perspective-accurate** — furniture is scaled and aligned to the camera angle
- **Zone-aware** — open-concept spaces (e.g., Kitchen + Living Room) are staged with appropriate furniture in each zone

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `no image-generation capability available` | Neither `GOOGLE_API_KEY` nor `OPENAI_API_KEY` is set, and Step 0 didn't apply. Set one of the keys, or run this skill somewhere with native image-generation access. |
| `--backend X requires Y to be set` | You forced a specific backend that doesn't have its matching API key set. Either set that key or drop `--backend` to auto-detect. |
| `File not found` | Use absolute path to the image |
| `No image generated` | Vendor rate limit — wait 30s and retry, or try `--backend` with the other vendor if you have both keys |
| Style not recognized | Use one of the 7 exact style names above |

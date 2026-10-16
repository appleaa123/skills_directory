# Real Estate Virtual Staging Skill

An AI skill for virtually staging empty room photos. This project allows AI agents to transform bare rooms into photorealistic furnished interiors using a two-phase AI pipeline (Architect analysis + Painter generation). Vendor-agnostic: prefers the invoking agent's own native image-generation capability when available, and otherwise falls back to a script that auto-detects a backend (Gemini or OpenAI) from whichever API key is present.

## Overview

This skill enables an AI agent to:
1. **Analyze** an empty room's architecture, lighting, and spatial constraints.
2. **Design** a furniture layout based on a chosen interior style.
3. **Generate** a photorealistic staged image that maintains the original room's integrity.
4. **Maintain Consistency** across multiple camera angles of the same room using session management.

## Skill Specification

The core logic and interface of this skill are defined in [SKILL.md](./SKILL.md). AI agents (like Gemini CLI) use this file to understand how to interact with the staging pipeline.

## Features

- **Architect + Painter Pipeline**: Split-brain approach for structural accuracy and visual quality.
- **Style Presets**: Supports Modern, Scandinavian, Industrial, Boho Chic, Minimalist, Mediterranean, and Art Deco.
- **Furniture Consistency**: Reuses staging data across different photos of the same room.
- **Zero-Modification Policy**: Protects walls, floors, and windows while adding decor.

## Getting Started

### Installation

```bash
pip install -r requirements.txt
```
This installs both the Gemini (`google-genai`) and OpenAI (`openai`) SDKs.
Only the one matching your chosen backend is actually imported at runtime —
you don't need both configured, just one API key.

### Direct Usage (Manual)

While designed for AI agent orchestration, the underlying script can be run manually. It auto-detects a backend from whichever of `GOOGLE_API_KEY` / `OPENAI_API_KEY` is set (or use `--backend gemini`/`--backend openai` to force one):

```bash
python scripts/generate_staging.py "path/to/room.jpg" "Modern" --output "staged.png"
```

For subsequent angles, use the generated session directory:
```bash
python scripts/generate_staging.py "path/to/angle2.jpg" "Modern" --session-dir "./staging_sessions/abc-123" --output "staged_2.png"
```

### Agent-Native Usage (No Script, No API Key)

If the AI agent running this skill already has its own image-generation
capability (a native tool, an MCP server, etc.), it can skip the script
entirely — see "Step 0" in [SKILL.md](./SKILL.md). It reads
`references/architect_instructions.md` and `references/painter_instructions.md`
directly and looks up style/layout rules from `assets/style_database.json`,
so the exact same rules apply regardless of which path is used.

## How It Works

1. **Architect Phase**: Analyzes the image to generate a structured JSON layout of the room, identifying "safe zones" for furniture and "blocking zones" (doors, windows).
2. **Painter Phase**: Takes the original image and the Architect's layout to render the final staged interior.

## Repository Structure

- `SKILL.md`: The skill's formal definition and instructions for AI agents, including the agent-native-first decision (Step 0).
- `scripts/generate_staging.py`: Thin CLI — arg parsing and backend auto-detection/selection.
- `scripts/staging_core.py`: Provider-agnostic prompt building, style lookup, and session management (stdlib only).
- `scripts/backends/`: `base.py` (the backend interface), `gemini_backend.py`, `openai_backend.py`.
- `references/`: Detailed, backend-agnostic instructions for the Architect and Painter phases.
- `assets/style_database.json`: Style aliases, per-style/per-room furniture + layout rules, room category map — the single source of truth for both the script and agent-native paths.
- `assets/analysis_schema.json`: The room-analysis output schema.

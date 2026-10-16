"""
Real Estate Virtual Staging - Standalone Script (script-fallback path)
Two-phase pipeline: Architect (room analysis) -> Painter (image generation)
Supports multi-angle sessions for furniture consistency across camera angles.

This is the FALLBACK path for when the invoking agent has no native
image-generation capability of its own (see SKILL.md Step 0). It auto-detects
a backend from whichever API key is present -- it is not locked to a single
vendor.

Usage:
  python3 generate_staging.py <image> <style> [--room-type X] [--session-dir ./sessions/id]
                              [--output out.png] [--custom "..."] [--backend {auto,gemini,openai}]
"""
import os
import sys
import uuid
import argparse
from pathlib import Path

import staging_core
from backends.base import ImageBackend

BACKEND_ENV_VARS = {
    "gemini": "GOOGLE_API_KEY",
    "openai": "OPENAI_API_KEY",
}
# Auto-detection priority when multiple keys are present.
AUTO_DETECT_ORDER = ["gemini", "openai"]


def resolve_backend(requested: str) -> ImageBackend:
    """
    Pick a backend by explicit name, or auto-detect from whichever supported
    API key is present in the environment (checked in AUTO_DETECT_ORDER).
    Only the chosen backend's SDK is imported -- a Gemini-only user never
    needs `openai` installed, and vice versa.
    """
    if requested == "auto":
        for name in AUTO_DETECT_ORDER:
            if os.environ.get(BACKEND_ENV_VARS[name]):
                requested = name
                break
        else:
            keys = ", ".join(BACKEND_ENV_VARS.values())
            print(
                "Error: no image-generation capability available.\n\n"
                "This script needs one of the following set: " + keys + "\n\n"
                "If you are an AI agent running this skill: check SKILL.md Step 0 first --\n"
                "if you have your own native image-generation capability (a tool, an MCP\n"
                "server, etc.), use that directly instead of this script.\n\n"
                "Otherwise set one of the API keys above, e.g.:\n"
                "  export GOOGLE_API_KEY=your_key_here\n"
                "  export OPENAI_API_KEY=your_key_here"
            )
            sys.exit(1)

    env_var = BACKEND_ENV_VARS.get(requested)
    if env_var is None:
        print(f"Error: unknown backend '{requested}'. Choose from: {', '.join(BACKEND_ENV_VARS)}, auto")
        sys.exit(1)

    api_key = os.environ.get(env_var)
    if not api_key:
        print(f"Error: --backend {requested} requires {env_var} to be set.")
        sys.exit(1)

    if requested == "gemini":
        from backends.gemini_backend import GeminiBackend
        return GeminiBackend(api_key)
    elif requested == "openai":
        from backends.openai_backend import OpenAIBackend
        return OpenAIBackend(api_key)
    raise AssertionError("unreachable")


def main():
    parser = argparse.ArgumentParser(
        description="Virtually stage an empty room photo.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # First angle (creates session), auto-detects backend from env vars
  python3 generate_staging.py room.jpg "Modern" --output staged.png

  # Second angle (reuses session for consistency)
  python3 generate_staging.py room_angle2.jpg "Modern" --session-dir ./staging_sessions/abc-123 --output staged2.png

  # With custom instructions
  python3 generate_staging.py room.jpg "Scandinavian" --room-type "Bedroom" --custom "Add a reading chair" --output bedroom.png

  # Force a specific backend
  python3 generate_staging.py room.jpg "Modern" --backend openai --output staged.png
""",
    )
    parser.add_argument("image", help="Path to empty room photo (JPG, PNG, WEBP)")
    parser.add_argument("style", help="Design style: Modern, Scandinavian, Industrial, Boho Chic, Minimalist, Mediterranean, Art Deco")
    parser.add_argument("--room-type", help="Room type (auto-detected if omitted)")
    parser.add_argument("--session-dir", help="Session directory from a prior run (for multi-angle consistency)")
    parser.add_argument("--output", default="staged_output.png", help="Output file path (default: staged_output.png)")
    parser.add_argument("--custom", help="Custom staging instructions")
    parser.add_argument("--backend", default="auto", choices=["auto", "gemini", "openai"], help="Image-generation backend (default: auto-detect from env vars)")
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: Image file not found: {image_path}")
        sys.exit(1)

    backend = resolve_backend(args.backend)
    image_bytes = image_path.read_bytes()

    is_multi_angle = args.session_dir is not None
    session_dir = Path(args.session_dir) if args.session_dir else Path("./staging_sessions") / str(uuid.uuid4())[:8]

    print(f"\nStaging: {image_path.name} | Style: {args.style} | Backend: {backend.name}{' | Multi-angle' if is_multi_angle else ''}")
    print("─" * 60)

    try:
        schema = staging_core.load_analysis_schema()

        # --- Phase 1: Architect ---
        if is_multi_angle:
            print("[1/3] Loading anchor session for multi-angle consistency...")
            _, inventory = staging_core.load_session(session_dir)
        else:
            inventory = None

        print("  [Architect] Analyzing room structure...")
        architect_prompt = staging_core.build_architect_prompt(args.room_type)
        analysis = backend.analyze_room(image_bytes, architect_prompt, schema)
        analysis = staging_core.sanitize_blocking_rules(analysis)
        detected = analysis.get("room_type", args.room_type or "Room")
        print(f"  [Architect] Detected: {detected} | Fixed elements: {len(analysis.get('fixed_elements', []))} | Blocking rules: {len(analysis.get('blocking_rules', []))}")

        room_type = analysis.get("room_type", args.room_type or "Room")
        visible_zones = analysis.get("visible_zones", [])

        # --- Style lookup ---
        print("[2/3] Looking up style layout rules...")
        layout_instructions = staging_core.get_style_instructions(args.style, room_type, visible_zones)

        # --- Phase 2: Painter ---
        print("[3/3] Generating staged image...")
        painter_prompt = staging_core.build_painter_prompt(
            style=args.style,
            analysis=analysis,
            layout_instructions=layout_instructions,
            inventory=inventory if is_multi_angle else None,
            custom_instructions=args.custom,
        )
        staged_bytes = backend.generate_staged_image(image_bytes, painter_prompt)

        # --- Save output ---
        output_path = Path(args.output)
        output_path.write_bytes(staged_bytes)

        # --- Session management (anchor only) ---
        if not is_multi_angle:
            print("[Session] Extracting furniture inventory for future angles...")
            inventory_prompt = staging_core.build_inventory_prompt(room_type, visible_zones)
            inventory = backend.extract_inventory(staged_bytes, inventory_prompt)
            staging_core.save_session(session_dir, analysis, inventory, staged_bytes)

        print("─" * 60)
        print(f"Room: {room_type} | Style: {staging_core.resolve_style(args.style)}")
        if visible_zones:
            print(f"Visible zones: {', '.join(visible_zones)}")
        if not is_multi_angle:
            print(f"Session directory: {session_dir.resolve()}")
        print(f"Output: {output_path.resolve()}")
        print("Done.")

    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

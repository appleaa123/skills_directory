"""
Provider-agnostic core for property-staging-skill.

Everything here is pure stdlib: style database loading, room-category
resolution, prompt building, and session save/load. No backend (Gemini,
OpenAI, ...) imports live in this module -- that's the whole point. Both
`generate_staging.py` (script fallback path) and the agent-native path
documented in SKILL.md draw from the same `assets/style_database.json` and
`assets/analysis_schema.json`, so the two paths can't drift apart on what a
given style/room actually means.
"""
import json
from pathlib import Path
from typing import Optional

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

ARCHITECT_ANALYSIS_PROMPT_TEMPLATE = """Analyze this empty room for virtual staging.
Primary focus: {room_type}.

Instructions:
1. Identify all permanent structural elements (Doors, Doorways, Windows, Islands, Built-in Cabinets, Appliances).
2. Assign blocking_rule for each element:
   - cannot_block: doors, windows, doorways, appliances (must always remain visible)
   - can_place_on_top: countertops, islands, shelves (surfaces that can hold decor)
   - can_block: walls, columns (furniture may be placed in front)
3. blocking_rule MUST be exactly ONE string value from the enum. NEVER an array.
4. Map spatial layout — relative positions of elements (e.g., subject: "Door", relation: "is left of", object: "Window").
5. Note the exact camera perspective and angle.
"""

INVENTORY_PROMPT_TEMPLATE = """Analyze this staged interior image containing: {zones_text}.
Create a furniture inventory to ensure consistency in future camera angles.

RULES:
1. Group items by [ZONE] headers using uppercase zone names.
2. For each item: list Style, Color, Material.
3. CRITICAL: Describe GEOMETRIC ALIGNMENT relative to walls/windows (e.g., "Parallel to back wall", "Perpendicular to window").
4. CRITICAL: Do NOT list architectural features (islands, cabinets, built-ins). ONLY movable furniture and decor.

Format:
[{room_type_upper} ZONE]
- Item Name (Color, Material) - Positioned <location>, aligned <geometric alignment>

Focus on visual descriptions that define the style and must remain consistent across camera angles.
"""


def load_style_data() -> dict:
    """Load style_aliases, style_database, category_map from assets/style_database.json."""
    path = ASSETS_DIR / "style_database.json"
    return json.loads(path.read_text())


def load_analysis_schema() -> dict:
    """Load the standard-JSON-Schema-cased room analysis schema."""
    path = ASSETS_DIR / "analysis_schema.json"
    return json.loads(path.read_text())


def build_architect_prompt(room_type: Optional[str] = None) -> str:
    return ARCHITECT_ANALYSIS_PROMPT_TEMPLATE.format(room_type=room_type or "Determine automatically")


def build_inventory_prompt(room_type: str, visible_zones: list) -> str:
    zones_text = room_type
    if visible_zones:
        zones_text += f" and {', '.join(visible_zones)}"
    return INVENTORY_PROMPT_TEMPLATE.format(zones_text=zones_text, room_type_upper=room_type.upper())


def _resolve_style(style: str, style_aliases: dict, style_database: dict) -> str:
    """Normalize style name, applying aliases for common variations."""
    key = style.lower().strip()
    if key in style_aliases:
        return style_aliases[key]
    titled = style.title()
    if titled in style_database:
        return titled
    for db_style in style_database:
        if db_style.lower() in key or key in db_style.lower():
            return db_style
    print(f"Warning: Unknown style '{style}', falling back to Modern.")
    return "Modern"


def _resolve_room_category(room_type: str, style_database: dict, category_map: dict) -> str:
    """Map specific room names to style DB categories."""
    if room_type in style_database.get("Modern", {}):
        return room_type
    mapped = category_map.get(room_type)
    if mapped:
        return mapped
    lower = room_type.lower()
    for key, val in category_map.items():
        if key.lower() in lower or lower in key.lower():
            return val
    return "Living Room"


def resolve_style(style: str) -> str:
    data = load_style_data()
    return _resolve_style(style, data["style_aliases"], data["style_database"])


def get_style_instructions(style: str, room_type: str, visible_zones: list) -> list:
    """Look up layout instructions from the style database asset."""
    data = load_style_data()
    style_aliases, style_database, category_map = data["style_aliases"], data["style_database"], data["category_map"]

    resolved_style = _resolve_style(style, style_aliases, style_database)
    style_data = style_database[resolved_style]
    category = _resolve_room_category(room_type, style_database, category_map)

    room_data = style_data.get(category) or style_data.get("Living Room", {})
    instructions = list(room_data.get("layout_instructions", []))

    for zone in visible_zones:
        zone_cat = _resolve_room_category(zone, style_database, category_map)
        zone_data = style_data.get(zone_cat)
        if zone_data:
            for rule in zone_data.get("layout_instructions", []):
                instructions.append(f"IN {zone.upper()} ZONE: {rule}")

    return instructions


def sanitize_blocking_rules(analysis: dict) -> dict:
    """
    Ensures each blocking_rule is a single string, not a list.
    Vision models occasionally return ambiguous elements as a list.
    Priority when converting: cannot_block > can_place_on_top > can_block
    """
    priority = ["cannot_block", "can_place_on_top", "can_block"]
    rules = analysis.get("blocking_rules", [])
    sanitized = []
    for rule in rules:
        br = rule.get("blocking_rule")
        if isinstance(br, list):
            chosen = next((p for p in priority if p in br), br[0] if br else "can_block")
            rule = {**rule, "blocking_rule": chosen}
        sanitized.append(rule)
    return {**analysis, "blocking_rules": sanitized}


def build_painter_prompt(
    style: str,
    analysis: dict,
    layout_instructions: list,
    inventory: Optional[str] = None,
    custom_instructions: Optional[str] = None,
) -> str:
    """Build the full staging prompt. Backend-agnostic; same text regardless of which model executes it."""
    room_type = analysis.get("room_type", "Room")
    visible_zones = analysis.get("visible_zones", [])
    fixed_elements = analysis.get("fixed_elements", [])
    blocking_rules = analysis.get("blocking_rules", [])
    spatial_layout = analysis.get("spatial_layout", [])

    cannot_block = [br for br in blocking_rules if br.get("blocking_rule") == "cannot_block"]
    can_place_on_top = [br for br in blocking_rules if br.get("blocking_rule") == "can_place_on_top"]

    skip_generic = {"ceiling", "floor", "wall", "walls", "floor material"}
    fixed_str = ", ".join(f for f in fixed_elements if f.lower() not in skip_generic)

    prompt = f"""Role: Expert Virtual Stager.
Task: Furnish the empty space in the image with perfect consistency and spatial awareness.
Style: {style}.

╔══════════════════════════════════════════════════════════════╗
║          ARCHITECTURAL CONSTRAINTS - ABSOLUTE RULES          ║
╚══════════════════════════════════════════════════════════════╝

YOU ARE FORBIDDEN FROM MODIFYING THE ROOM'S STRUCTURE.
THIS IS VIRTUAL STAGING, NOT RENOVATION.

PROHIBITED (IMMEDIATE REJECTION):
❌ WALLS: Do NOT add, remove, move, or modify walls
❌ FLOORS: Do NOT change flooring materials, patterns, or add transitions
❌ CEILINGS: Do NOT add/remove ceiling elements or change lighting fixtures
❌ WINDOWS: Do NOT add, resize, move, or block windows
❌ DOORS: Do NOT add, move, or block doors or doorways
❌ BUILT-INS: Do NOT add islands, counters, cabinets, shelving, or built-in furniture
❌ UTILITIES: Do NOT add plumbing fixtures, electrical outlets, or HVAC elements

ALLOWED STAGING ITEMS:
✅ MOVABLE FURNITURE: Sofas, tables, chairs, beds, dressers
✅ LIGHTING: Floor lamps, table lamps (plugged in, not built-in)
✅ DECOR: Artwork, plants, books, vases, decorative objects
✅ TEXTILES: Rugs, curtains, pillows, throws

SIMPLE TEST: If you cannot physically carry it through the door in pieces, DO NOT ADD IT.
"""

    if spatial_layout:
        prompt += """
╔══════════════════════════════════════════════════════════════╗
║          SPATIAL LAYOUT (MUST FOLLOW)                        ║
╚══════════════════════════════════════════════════════════════╝

The following spatial relationships MUST be preserved:

"""
        for rel in spatial_layout:
            prompt += f"- {rel.get('subject', '')} {rel.get('relation', '')} {rel.get('object', '')}\n"
        prompt += "\nThese spatial relationships are MANDATORY and cannot be altered."

    if cannot_block:
        names = [item["element_name"] for item in cannot_block]
        prompt += f"""

╔══════════════════════════════════════════════════════════════╗
║     🚨 STRICT NEGATIVE CONSTRAINTS — FORBIDDEN 🚨           ║
╚══════════════════════════════════════════════════════════════╝

The following elements MUST remain fully visible and intact:
{", ".join(names)}

ABSOLUTE PROHIBITIONS:
1. DO NOT remove these elements from the image
2. DO NOT hide these elements behind furniture
3. DO NOT erase these elements to make room for staging
4. Furniture placement MUST work around these elements

If the room feels tight, REDUCE FURNITURE QUANTITY.
PRIORITY: Preserve these elements > Add furniture
"""

    if can_place_on_top:
        surface_names = [item["element_name"] for item in can_place_on_top]
        prompt += f"""

╔══════════════════════════════════════════════════════════════╗
║          SURFACES THAT MAY HOLD ITEMS                        ║
╚══════════════════════════════════════════════════════════════╝

These surfaces are available for small decorative items:
{", ".join(surface_names)}

You may place items like vases, books, fruit bowls on these surfaces.
"""

    if not cannot_block and not can_place_on_top and fixed_str:
        prompt += f"\nPROTECTED FIXTURES (DO NOT COVER OR OBSTRUCT):\n{fixed_str}\n"

    prompt += f"""

*** CRITICAL ZONING HIERARCHY (MANDATORY) ***
PRIMARY ZONE (FOREGROUND): {room_type}
- ONLY use {room_type}-appropriate furniture in the FOREGROUND
- DO NOT place secondary zone furniture in the primary zone
"""

    if visible_zones:
        prompt += "\nSECONDARY ZONES (BACKGROUND ONLY):\n"
        for i, zone in enumerate(visible_zones):
            prompt += f"{i+1}. {zone}\n"
            prompt += f"   - ONLY add {zone} furniture if clearly visible in DEEP background\n"
            prompt += f"   - Keep {zone} staging MINIMAL and SUBTLE\n"

    if inventory:
        prompt += f"""

### 📋 ROOM INVENTORY - FURNITURE THAT EXISTS ###
This is a different camera angle of the SAME ROOM photographed earlier.
The inventory below lists furniture that EXISTS in this room with their positions.

{inventory}

*** CRITICAL CAMERA ANGLE RULES (MANDATORY) ***
1. PARTIAL VISIBILITY IS ACCEPTABLE — furniture at frame edges may be cut off
2. RESPECT CAMERA PERSPECTIVE — only show furniture naturally visible from this angle
3. FRAME BOUNDARIES ARE ABSOLUTE — do not crowd furniture to fit everything in frame
4. DOOR/WINDOW PROTECTION OVERRIDES INVENTORY — never block doors/windows for furniture
5. MAINTAIN STYLE CONSISTENCY — match exact style, color, material from inventory

PRIORITIZATION ORDER:
1st: Preserve doors/windows (NEVER block)
2nd: Respect camera frame (partial/omitted items OK)
3rd: Show inventory items (only if naturally visible from this angle)
"""
    elif layout_instructions:
        prompt += """

╔══════════════════════════════════════════════════════════════╗
║          STYLE LAYOUT RULES                                  ║
╚══════════════════════════════════════════════════════════════╝

"""
        prompt += "\n".join(f"- {rule}" for rule in layout_instructions)

    if custom_instructions:
        prompt += f"\n\nADDITIONAL NOTES FROM USER: {custom_instructions}"

    return prompt


def save_session(session_dir: Path, analysis: dict, inventory: str, staged_bytes: bytes) -> None:
    """Persist anchor data so subsequent angles can maintain consistency."""
    session_dir.mkdir(parents=True, exist_ok=True)
    (session_dir / "anchor_analysis.json").write_text(json.dumps(analysis, indent=2))
    (session_dir / "inventory.txt").write_text(inventory)
    (session_dir / "anchor.png").write_bytes(staged_bytes)


def load_session(session_dir: Path) -> tuple[dict, str]:
    """Load anchor analysis and inventory from a prior session."""
    analysis_path = session_dir / "anchor_analysis.json"
    inventory_path = session_dir / "inventory.txt"
    if not analysis_path.exists() or not inventory_path.exists():
        raise FileNotFoundError(
            f"Session data not found in {session_dir}. "
            "Run the first angle without --session-dir to create a session."
        )
    analysis = json.loads(analysis_path.read_text())
    inventory = inventory_path.read_text()
    return analysis, inventory

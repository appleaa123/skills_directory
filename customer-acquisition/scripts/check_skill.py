#!/usr/bin/env python3
"""Deterministic structural + hygiene checks for a business-playbook skill.

Invoked one check at a time by evals/<skill>.eval.md command criteria:

    python3 scripts/check_skill.py <check-name>

Run from the skill root (the eval runner does this automatically). Exits 0 on
pass, 1 on failure with a one-line reason on stderr. `all` runs every check.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL_NAME = ROOT.name

# --- shared vocabulary the rewrite removed; these must never come back ----------
SOURCE_IDENTIFIERS = re.compile(
    r"hormozi|acquisition\.com|prestige\s*labs|gym\s*launch|mozination"
    r"|\$100m|100m\s*(offers|leads|money)",
    re.I,
)
COINED_LABELS = re.compile(
    r"grand slam|value equation|core four|rule of 100|m-a-g-i-c|magic formula"
    r"|win your money back|trim\s*&\s*stack|trim and stack|starving crowd"
    r"|niche slap|open to goal|what-who-when|\ba-c-a\b|many-sided die"
    r"|decoy offer|anchor upsell|rollover upsell|continuity (bonus|discount) offer"
    r"|waived fee offer|client-financed|more,? better,? new",
    re.I,
)
BOOK_STRUCTURE = re.compile(
    r"chapter\s+\d|volume\s+(i{1,3}|iv)\b|the author|epigraph"
    r"|\*\*(author|pages|generated)|sibling skill|trilogy"
    r"|the book (teaches|explains|says)|in the book",
    re.I,
)

REQUIRED_SKILL_SECTIONS = [
    "## When to use this",
    "## The core model",
    "## Problem",          # "## Problem → play index"
    "## Topic index",
    "## Supporting files",
    "## Scope",
]
REQUIRED_PLAY_SECTIONS = [
    "## When to use it",
    "## The method",
    "## Steps",
    "## Related plays",
]
# (file, min entries, entry pattern, min words) — guards against stubs without
# false-positiving on legitimately compact reference files.
SUPPORTING_FILES = [
    ("glossary.md", 15, r"^\*\*[^*]+\*\*", 300),
    ("patterns.md", 8, r"^#{2,3} ", 450),
    ("cheatsheet.md", 3, r"^## ", 350),
]


# Only the shipped skill content is scanned — not the eval harness or scripts.
_EXCLUDED_DIRS = {"evals", "scripts", ".git"}


def md_files() -> list[Path]:
    return sorted(
        p for p in ROOT.rglob("*.md")
        if not any(part in _EXCLUDED_DIRS for part in p.relative_to(ROOT).parts)
    )


def fail(msg: str) -> None:
    print(f"FAIL [{SKILL_NAME}]: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"ok [{SKILL_NAME}]: {msg}")
    sys.exit(0)


# --- checks -------------------------------------------------------------------

def check_frontmatter() -> None:
    text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        fail("SKILL.md has no YAML frontmatter")
    fm = m.group(1)
    top_keys = [
        ln.split(":", 1)[0].strip()
        for ln in fm.splitlines()
        if ln.strip() and not ln.startswith((" ", "\t"))
    ]
    extra = set(top_keys) - {"name", "description"}
    if extra:
        fail(f"unexpected frontmatter keys: {sorted(extra)}")
    if "name" not in top_keys or "description" not in top_keys:
        fail("frontmatter must define both name and description")
    if not re.search(rf"^name:\s*{re.escape(SKILL_NAME)}\s*$", fm, re.M):
        fail(f"frontmatter name does not match directory ({SKILL_NAME})")
    ok("frontmatter valid (name + description only, name matches dir)")


def check_description_clean() -> None:
    text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    fm = re.match(r"^---\n(.*?)\n---", text, re.S).group(1)
    d = re.search(r'description:\s*"?(.+?)"?\s*$', fm, re.S | re.M).group(1)
    for label, rx in (
        ("source identifier", SOURCE_IDENTIFIERS),
        ("coined label", COINED_LABELS),
        ("book-structure phrase", BOOK_STRUCTURE),
    ):
        hit = rx.search(d)
        if hit:
            fail(f"description contains a {label}: {hit.group(0)!r}")
    if "knowledge base" in d.lower():
        fail("description still framed as a 'knowledge base'")
    if "use when" not in d.lower():
        fail("description does not state trigger contexts ('Use when ...')")
    ok("description is a clean capability + trigger statement")


def check_skill_sections() -> None:
    text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    missing = [s for s in REQUIRED_SKILL_SECTIONS if s not in text]
    if missing:
        fail(f"SKILL.md missing sections: {missing}")
    ok("SKILL.md has all required sections")


def check_plays_present() -> None:
    text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    on_disk = {p.stem for p in (ROOT / "plays").glob("*.md")}
    # references may be explicit paths (plays/foo.md) or bare backticked slugs
    path_refs = set(re.findall(r"plays/([a-z0-9-]+)\.md", text))
    slug_refs = {s for s in re.findall(r"`([a-z][a-z0-9-]+-[a-z0-9-]+)`", text) if s in on_disk}
    referenced = path_refs | slug_refs
    if not referenced:
        fail("SKILL.md references no plays (neither plays/*.md links nor bare slugs)")
    missing = [p for p in sorted(path_refs) if p not in on_disk]
    if missing:
        fail(f"plays referenced by path in SKILL.md but missing: {missing}")
    orphans = sorted(on_disk - referenced)
    if orphans:
        fail(f"plays on disk never referenced from SKILL.md: {orphans}")
    ok(f"{len(referenced)} plays referenced and all present, no orphans")


def check_play_template() -> None:
    bad = []
    for p in sorted((ROOT / "plays").glob("*.md")):
        body = p.read_text(encoding="utf-8")
        missing = [s for s in REQUIRED_PLAY_SECTIONS if s not in body]
        if missing:
            bad.append(f"{p.name}: {missing}")
    if bad:
        fail("plays missing template sections -> " + "; ".join(bad))
    ok("every play follows the section template")


def check_supporting_files() -> None:
    for name, min_entries, pattern, min_words in SUPPORTING_FILES:
        f = ROOT / name
        if not f.exists():
            fail(f"{name} is missing")
        body = f.read_text(encoding="utf-8")
        entries = len(re.findall(pattern, body, re.M))
        words = len(body.split())
        if entries < min_entries:
            fail(f"{name} has only {entries} entries (want >= {min_entries}) — likely a stub")
        if words < min_words:
            fail(f"{name} is thin ({words} words < {min_words})")
    ok("glossary / patterns / cheatsheet all present, populated, above the stub floor")


def check_links_resolve() -> None:
    broken = []
    play_slugs = {p.stem for p in (ROOT / "plays").glob("*.md")}
    siblings = {"offer-design", "offer-monetization", "customer-acquisition"}
    for md in md_files():
        text = md.read_text(encoding="utf-8")
        # explicit path links
        for ref in re.findall(r"plays/([a-z0-9-]+)\.md", text):
            if ref not in play_slugs:
                broken.append(f"{md.name} -> plays/{ref}.md")
        # cross-skill path refs like `offer-design/plays/foo`
        for skill, ref in re.findall(
            r"(offer-design|offer-monetization|customer-acquisition)/plays/([a-z0-9-]+)", text
        ):
            if not (ROOT.parent / skill / "plays" / f"{ref}.md").exists():
                broken.append(f"{md.name} -> {skill}/plays/{ref}.md")
        # bare backticked slugs in a "Related plays" / index context
        for section in re.findall(
            r"(?:Related plays|Start with|play index)[\s\S]*?(?:\n#|\Z)", text
        ):
            for ref in re.findall(r"`([a-z][a-z0-9-]*-[a-z0-9-]+)`", section):
                head = ref.split("/")[0]
                if head in siblings:
                    slug = ref.split("/")[-1]
                    if not (ROOT.parent / head / "plays" / f"{slug}.md").exists():
                        broken.append(f"{md.name} -> {ref}")
                elif ref not in play_slugs:
                    broken.append(f"{md.name} -> `{ref}` (no such play)")
    if broken:
        fail("broken internal links -> " + "; ".join(sorted(set(broken))))
    ok("all play links (paths, cross-skill, and bare slugs) resolve")


def _scan(rx: re.Pattern, label: str) -> None:
    hits = []
    for md in md_files():
        for i, line in enumerate(md.read_text(encoding="utf-8").splitlines(), 1):
            m = rx.search(line)
            if m:
                hits.append(f"{md.relative_to(ROOT)}:{i}: {m.group(0)!r}")
    if hits:
        fail(f"{label} found:\n  " + "\n  ".join(hits[:20]))
    ok(f"no {label} anywhere in the skill")


def check_no_source_identifiers() -> None:
    _scan(SOURCE_IDENTIFIERS, "source identifiers")


def check_no_coined_labels() -> None:
    _scan(COINED_LABELS, "coined labels")


def check_no_book_structure() -> None:
    _scan(BOOK_STRUCTURE, "book-structure markers")


CHECKS = {
    "frontmatter": check_frontmatter,
    "description-clean": check_description_clean,
    "skill-sections": check_skill_sections,
    "plays-present": check_plays_present,
    "play-template": check_play_template,
    "supporting-files": check_supporting_files,
    "links-resolve": check_links_resolve,
    "no-source-identifiers": check_no_source_identifiers,
    "no-coined-labels": check_no_coined_labels,
    "no-book-structure": check_no_book_structure,
}


def main(argv: list[str]) -> int:
    if len(argv) != 1 or argv[0] not in {*CHECKS, "all"}:
        print(f"usage: check_skill.py [{'|'.join(CHECKS)}|all]", file=sys.stderr)
        return 2
    if argv[0] == "all":
        failures = 0
        for name, fn in CHECKS.items():
            try:
                fn()
            except SystemExit as e:
                if e.code:
                    failures += 1
        return 1 if failures else 0
    CHECKS[argv[0]]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

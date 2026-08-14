#!/usr/bin/env python3
"""Content-integrity checks for the adhd-toolkit skill.

Backs the `command` criteria in evals/adhd-toolkit.eval.md. This skill has
no execution pipeline — there is no `run` command in its eval spec — so
these checks guard the skill's own markdown directly rather than scoring a
produced output. The thing under test is whether the source-audit stays
intact as the skill is edited.

Two of these checks (no-retracted-claims, pc-tags-intact) exist because a
naive grep for a retracted term fails on the *correct* skill: `Red 40`
legitimately appears in cheatsheet.md's correction note, and `Ferritin`
legitimately appears in ch11 as "does not use the term 'ferritin'". An
earlier attempt at excluding these by matching prose phrases missed real
cases (it did not recognize "does not use the term" as a correction
marker), which is why this version allowlists by explicit (file, term)
site instead of by phrase — see sources.md for the audit those sites
belong to.

Usage:
    python3 scripts/check_content_integrity.py --check <name>
    python3 scripts/check_content_integrity.py --check all   # default

Checks:
    no-absolute-paths     no file:/// links anywhere in the skill
    no-broken-links       every relative .md reference resolves
    no-retracted-claims   no NEW occurrence of a term the audit removed
    pc-tags-intact        every [practitioner-common] concept in sources.md
                          Sec.2 is tagged (or in a known-correct context)
                          everywhere else it's used
    spec-valid            SKILL.md frontmatter has the required fields
    no-book-attribution   no source-book title, author, or distinctive
                          verbatim phrase/chapter-title anywhere in the skill

Exit 0 on pass, 1 on any failure, with violations printed to stdout.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent

# Terms the audit in sources.md #1 removed as false claims. If any of these
# resurfaces outside a KNOWN_CORRECT_SITE, a retraction has been undone.
RETRACTED_TERMS = [
    "Ferritin",
    "tyrosine hydroxylase",
    "casomorphin",
    "sodium benzoate",
    "microglia",
    "zonulin",
    "Red 40",
    "Yellow 5",
    "Yellow 6",
    "tartrazine",
]

# Exact (filename, term) sites where a retracted term is correctly present
# because the site IS the correction notice. Anything not listed here is a
# failure. sources.md is the audit ledger itself — every retracted term
# necessarily appears there, in the table that explains why it was removed
# — so it is exempt in full rather than site-by-site.
FULLY_EXEMPT_FILES = {"sources.md"}
KNOWN_CORRECT_SITES = {
    ("cheatsheet.md", "Red 40"),
    ("cheatsheet.md", "Yellow 5"),
    ("cheatsheet.md", "Yellow 6"),
    ("ch11-adhd-dietary-protocols.md", "Ferritin"),
}

# A line containing one of these phrases is itself a correction note, not a
# resurfaced claim — used only for the pc-tags-intact check, where framework
# names are expected to appear in prose describing the correction.
CORRECTION_MARKERS = (
    "practitioner-common",
    "[pc]",
    "not the book",
    "not these books",
    "not in the book",
    "not McCabe",
    "not hers",
    "not a figure",
    "not the authors",
    "is an inference",
    "earlier version",
    "names no specific",
    "not documented",
    "no specific",
)

FILENAME_PATTERN = re.compile(r"ch\d\d-[\w-]*\.md")

# Book titles, author names, and distinctive verbatim expression from this
# skill's original (unshipped) source material. None of this belongs in the
# shipped skill: facts and frameworks are not copyrightable and stay, but
# naming a source or reproducing its own wording is what this check guards
# against. Case-insensitive substring match — deliberately broad, since a
# false positive here just means a manual look, but a false negative means a
# book name or quote ships silently.
BOOK_ATTRIBUTION_TERMS = [
    # Tier 1 — titles and author names
    "ADHD 2.0",
    "Hallowell",
    "Ratey",
    "How to ADHD",
    "McCabe",
    "This Is Your Brain on Food",
    "Brain on Food",
    "Naidoo",
    "Shawn Achor",
    "Happiness Advantage",
    "Brendan Mahan",
    # Tier 2 — distinctive verbatim phrases from the original source text
    "Miracle-Gro for the brain",
    "intricately knitted sweater",
    "the wanderer nerve",
    "chemical weight lifters",
    "you might naturally want to sleep from",
    "fighting ADHD takes a combination of proper medications",
    "is often highly resistant to treatment",
    # Tier 3 — chapter titles used as bare strings, even without a book name
    "A Spectrum of Traits",
    "Understanding the Demon of the Mind",
    "The Cerebellum Connection",
    "The Healing Power of Connection",
    "Find Your Right Difficult",
    "Create Stellar Environments",
    "Move to Focus, Move to Motivate",
    "How to (Executive) Function",
    "How to (Hyper)Focus",
    "How to Motivate Your Brain",
    "How to See Time",
    "How to Remember Stuff",
    "How to Feel",
    "How to People",
    "How to Sleep",
    "How to Make ADHD Harder",
    "The Gut-Brain Romance",
    "ADHD: Gluten, Milk Caseins, and Polyphenols",
    "Dementia and Brain Fog",
    "Insomnia and Fatigue",
]


def _all_markdown_files() -> list[Path]:
    """All skill markdown, excluding evals/. The eval spec's own prose
    documents the retracted terms and file:/// pattern as examples of
    what these checks guard against — it describes the checks, it is not
    content the checks should be run against."""
    evals_dir = SKILL_ROOT / "evals"
    return sorted(
        p for p in SKILL_ROOT.rglob("*.md") if evals_dir not in p.parents
    )


def _strip_filename_refs(line: str) -> str:
    """Remove ch\\d\\d-*.md filename tokens so a concept name that happens to
    be a substring of a filename (e.g. "PINCH" inside
    ch06-...-focus-motivation-pinch.md) doesn't register as a content hit."""
    return FILENAME_PATTERN.sub("", line)


def check_no_absolute_paths() -> list[str]:
    violations = []
    for f in _all_markdown_files():
        for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), start=1):
            if "file:///" in line:
                violations.append(f"{f.relative_to(SKILL_ROOT)}:{i}: absolute file:// link")
    return violations


def check_no_broken_links() -> list[str]:
    violations = []
    link_re = re.compile(r"\[([^\]]*)\]\(([^)#]+\.md)(#[^)]*)?\)")
    for f in _all_markdown_files():
        text = f.read_text(encoding="utf-8")
        for m in link_re.finditer(text):
            target = (f.parent / m.group(2)).resolve()
            if not target.exists():
                violations.append(
                    f"{f.relative_to(SKILL_ROOT)}: broken link to {m.group(2)}"
                )
    return violations


def check_no_retracted_claims() -> list[str]:
    """A retracted term may resurface only inside its own correction note —
    i.e. a line whose nearby context explicitly marks it as absent/wrong
    (CORRECTION_MARKERS), or an exact site pre-verified as a correction
    notice (KNOWN_CORRECT_SITES). Anywhere else, the term is presented as
    if it were real content, which is the exact failure this check exists
    to catch — see sources.md #1 for why each term was removed."""
    violations = []
    for f in _all_markdown_files():
        rel_name = f.name
        if rel_name in FULLY_EXEMPT_FILES:
            continue
        lines = f.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines, start=1):
            for term in RETRACTED_TERMS:
                if not re.search(re.escape(term), line, re.IGNORECASE):
                    continue
                if (rel_name, term) in KNOWN_CORRECT_SITES:
                    continue
                context = "\n".join(lines[max(0, i - 4) : i + 1])
                if any(marker in context for marker in CORRECTION_MARKERS):
                    continue
                violations.append(
                    f"{f.relative_to(SKILL_ROOT)}:{i}: retracted term "
                    f"'{term}' resurfaced outside a known correction site"
                )
    return violations


def _pc_concepts_from_sources() -> list[str]:
    """Parse sources.md Sec.2's table for concept names (first column, bolded)."""
    sources = SKILL_ROOT / "sources.md"
    if not sources.exists():
        raise SystemExit("sources.md not found — pc-tags-intact cannot run without it")
    text = sources.read_text(encoding="utf-8")
    heading = "## 2. Practitioner-common"
    if heading not in text:
        raise SystemExit(
            "sources.md is missing the '## 2. Practitioner-common' heading — "
            "pc-tags-intact refuses to pass on an empty concept list"
        )
    section = text.split(heading, 1)[1]
    next_heading = re.search(r"\n## \d", section)
    if next_heading:
        section = section[: next_heading.start()]
    concepts = []
    for line in section.splitlines():
        m = re.match(r"\|\s*\*\*([^*]+?)\*\*", line)
        if m:
            name = re.sub(r"\s*\([^)]*\)\s*$", "", m.group(1)).strip()
            name = name.split("/")[0].strip()
            if name and name.lower() != "concept":
                concepts.append(name)
    if not concepts:
        raise SystemExit(
            "sources.md Sec.2 table parsed to zero concepts — "
            "pc-tags-intact refuses to pass on an empty concept list"
        )
    return concepts


def _file_has_head_disclaimer(lines: list[str]) -> bool:
    """A file whose first 15 lines carry a general practitioner-common
    disclaimer (patterns.md, cheatsheet.md, and each chapter's own
    citation block use this pattern) is exempt for every concept in that
    file — the blanket note already tells the reader which tools are
    community-sourced rather than book-sourced."""
    head = "\n".join(lines[:15])
    return "practitioner-common" in head


def check_pc_tags_intact() -> list[str]:
    """Every [practitioner-common] concept must be tagged (or sit in a
    correction-note context) at its FIRST occurrence in a given file.
    Later re-uses of the same concept in the same file don't need the tag
    repeated — this matches how the skill is actually written (see
    ch08's "physiological sigh", tagged once, then referenced again
    later in the same chapter) — and avoids flagging the same real gap
    once per line instead of once per (file, concept)."""
    violations = []
    concepts = _pc_concepts_from_sources()
    for f in _all_markdown_files():
        if f.name == "sources.md":
            continue
        lines = f.read_text(encoding="utf-8").splitlines()
        if _file_has_head_disclaimer(lines):
            continue
        for concept in concepts:
            # An all-caps acronym (PINCH) collides with ordinary lowercase
            # English ("a pinch of salt") if matched case-insensitively —
            # this exact trap is documented in sources.md #4. Acronyms
            # match case-sensitively; everything else stays case-insensitive.
            flags = 0 if concept.isupper() else re.IGNORECASE
            first_hit = None
            for i, raw_line in enumerate(lines, start=1):
                line = _strip_filename_refs(raw_line)
                if re.search(re.escape(concept), line, flags):
                    first_hit = i
                    break
            if first_hit is None:
                continue
            context = "\n".join(lines[max(0, first_hit - 4) : first_hit + 1])
            if any(marker in context for marker in CORRECTION_MARKERS):
                continue
            violations.append(
                f"{f.relative_to(SKILL_ROOT)}:{first_hit}: '{concept}' first used "
                f"without a [practitioner-common] tag or correction-note context"
            )
    return violations


def check_spec_valid() -> list[str]:
    violations = []
    skill_md = SKILL_ROOT / "SKILL.md"
    if not skill_md.exists():
        return ["SKILL.md not found"]
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return ["SKILL.md does not start with YAML frontmatter (---)"]
    parts = text.split("---", 2)
    if len(parts) < 3:
        return ["SKILL.md frontmatter block is not closed with a second '---'"]
    frontmatter = parts[1]
    for field in ("name", "description", "license", "activation", "metadata", "provenance"):
        if not re.search(rf"^{field}:", frontmatter, re.MULTILINE):
            violations.append(f"SKILL.md frontmatter missing required field: {field}")
    body = parts[2]
    if not re.search(r"^#\s+/adhd-toolkit\b", body, re.MULTILINE):
        violations.append("SKILL.md body does not open with '# /adhd-toolkit'")
    if len(body.splitlines()) > 500:
        violations.append(f"SKILL.md body exceeds 500 lines ({len(body.splitlines())})")
    return violations


def check_no_book_attribution() -> list[str]:
    """No shipped file may name a source book, its authors, or reproduce a
    distinctive phrase or chapter title from the original source text.
    Facts and frameworks are not copyrightable and are untouched by this
    check; only naming a source or reproducing its own wording trips it."""
    violations = []
    for f in _all_markdown_files():
        lines = f.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines, start=1):
            for term in BOOK_ATTRIBUTION_TERMS:
                if term.lower() in line.lower():
                    violations.append(
                        f"{f.relative_to(SKILL_ROOT)}:{i}: source-attribution "
                        f"term '{term}' found"
                    )
    return violations


CHECKS = {
    "no-absolute-paths": check_no_absolute_paths,
    "no-broken-links": check_no_broken_links,
    "no-retracted-claims": check_no_retracted_claims,
    "pc-tags-intact": check_pc_tags_intact,
    "spec-valid": check_spec_valid,
    "no-book-attribution": check_no_book_attribution,
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", choices=[*CHECKS.keys(), "all"], default="all",
        help="Which check to run (default: all)",
    )
    args = parser.parse_args()

    names = list(CHECKS.keys()) if args.check == "all" else [args.check]
    all_violations: list[str] = []
    for name in names:
        violations = CHECKS[name]()
        if violations:
            print(f"FAIL [{name}]:")
            for v in violations:
                print(f"  {v}")
        else:
            print(f"PASS [{name}]")
        all_violations.extend(violations)

    return 1 if all_violations else 0


if __name__ == "__main__":
    sys.exit(main())

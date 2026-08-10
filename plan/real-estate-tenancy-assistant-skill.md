# Implementation Plan: real-estate-tenancy-assistant-skill

Source repo: https://github.com/Kaos599/PropertyLoop

Note: README claims 5 agents, but actual code (Chatbot/agents.py, graph.py, schemas.py) implements a router + 2 specialist agents + a clarification path. Build from the CODE, not the README's aspirational claims.

## Purpose
Answer landlord/tenant/property-manager questions — either property-issue diagnosis (with optional photo) or tenancy-law FAQ — via a router that dispatches to the right specialist, using the host agent's own reasoning/vision (no external LLM API key).

## Core workflow (ported from graph.py's hub-and-spoke routing)
1. **Router step**: classify incoming query as:
   - `property_issue` — if an image is attached, or query mentions damage/repair/maintenance/moisture/electrical/plumbing/structural/cosmetic issues
   - `tenancy_faq` — if query is about rights, rent, lease terms, eviction, deposits, landlord/tenant law
   - `clarification` — if ambiguous, ask a targeted follow-up question instead of guessing
2. **Property Issue path** (ported from agents.py run_agent_1, schemas.py PropertyIssueReport): analyze description/photo for moisture, structural, electrical, plumbing, environmental, cosmetic issues. Output:
   - `issue_assessment` (detailed description)
   - `troubleshooting_suggestions` (actionable list)
   - `professional_referral` (which specialist type: plumber/electrician/etc.)
   - `safety_warnings` (list, empty if none)
3. **Tenancy FAQ path** (ported from agents.py run_agent_2, schemas.py TenancyFAQResponse): answer using general tenancy-law knowledge, optionally grounded via the host agent's WebSearch tool if available for current/regional specifics. Output:
   - `answer`
   - `legal_references`
   - `regional_specifics` (null if location not given)
   - `disclaimer` (fixed: this is not professional legal counsel)
   - `additional_resources`
4. Conversation continuity: agent keeps prior turns in context within a session (matches ChatState history) — no external memory store.

## SKILL.md structure
- Frontmatter: name `real-estate-tenancy-assistant-skill`, description covering triggers ("property maintenance issue", "tenant rights question", "landlord tenant law", "diagnose property damage from photo", "lease FAQ")
- Trigger section with example invocations (text-only FAQ, text+photo issue, ambiguous query needing clarification)
- Router decision logic as an explicit decision table
- Two structured output schemas (property issue report, tenancy FAQ response) as reference specs
- Explicit legal disclaimer requirement on every tenancy-law answer

## Eval criteria
- Binary check: router correctly classifies an image-attached query as property_issue
- Binary check: property_issue output includes all 4 required fields
- Binary check: tenancy_faq output always includes non-empty disclaimer field
- Binary check: ambiguous query triggers clarification path, not a guessed answer
- Golden cases: 4+ (leaking pipe + photo, "can my landlord evict me without notice", vague "something's wrong" needing clarification, mold description without photo)
- 1 holdout/test-split case

## Architecture
Simple skill. Directory: `real-estate-tenancy-assistant-skill/` with SKILL.md, AGENTS.md, scripts/ (none required — pure reasoning skill, so scripts/ may just hold a router self-check helper), references/ (routing rubric, both output schemas, legal-disclaimer boilerplate), assets/ (sample queries), evals/, install.sh, README.md, .claude-plugin/.

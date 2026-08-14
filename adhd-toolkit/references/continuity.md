# Continuity — the state file and check-ins

Time blindness and working-memory load mean context doesn't carry between
sessions unless something outside the conversation carries it. That
something is `state.md`, a small file this skill maintains for the user —
**not a journal the user is asked to keep**. An ADHD tool that requires
diligent manual upkeep is a tool that gets abandoned within a week; the
whole point is that the skill does the remembering.

## Privacy, stated plainly

`state.md` is personal, health-adjacent data — open commitments, emotional
patterns, what triggered a crash. It is stored **locally**, in the skill's
own directory, **user-owned**, and **never transmitted anywhere**. Nothing
about this file leaves the machine it's written on. If the user asks to
delete it, delete it without argument — it is not this skill's record to
keep against their wishes.

## What `state.md` holds

Four sections, kept short — this is a working note, not a log:

- **Open commitments** — things the user said they'd do, with rough timing if given. Not a full task list; just what's actively in motion.
- **Dropped threads** — things explicitly marked Abandon in a [weekly reset](../workflows/weekly-reset.md), so they don't silently resurface and get treated as still-open.
- **What worked** — a short, growing list of what actually helped this specific person (a workflow, a phrasing, a time of day). This is the part that makes the skill get better at helping *this* user specifically over time, rather than restarting cold every session.
- **Current focus** — one line, updated most recently. The first thing to check at the start of a new session.

See [assets/state-template.md](../assets/state-template.md) for the exact format.

## When to read and write it

- **Read it first**, before responding to anything, if it exists — this is already stated in SKILL.md §0. Reference it naturally: *"Last time, the report was the open thread — still the case, or has that shifted?"* Don't recite the whole file back; use it to skip re-asking for context that's already known.
- **Update it at the end of a session that changed anything** — a new commitment, a workflow that clearly worked or didn't, an item resolved or abandoned. Don't update it for a session that was purely informational (ROLLING state, a quick question) — an update with nothing to say is noise the next session has to read past.
- **If it doesn't exist yet**, create it after the first session that produces something worth carrying forward — not proactively on a first "hello."

## Scheduled check-ins — opt-in only

This harness can schedule a recurring prompt with `CronCreate` (e.g. a
morning plan nudge, a Friday weekly-reset reminder). **Never create one
without the user explicitly asking for it.** An unsolicited recurring job is
itself a small unwanted obligation, which is exactly the kind of friction
this skill exists to remove, not add.

If the user does ask for a check-in, say plainly what they're getting: jobs
here are **session-scoped and auto-expire after 7 days** — this is not a
permanent background reminder system, it's a bounded nudge for the current
stretch of work. If they want it renewed, they'll need to ask again after
expiry, or this skill can mention it's about to lapse if the conversation is
still active near that point.

## Where scheduling doesn't exist

Not every platform this skill installs to supports scheduled prompts. Where
it doesn't, degrade honestly rather than silently doing nothing: *"This
platform can't set a recurring reminder for you — set one in your phone or
calendar for [time], and I'll pick up from `state.md` next time we talk."*
The state file itself works everywhere; only the proactive nudge is
platform-dependent.

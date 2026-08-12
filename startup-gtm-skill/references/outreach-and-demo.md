# Outreach & Demo Scripts

Framework for helping a founder write cold outreach emails, calling scripts, an outreach cadence,
and a demo script.

## 0. Required inputs — reuse, don't re-derive

This mode assumes the founder has already built, or is building in parallel, two artifacts from other
modes of this skill:

- **Narrative doc** (problem/pain, who has it, why existing solutions fall short, proof points of
  superiority, messaging buckets/use cases). Cold emails, call scripts, and the demo are all just
  "medium-specific encapsulations of your narrative" — do not re-derive the pain story from scratch.
- **ICP / prospecting doc** (target accounts, demand signifiers, decision-maker titles, per-account
  metadata like number of recruiters, open reqs, tech stack, funding).

If the founder doesn't have these yet, stop and ask them to run the narrative-building and
prospecting modes first, or at minimum elicit a one-paragraph narrative and a named example
prospect before proceeding. Do not fabricate a generic pain story.

Before drafting anything, ask the founder to paste or point you at their narrative doc and (if
targeting a specific account) that account's research notes. Pull messaging buckets, proof points,
and pain framing directly from there rather than inventing new copy.

## 1. Cold outreach emails

### 1.1 Core structure

Every cold email is a "medium-specific encapsulation of your narrative," aimed at driving the
recipient to a synchronous demo — not at explaining or selling the product itself. Each email should
contain:

1. **A subject line customized to the prospect** — proof this wasn't a mail blast, plus implicit
   qualification (e.g. "Hiring Ruby devs? That is NOT easy.").
2. **Pain documentation** — plainly stated, assuming the reader has the specific pain the solution
   addresses (because they were prospected for exactly that). Talk about the pain itself (e.g.
   "finding and recruiting technical talent"), never the category label of your product (e.g. not
   "social recruiting").
3. **The prospect's point of view, not yours** — ground every claim in how it helps them; prospects
   don't care about you.
4. **A "click target"** — a hyperlink to collateral (demo video thumbnail, screenshot, website) that
   both persuades and, if instrumented (Yesware/Tout/HubSpot Sidekick/Outreach/SalesLoft), signals
   engagement via opens/clicks.
5. **A strong, single call to action** — asking to set up a one-on-one conversation (the "demo").
   Never end without asking for the next step.

### 1.2 Tone and formatting rules

- Plainspoken, candid, peer-to-peer — "one CEO to another." Avoid jargon and "businessy" language.
- 100% text. No marketing images, no glossy logos — a heavily designed email reads as spam/robot
  outreach, not targeted consultative outreach.
- Short. People don't want a book in their inbox — split the narrative into multiple thin emails
  rather than one monolithic one.

### 1.3 Two starting templates to produce

Produce at minimum:

- **Short and sweet** — quick pain documentation + ask. One or two sentences of pain, one CTA. Use
  when the prospect is highly qualified and the pain is unambiguous.
- **A bit longer** — quick pain documentation + ask, with slightly more context or a proof point.

Beyond these two, also consider a **quick summary / ROI-callout email** (leads with a big ROI
metric) and a **fuller narrative email** (covers the basics of the solution) as later steps in a drip —
see cadence below.

### 1.4 Warm outreach variant (if a connector exists)

If the founder has a mutual contact (LinkedIn connection, same org) to the target, write two emails
instead of one direct cold email:

1. **To the intermediary**: who you're trying to reach, why you believe they're connected, why you
   want to engage the target, why it would be valuable to the target — enough for the intermediary to
   judge whether helping is worth their time. Include a reason it's special (e.g. closed beta).
2. **A forwardable email addressed to the target**, handed to the intermediary to pass along
   verbatim — containing the actual pitch argument (same pain-documentation + CTA structure as
   cold email above) plus a line of context on why the intermediary thought the target would want to
   hear it. Do not ask the intermediary to write their own pitch — they don't know your argument well
   enough. Do not ask for a direct email intro; let the target opt in by replying.

Instrument this email with an open/click tracking pixel so you know when the intermediary forwards
it. If no reply within a few days, follow up with the target directly as a standard cold outreach
target, citing the warm context.

## 2. Drip / multi-email cadence

A single email rarely gets a response. Build the narrative as a **series** of short, single-thought
emails dripped over time, not one long email:

- **Email 1**: short, attention-grabbing, one big ROI metric or pain callout.
- **Email 2**: fuller detail on the major messaging buckets of the solution.
- **Emails 3+**: "zoom in" on each individual messaging bucket / use case (one per email).
- **Final email**: a customer success/proof-point email, or an explicit "breakup" email — stating you
  won't email again, but that you have conviction this is relevant. This often prompts a response,
  because prospects are used to salespeople following up indefinitely and feel no urgency to reply
  until that assumption is broken.

Industry outreach research backs this up: response rate to the **second** email in a drip campaign
(18%) is higher than the first (12%); rates hold roughly steady (17%, 17%, 13%) through the fifth,
then decline. Human-personalized initial outreach carried across a 7-email drip yields ~30% more
responses than heavy auto-personalization alone, ~50% more than light personalization, and ~15x a
single one-and-done email.

### 2.1 Day-by-day cadence pattern

Alternate email and calling; do not rely on a single channel. Illustrative pattern:

- Day 1: email + call
- Day 2: call
- Day 3: call + voice mail
- (skip a day)
- Day 5: email
- Day 7: "breaking up with you" email

This is not fixed — adjust frequency/length to how much narrative content exists to share (more
messaging buckets and video collateral can support a longer, richer cadence). Layer in
**context-sensitive timing**: if instrumentation shows a prospect opened/clicked an email, prioritize
calling them immediately or the next morning — engaged prospects convert calls at a much higher rate.

### 2.2 Call timing

- White-collar/office prospects: call early morning (as people arrive) or end of day; avoid the
  midday meeting/lunch dead zone. Late calls (6–7pm) can bypass gatekeepers/EAs who've left.
- SMB/local business prospects: timing follows their business cycle (e.g. avoid calling a restaurant
  during service).
- When prospecting across time zones, follow the high-connect-rate local hour (e.g. "10am") as it
  moves across zones.

## 3. Phone / voice mail scripts

- Keep call scripts as **bullet guideposts**, not a word-for-word script — reformat the core
  narrative for a 30–90 second delivery. Purpose is solely to drive to a demo, not to sell the
  product on the call.
- Prepare for the three outcomes of a live connect: **success** (get the appointment — see §4),
  **rejection** (treat as "not now," not "never"; soften and always follow with a written follow-up
  email restating the pitch + a fresh CTA), and **objection** (see standard-objections list below;
  never comply and disengage — objections mean the prospect is engaged).
- **Voice mails** should be short, personalized (research-based), and always paired with a
  simultaneous email — think of voice mail as "audio email." Most prospects won't call back; the
  voice mail's job is to prime them to reply to the paired email.
- **Gatekeeper/point-of-contact discovery**: use a simple, high-value one-liner a non-decision-maker
  can parse and forward (e.g., "I'd like to discuss how this can make Bob $20K in a day — who's the
  right person?"). Frame passing you through as making the gatekeeper look like a hero to their boss.

### 3.1 Standard objections to prepare responses for

Document the founder's actual objections and responses over time (this becomes reusable IP), but
seed the doc with these standard patterns:

- "Call me later" → trade 30 seconds now for the promise of never bugging them again if irrelevant.
- "I don't have budget" → reframe as wanting to understand their situation first; budget conversation
  can come after relevance is established.
- "Just send me some information" → reframe: a scheduled demo is a *better* way to get the
  information they asked for, personalized to them.
- "We already use [competitor]" → this is partial self-qualification (they have the pain and spend
  money on it) — acknowledge, then differentiate concisely and ask for time.
- "Do you have [feature X]?" → assumptively close on the appointment rather than answering in a
  vacuum ("great question — folks usually get more out of a scheduled 20 minutes where I can show
  you properly").
- "How much does it cost?" → don't quote price with no context; parry to a demo so value can be
  established before cost is judged against it.
- "I can't make that decision" → clarify whether this is a true wrong-contact or a dismissal; ask who
  the right person is, referencing their likely manager by title to create gentle pressure to be
  straight with you.

## 4. Appointment-setting mechanics

Once a prospect agrees, before hanging up / ending the exchange:

- **Lock calendar time live** — never "I'll email you some times." Offer two concrete options
  ("Thursday or Friday morning"), get a verbal yes, and send the calendar invite immediately.
- Book the appointment **a few days out, not more than a week** — further out degrades attendance.
- Capture email, direct phone/mobile, and ask if other stakeholders (users, influencers) should be
  looped in — get their contact info too.
- **Meeting invite**: put full location/access details (both in the Location field and repeated in
  the description), a brief agenda, and a descriptive title (e.g. "Acme & [Product] Online Demo").
  Optionally include a teaser link (demo video) — enough to build excitement, not enough to replace
  the demo.
- **Time-block your own calendar**: 15–30 min before (pre-call planning) and after (follow-up) every
  appointment.
- **Reminders**: a calendar reminder no earlier than ~15 minutes ahead (earlier reads as "happening
  now" and causes early arrivals); pair with an emailed reminder the morning of, which doubles as a
  chance to restate what will be covered and tease content.
- **Hot transfers** (prospect wants to demo immediately): don't refuse, but explicitly set
  expectations that this is a lighter "demo lite" preview, and use it to sell a fuller, better-prepared
  follow-up meeting.

## 5. Demo script structure

### 5.1 Ground rule: business context first, not a feature tour

The single most important principle here: **a demo that isn't tied to the prospect's actual
business context will always read as a performance staged to make the product look its best, rather
than a genuine picture of how it will work for that client.** Never open with a
generic feature walkthrough. Open with what you already know about *this* account.

Contrast:
- Non-contextual: "How about we show you what this looks like for Java developers in San Francisco?"
  — when the prospect doesn't hire Java devs and isn't in SF.
- Contextual: "I saw on your careers page you're hiring iOS developers in Philadelphia. Let's show
  you how [product] helps with that."

Do this research yourself ahead of time rather than asking the prospect what they want to see —
prospects often default to naming their single hardest-to-fill role rather than their biggest overall
pain (highest volume, most hires needed, etc). Better to demo against the prospect's largest pain
bucket, not their top-of-mind anecdote.

### 5.2 Tie back to the narrative already presented

A live demo typically follows the sales deck — it should **reiterate the same framing**, not
introduce a new structure. If the deck presented use-case buckets (e.g. a recruiting tool's "Search,
Qualify, Reach Out, Automate"), the demo walks through those same buckets in the same order, but with richer
context, customization, and visuals. Repetition across deck → demo is a feature, not a flaw — the
prospect is new to this material even if the founder isn't.

### 5.3 Script skeleton

1. **Business-context opening**: state what you already know about this account's specific need
   (from prospecting research or discovery) and frame the demo around it.
2. **Bucket-by-bucket walkthrough**, ordered by importance/impact, not arbitrarily:
   - Rank buckets so the most important and most compelling comes first — a demo can end early, so
     lead with the strongest material.
   - Within each bucket, follow the prospect's **natural day-to-day workflow** (e.g. a recruiter's
     discover → qualify → reach out → automate lifecycle), showing how the product fits into and
     improves each step.
   - Break the script into pauses/discussion points — it should never be a monologue.
   - Tie each new segment back to prior segments to build a "holistic understanding" of impact across
     the whole workflow (repetition + connection, not isolated feature demos).
3. **Ask for the sale** — the demo builds toward a concrete next step or close, not a passive "any
   questions?"

### 5.4 Levels of customization (pick the level the founder can support)

1. **Minimum**: know the prospect's business context (from research or opening discovery questions)
   and narrate the demo using their real terms (their role names, their region, their tech).
2. **Better**: use the prospect's own name/logo/data embedded in the demo environment where the
   product supports it.
3. **Advanced**: pre-load the prospect's actual data into a live instance before the call (e.g.
   a fee-recovery service that has prospects send real data a week ahead, runs their analysis, and demos the prospect's
   own numbers back to them). This is the highest-conversion form but requires product support — note
   it as a roadmap idea for product/eng, not a blocker to selling now.

Do not gate selling on having advanced customization capability. Start at the minimum level and layer
up as product capability allows.

### 5.5 Signals you're doing it well

The tell: prospects start reacting with genuine enthusiasm and connecting the product directly to
their own situation, unprompted. If a session isn't producing reactions like that, it's likely
running as a generic feature tour rather than a business-context-driven story.

## 6. Pre-call planning inputs (feed the demo, don't skip this)

Before drafting a prospect-specific demo script or a targeted email, gather (or ask the founder to
confirm they already have) the following — this is presentation preparation, not cold-call prep, and
is worth real time investment because hold/attendance rates on scheduled demos are high (~80%+):

- **Pain points & size of the prize**: the specific quantifiable signal of need (e.g. number of open
  technical roles, number of field reps, number of open job postings) and how much of the solution
  this account could plausibly consume (seats, usage).
- **Complementary/competitive products & capacity to pay**: what they currently use to solve this
  (or pay for), and funding/financial health as a proxy for ability to buy.
- **Potential users**: who would actually use the product day to day, separate from the
  decision-maker being pitched.
- **Stakeholders & influencers**: the decision-maker's boss, internal customers, or peers — both to
  route around a blocker and to build a "credible threat" of organizational awareness.
- **Customization inputs**: any prospect-specific asset needed to tailor the demo (careers page
  roles, Glassdoor rating/reviews, their product page, their current tool stack).
- **Conversational icebreakers**: shared LinkedIn connections, past employer overlap, school, local
  sports/weather (never politics/religion) — for the first 2–3 minutes of rapport before pivoting to
  business ("Well that's great, so...").
- **Known unknowns**: an explicit list of what wasn't discoverable ahead of time, to convert into
  discovery questions at the start of the call.
- **Stated pitch goal**: name the single outcome you want from this specific call (e.g. win
  consideration; get a second call with the real decision-maker; get looped in with the rest of a
  team) before joining.

## 7. Elicitation questions the agent should ask the founder

Ask these directly rather than guessing — answers should come from the founder's narrative/ICP docs
where possible, and from fresh input where the docs are silent:

1. "What's the one-sentence, pain-based hook for this specific prospect?" (pull from narrative doc;
   if none exists, derive it now from the account's known pain signal.)
2. "What does this account's business context actually look like — what did you find on their
   careers page / product / Glassdoor / tech stack / recent funding — so this demo isn't generic?"
3. "Which messaging bucket or use case matters most to this account, and in what order should we walk
   through the rest?" (maps to demo bucket ordering.)
4. "Is there a warm connector into this account, or is this pure cold outreach?"
5. "Who else in the org — boss, peer, end user — should we know about, in case this contact isn't
   the final decision-maker?"
6. "What's the CTA — do we have real calendar availability to offer within the next few days?"
7. "Do we have any click-target collateral to link (demo video, screenshot, one-pager) for this
   email, or should this draft flag that as missing?"
8. "Has this prospect been contacted before? If so, where are they in the cadence (which email
   number, any opens/clicks) so we pick up in the right spot rather than resetting to email #1?"
9. "What data, if any, could we ask this prospect to send ahead of the call to make the demo
   data-driven rather than generic?" (only if product supports it — see §5.4.)

If any of these can't be answered, say so explicitly in the output rather than inventing plausible
detail — a demo script "built" on invented pain signals defeats the entire point of this framework.

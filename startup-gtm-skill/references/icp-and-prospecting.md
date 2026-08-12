# ICP & Prospecting — Reference

This reference is for an AI agent helping a founder build an Ideal Customer Profile (ICP) and a
first prospecting list of 50–100 target accounts. Follow the framework below; use the elicitation
questions to pull the founder's tacit knowledge out into explicit, sourceable criteria.

## 0. Orient the founder before you start

State this framing up front, because it changes how founders think about targeting:

- The goal right now is **50–100 accounts** that have the specific pain point the founder's
  product resolves — not a big list, not "anyone who might buy."
- The single biggest mistake first-time founders make is targeting based on **availability**
  (people they know — incubator-mates, ex-colleagues, friends and family) instead of targeting
  based on **pain**. A friend without the pain is a waste of a demo; a stranger with the pain is
  a live opportunity — the same way a homeowner with a broken window doesn't care that the
  repairman who shows up is a stranger, only that he can fix the window.
- Selling to people without the pain is not neutral, it's actively harmful: it burns founder time
  that could go to real prospects, and if such a prospect *does* buy, they won't get value, will
  churn, will consume disproportionate support time, and will push product feedback that pulls the
  roadmap away from the real ICP.
- The ICP describes an **organization** (an account), not a person. People-centric research
  (job titles, LinkedIn profiles) is often the *path* to finding the account, but the target of
  the profile is the company. The exception: solo-operator or single-person-decides accounts,
  where the individual and the account are the same thing.

## 1. Find the pain-point-based targeting characteristics

Ask: **"Who has this pain?"** — not "who do we know" or "who would say yes to a meeting."

Walk the founder from their sales narrative (already-established pain hypotheses) to a list of
abstracted, metadata-style characteristics — a description specific enough to "rattle off" as a
filter. Two illustrative examples to model the target shape:

- **A passive-candidate recruiting tool**: "This account has five technical recruiters
  and twenty open technical hires, including iOS, Java, and Android roles, and pays for a
  premium sourcing seat." Decomposed: (a) existence of in-house recruiters — without at least one, nobody will
  operate the tool; (b) count of recruiters — indicates seat-expansion potential; (c) volume and
  *type* of open technical roles — mobile roles like iOS/Java/Android are where this kind of tool tends to outperform incumbents,
  versus something like .NET/C# where it doesn't; (d) premium sourcing seats already in
  place — an indirect budget signal (if five recruiters all hold seats, that's roughly $50k of
  already-allocated passive-recruiting budget to take a bite of).
- **A mobile email/CRM client for Gmail + Salesforce sales reps**: "This account uses
  Gmail, Salesforce, and a marketing-automation platform. They have fifty sales reps scattered across the United States,
  selling software that costs on average $50k. And it looks like the VP of Sales has a Sales
  Operations Manager reporting to her." Decomposed: (a) Gmail + Salesforce — a *hard requirement*,
  no fit without it; (b) marketing-automation platform present — a sophistication/willingness-to-pay signal; (c) rep
  count — proxy for seat volume; (d) reps *geographically distributed* rather than co-located —
  signals outside/field reps (who are away from a laptop, making mobile tooling more valuable)
  rather than a co-located call center; (e) high average contract value — makes a dropped deal
  more costly, raising the value of a tool that prevents dropped balls; (f) presence of a Sales
  Operations Manager — a person specifically tasked with rep effectiveness and CRM data hygiene,
  i.e., a built-in champion.

Note the pattern in both: some characteristics are hard gates (no Salesforce+Gmail = dead deal;
zero recruiters = nonstarter), and others are magnitude/quality modifiers that make an
already-qualified account more or less attractive.

### Elicitation questions to ask the founder

- "What has to be true about a company for them to feel this pain at all?" (hard gates)
- "Among companies that feel the pain, what makes one feel it *more* than another?" (magnitude
  modifiers)
- "What does the account look like when you rattle off its characteristics in one sentence, the
  way the two examples above describe their ICPs?"
- "Is there a required tool, system, or process this account must already have for your product
  to even function for them?" (hard technographic gate)
- "What's the smallest viable version of this pain — the minimum recruiter count, rep count, hire
  volume, etc. — below which it's not worth pursuing?"

## 2. Classify signals: firmographic, technographic, behavioral

Sort each characteristic the founder names into a bucket, then map it to a real data source. Do
not invent sources — use the list below and be explicit about which bucket a given
characteristic falls into so it's clear how to source it.

**Firmographic** (size, geography, industry):
- LinkedIn (headcount by role, company size facets, industry facets, geography)
- Dun & Bradstreet, Hoover's, Salesforce Data.com — traditional, well suited to size/geography/industry
- DiscoverOrg, ZoomInfo — modern equivalents
- Yelp — small/local business account sourcing, bucketed by industry, with contact info
- Radius, InfoUSA's Salesgenie — small and local business data
- Plain Google Maps search — local business discovery
- Vertical-specific indexes as a proxy: OpenTable (restaurants that care about revenue
  management), GrubHub/Seamless (restaurants that care about delivery), Healthgrades/Doximity/
  state license databases (doctors' offices)

**Technographic** (what software/systems the account runs):
- BuiltWith, Datanyze, Datafox, SimilarWeb, HGData, Wappalyzer — detect tech running on a
  company's website (e.g., a Salesforce Web-to-Lead form on the homepage means they pay for CRM;
  Optimizely on the site means they're a candidate for better A/B testing tools)
- DiscoverOrg, Siftery, RainKing — self-reported tech-stack data, useful when the tool isn't
  detectable by web crawling
- Spiceworks — free network-monitoring software whose install base is visible to marketers
- Indirect/correlated technographic signals count too: a Marketo lead-capture form isn't 100%
  proof of Salesforce underneath, but it's a strong leading indicator, and it also signals
  willingness to pay for more sophisticated tooling.

**Behavioral / hiring & reputation signals**:
- LinkedIn, Indeed, Glassdoor, Monster job postings — current or *past* open roles indicate the
  org employs (or is trying to employ) a given function, even if the posting is gone now
- Whether a company's Glassdoor or LinkedIn profile shows a **paid** vs. free listing (visual
  differences, "featured" reviews, "Jobs You May Like" modules on Glassdoor) — a willingness-to-pay
  signal for anything adjacent to recruitment marketing
  - Example: Twitter's Glassdoor page showing a featured review and a "Jobs You May Like" list
    is how you know they're a Glassdoor paying customer
  - Example: LifeGuides (recruitment-branding) targets accounts by **Glassdoor star rating** —
    low-rated accounts are higher-intent prospects, and the specific bad review becomes outreach
    ammunition
- WANTED Analytics — aggregated hiring-demand data (e.g., who's hiring "data scientists" nationally)
- Company careers pages — direct read on hiring volume and role mix (e.g., Yelp's careers page
  showing heavy engineering hiring)

### Elicitation questions to ask the founder

- "What signals can you observe *externally*, without talking to anyone, that indicate this pain
  exists?" (push toward technographic/behavioral, not just firmographic)
- "Is there a competing or adjacent product whose customer list you could use as a proxy signal?"
  (own the "you can use products you compete with for account sourcing too" idea)
- "If a company is willing to pay for [X adjacent thing — Glassdoor premium, Marketo, a job
  slot], does that predict willingness to pay for you?"
- "Which of these signals are outwardly discoverable today, and which will only surface once
  you're on a call (i.e., need to be captured as discovery questions instead)?" — flag
  non-discoverable-but-important characteristics (e.g., a recruiting tool that couldn't publicly see
  a prospect's existing premium-sourcing-seat ownership had to infer it from premium company-page
  status plus job-slot activity plus in-house recruiter headcount, and otherwise had to ask directly).

Do not chase more than one primary sourcing tool at a time. If one source
(Datanyze, LinkedIn, Yelp, etc.) reliably surfaces good volume, stick with it for *finding* new
accounts — use secondary sources only to enrich accounts you've already found. Spreading sourcing
across many tools scatter-shot is a discipline failure, not
diligence. Also steer founders away from purchased marketing lists — stale, thin metadata, poor
targeting; manual sourcing of the first 100 is a feature, not a shortcut to skip, because it
teaches the founder which characteristics actually matter.

## 3. Roll signals into a demand/attractiveness score

Once hard gates are set, help the founder define a **magnitude** score across accounts that
already qualify, so they can prioritize. For example, for a recruiting tool, score is a function of
number of recruiters, volume of engineering hiring, passive-candidate recruiting sophistication,
and ability to pay. Three accounts can all clear the minimum bar (≥1 recruiter, ≥3 open eng
roles) yet differ hugely in attractiveness:
- 1 recruiter, 10 open iOS/Android reqs, just raised $5M → attractive
- 4 recruiters sharing one LinkedIn Recruiter seat, only a couple of reqs → comparably attractive
- 3 recruiters, 3 LinkedIn Recruiter seats, 15 open eng reqs, history of manual GitHub/Twitter
  sourcing → clearly the best of the three

### Elicitation questions to ask the founder

- "Across accounts that already clear your minimum bar, what factors make one more attractive
  than another — and roughly how would you weight them against each other?"
- "What's the minimum viable criteria — the floor below which an account isn't worth pursuing at
  all?" (mirrors the example above: at least one recruiter and at least three open engineering roles)

## 4. Size the account: rabbits, deer, or elephants (minnows/dolphins/whales)

Every prospecting motion encounters three broad tiers of account size/pain-magnitude. Use whichever
animal metaphor the founder prefers — they're equivalent:

- **Rabbits / minnows** — small, fast decision cycle, little legacy process to work around. Easy
  buy-in from a senior decision-maker. Downside: small deal size, and the lack of mature business
  process often means they aren't very good at doing the thing your solution enables — higher
  churn risk.
- **Elephants / whales** — largest possible deal size, but tempting for the wrong reasons. Large
  orgs have entrenched legacy systems and workflows, are slow and less reactive, and are harder to
  onboard and support well. If a single elephant becomes a disproportionate share of revenue, the
  founder becomes beholden to that account's roadmap demands — effectively running a professional
  services shop for one client. Concentration risk cuts both ways: the same big account that made
  the year's numbers can sink them if it churns.
- **Deer / dolphins** — the recommended first target. Large enough to feel real pain and justify a
  new solution; existing business processes can actually absorb new technology; small enough to
  make purchasing decisions quickly, without heavy change-management overhead. Within "deer,"
  still bias toward the bigger end of the tier — e.g., for a recruiting tool, a ~100-person org with three
  recruiters and twenty open eng reqs beats a similarly-sized org with only three open reqs; for
  a mobile sales-CRM tool, a 50-person company with ten field reps at $100k ACV beats a 100-person company
  with thirty inside reps at $10k ACV, even though both are nominally "deer."

Explicitly tell the founder **not** to elephant-hunt first, even though elephant deals look most
attractive on paper — the operational risk outweighs the revenue upside at this stage.

### Elicitation questions to ask the founder

- "For your product, what does a 'rabbit' look like versus a 'deer' versus an 'elephant' — by
  headcount, funding stage, or org complexity?"
- "Within the deer tier, which sub-characteristics push an account toward the bigger, more
  attractive end?"
- "Are you being pulled toward elephant accounts because they're genuinely the best fit, or
  because the deal size is seductive?"

## 5. Geography

Default recommendation: **start local**. Being in the same time zone (and able to go on-site) is
a real advantage even for a solution that will eventually be sold inside-sales/remote. If a
founder can't find 50–100 "deer" locally, that itself is a signal — either the ICP is too narrow,
or the founder should consider relocating to a market with more relevant economic activity.

## 6. Decide the sourcing direction: account-first or contact-first

Two entry points into the same data, and the right one depends on which characteristic is the
hardest gate:

- **People-centric sourcing**: start with a title search (e.g., "Data Scientist") on LinkedIn,
  constrain by geography and company-size facets, then roll up to the accounts those people work
  at. Use LinkedIn's "Current company" facet to surface the small number of companies with the
  highest concentration of the target title — high-signal, low-effort wins. A recruiting tool
  might take this path: find technical recruiters first (a hard gate — no recruiter, no fit), then pivot to
  company-level data to assess hiring demand.
- **Company-centric sourcing**: start from firmographic/technographic filters (industry, size,
  geography, or required tech stack) and *then* use LinkedIn to find the relevant people inside
  qualified accounts. A mobile sales-CRM tool might take this path (Gmail + Salesforce is a hard gate, so find
  companies on that stack via BuiltWith/Datanyze first); a recruiting-agency fee-recovery service might
  filter by industry ("Staffing and Recruiting") via LinkedIn's Company search, sized to the "deer" range, geographically
  constrained.

Decision rule: **whichever characteristic is the hardest gate determines the starting data
source.** If the gate is "must have people with title X," start people-centric. If the gate is
"must run tech stack Y" or "must be in industry Z," start company-centric.

### Elicitation questions to ask the founder

- "Is your hardest gate a *person* characteristic (a required title/role must exist) or a
  *company* characteristic (a required tech stack or industry)?"
- "Once you've found the account, what's the follow-up data source you'll pivot to for the
  information you can't get from the first source?"

## 7. Point-of-contact discovery: primary vs. complementary decision-makers

Finding the account is not the same as finding who to talk to. The **primary decision-maker** is
the person responsible for solving the pain the product resolves *and* who holds budget/decision
authority over it — not merely a potential user of the product.

- Identify likely titles by working backward from the pain (VP of Talent / Director of Recruiting
  / Recruiting Manager for a recruiting tool; CMO / Digital Marketing Manager for e-commerce; VP
  of Sales / CRO / VP Sales Ops / Director of Sales Effectiveness / Sales Ops Manager for sales
  tooling). Title conventions shift with company stage — an early-stage company may route Sales
  Ops responsibilities to the VP of Sales directly, since it has no dedicated Sales Ops Manager
  yet.
- Use **cascading points of contact**: grab every plausible title at the account (VP of Sales +
  Director of Sales Ops + Sales Ops Manager, if all three exist) rather than betting on one guess.
- Search technique: LinkedIn Boolean title search, e.g. `("account" OR "sales" OR "sales
  operations") AND ("Director" OR "Vice" OR "VP")` — returns anyone matching one term from each
  group, then manually review profiles to pick the real target(s).

**Complementary decision-makers**: internal customers of the primary decision-maker, who feel the
*downstream* consequence of the same pain even though they don't own solving it directly. Example:
the VP of Talent owns "hire more engineers," but the VP of Engineering/CTO owns the downstream pain
of "ship more software" and has a real stake in the hiring problem getting solved. Similarly, the
Director of Sales Ops owns "make reps more effective," but the VP of Sales owns "generate more
revenue" and is a natural complementary contact. Two uses for complementary contacts:
1. As an entry point who can refer you to the actual primary decision-maker.
2. As a co-conspirator you convince first, then jointly make the case to their colleague.

**Recommended default for a first list**: target the primary decision-maker directly. Two more
advanced patterns exist but should be deferred past the first 50–100 list:
- **"Cold-Calling 2.0" (top-down via the CEO)** — email the CEO/founder with a crisp ROI pitch and
  ask to be routed to the right delegate. Pro: tacit executive sponsorship if it lands. Con: senior
  executives get high email volume and often have an assistant filtering it out.
- **Bottom-up prospecting** — target individual end users (reps, recruiters, data scientists) to
  build internal groundswell that pushes upward to the budget holder. This is the mechanic behind
  freemium/PLG products (Box, Yammer, Slack, Yesware) that end in an enterprise sale later. Skip
  for the first list; revisit when scaling lead-gen.

Also capture **warm-intro potential**: check LinkedIn/Facebook for shared connections to the
target contact, or to *anyone* at the target org who could forward an intro with a positive
comment. Log these as a "Potential Intros" column — but only after the account has already
qualified on pain, never as the basis for selecting the account itself.

### Elicitation questions to ask the founder

- "Who owns solving this problem inside the org, and who else is affected by it downstream?"
  (primary vs. complementary)
- "What title(s) would you expect to hold budget and decision authority for this specific pain?"
- "Does the right title change depending on company stage or size?" (e.g., no dedicated Sales Ops
  role at very small companies)
- "Do you have any shared connections — direct or one hop out — to people at this account?"

## 8. Finding contact information

Order of preference: **email first**, since it supports templating/automation, open/click
tracking, and progress tracking. Phone is secondary except for local-business go-to-markets
(Yelp/Groupon/GrubHub/Redbeacon-style), where email is harder to acquire and direct dial is the
primary channel.

Email-finding techniques, in recommended order of effort:
1. Search directly: Google the person's name + "email address"; check personal sites; check
   LinkedIn profiles (sales/recruiting people especially often list email + desk/mobile numbers
   directly, since they want candidates/prospects to reach them).
2. Personal email addresses are a legitimate fallback — treat the concern about outreach to
   personal addresses as overblown if the targeting and materials are good.
3. **Email address formation** ("pattern hacking"): corporate emails follow a predictable pattern
   (first.last@domain.com, flast@domain.com, etc.). Determine the pattern by finding one or two
   known addresses at the company, then apply it to any prospect's first/last name. Validate with
   plugins like Rapportive or FullContact for Gmail, which populate a social profile when the
   address is correctly formed.
4. Tooling to accelerate this at scale: Datanyze, Data.com, SalesLoft (pattern lookup + CSV/CRM
   export from LinkedIn), Lusha, LeadIQ (LinkedIn-profile-to-email lookup).

Phone numbers: personal/desk lines via LinkedIn or Data.com; general switchboard via Googling
"[company_name] contact," which usually resolves to the company's contact page.

Data hygiene note: this contact data decays as people change jobs — acceptable to treat as a
one-time capture for the first 50–100 list, but flag that ongoing refresh (e.g., a service like
LeadGenius) becomes relevant once prospecting scales.

## 9. Structuring the list

Recommend a Google Sheet as the initial repository — not a CRM yet, but structured enough to
support querying and mail-merge personalization. Columns should include the demand-signifier
metadata identified in steps 1–3 (not just name/title/email), because personalized outreach that
references a specific signal converts far better than generic mail-merge blasts. For example, a
recruitment-branding company merges each prospect's Glassdoor star rating and a specific bad
review into the subject line and body of its outreach — this is the standard to hold the founder's
list to: can you write a personalized line for each prospect using a column in the sheet?

### Elicitation question to ask the founder

- "For each qualifying signal, is it something you'd want to query on later, or reference directly
  in an outreach message? If so, it needs its own column, not just a checkbox."

## 10. Output

Once the founder has answered the above, populate `assets/icp-doc-template.md` with the resulting
ICP, sizing tier decision, point-of-contact plan, and data-source list. This becomes the reference
document that grounds the subsequent outreach and qualification steps in this skill's other modes.

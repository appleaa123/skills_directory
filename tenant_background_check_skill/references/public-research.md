# Public research steps

Work only from the `TENANT CHECK SUMMARY`. Search with name + city/province,
never with private details.

If a source can't be opened (LinkedIn often blocks automated access) or
returns nothing, list it under **Could not verify**. Never fill the gap from
memory or a guess, and never report a finding without the link you opened.

## 1. Employment

- Find the applicant's LinkedIn or other public profile. Does it show the same
  employer and job title? Note the start date if visible.
- Confirm the employer exists: company website, business registry, map listing.
- **Letterhead (soft only):** compare the letterhead email domain and office
  address from the summary with the company's own website. A mismatch or "not
  listed" is at most a soft flag: many companies don't publish office
  addresses and use several email domains. A free-mail domain (gmail, outlook)
  on a letter from an established company is a soft flag.

## 2. Salary vs title

- Search the typical salary range for the **job title + city** (e.g. job boards,
  government wage data). Report the range and its source.
- Never ask for the applicant's salary. Ask the user to run the comparison
  locally: the salary box in `checker.html`, or `tbc salary <folder> --range <low>-<high>`.
- A "below" or "above" result is a **soft** flag ("ask about it"), never red:
  titles vary widely by company size and industry.

## 3. Tribunal and court history

- Search CanLII (Ontario Landlord and Tenant Board decisions) and the web by
  name + city/province.
- A hit counts only with **a link to the actual decision** and at least one
  matching detail (city/province or timeframe). Otherwise report it as
  "possible same-name match, unverified".
- Always state: most LTB orders are never published, so "nothing found" does
  not mean "clean". The paid screening check remains the final step.

## 4. Landlord reference

- Does the reference plausibly own or manage the stated address (public
  listings, property-management company pages)?
- Is the reference phone number tied to the applicant (same number on the
  applicant's public profile) or to an unrelated business? Either is a soft flag.
- Give the realtor the call questions from `reference-call-questions.md`.

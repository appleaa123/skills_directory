# Privacy rules

These rules come from the owner of this tool and are not negotiable.

## Never leaves the realtor's computer

Checked only by the local checker (`checker.html` or `tbc check`):

- Credit reports (all of it: SIN, score, accounts, addresses, date of birth)
- Paystubs (all of it)
- ID photos (all of it)
- Employment letter contents, including salary
- Bank statements, graduation and reference letters
- The applicant's date of birth, street address and salary as typed into the checker

## May be sent to the AI assistant and searched on the web

Publicly searchable facts only:

- Applicant name
- City, province, country (never the street address)
- Employer name and job title
- Letterhead email domain and office address (compared with the company's own website only)
- Landlord reference name, phone and address
- Public profiles (LinkedIn, public social media), company websites, CanLII / LTB decisions, news

Tell the user once per session: *the name, employer, city and reference details
go to the AI provider and to the search engine you use.*

## Screenshots and the text-recognition engine

`checker.html` reads screenshots with on-device text recognition. The first
time, the page downloads the recognition engine and English language data from
a public CDN (jsDelivr). Only those downloads happen: applicant files are never
uploaded. If the engine can't load (offline), the image is reported as
`OCR_UNAVAILABLE`, which says nothing about the file itself. PDF checks need no
download at all.

## If someone pastes private documents into the chat

Do not read, summarise or analyse them. Say that applicant documents are
checked only by the local checker, and point to `checker.html` (non-technical)
or `tbc check <folder>` (command line).

# tenant-background-check

First-line screening for rental applications (Canada, Ontario first). It catches
edited credit reports (for example, a score number changed while the gauge
pointer stayed put, or a date retyped in a different font) and documents that
don't agree with each other, **without sending the applicant's private
documents anywhere**.

It has two parts:

1. **Local checker**: runs on your computer and reads credit reports, paystubs,
   ID and employment letters. It outputs a short summary with no sensitive data.
2. **Instructions for your AI assistant** (`SKILL.md`): the assistant reads the
   summary, does public research (employer, LinkedIn, CanLII/LTB decisions,
   salary range for the title, landlord reference) and writes the report.

The tool reports "flags found / no flags found". It never proves a document is
real, and it does not replace a paid screening check.

## What's in the pack

| File or folder | Who needs it | What it is |
|---|---|---|
| `upload-to-web-chat/tenant-background-check.zip` | Web chat users (claude.ai) | **The file you upload** as a skill. Instructions only, no code. |
| `dist/checker.html` | Everyone using a web chat | The local checker. Double-click to open. Your files never leave your computer. |
| `SKILL.md` + `references/` | Everyone | The assistant's instructions (already inside the zip). |
| `src/`, `rulebook/`, `install.sh`, `package.json` | Command-line agent users | The `tbc` command and installer. |
| `tests/`, `build/`, `evals/` | Developers | Tests and build scripts. |

## How to use it

Pick the option that matches your AI assistant.

### Option A: Web chat that supports skills (claude.ai)

**One-time setup**

1. In claude.ai, open **Settings**, find the **Skills** section, and upload
   `upload-to-web-chat/tenant-background-check.zip`. Skills need code execution
   switched on in the same settings.
2. Keep `dist/checker.html` somewhere easy to find on your computer. It is not
   part of the upload.

**For each applicant**

1. Double-click `checker.html` (Chrome, Edge or Safari, on Mac or Windows).
2. Drop in the application files or the zip from email. The page reads them on
   your computer and fills in the applicant's details (name, date of birth,
   address, employer, job title, salary, landlord reference) where it can read
   them, and shows which document each value came from.
3. Check the details, correct anything misread, fill in blanks you know, then
   press **Run check**. **Every field is optional**: fewer details means fewer
   cross-checks.
4. Press **Copy summary**, start a new Claude chat, and paste it in, e.g.
   "Screen this tenant:" followed by the summary.
5. When Claude gives you a salary range for the job title, type it into the
   checker's **Salary check** box. The comparison happens on your computer. Press
   **Copy summary** again if you want Claude to include the result.

**Do not upload the applicant's documents to the chat.** The skill is built so
Claude only ever sees the summary. If documents are pasted in, it will decline
and point you back to the checker.

PDF checks work offline. The first time you check a screenshot, the page
downloads the text-recognition engine; your files are not uploaded.

### Option B: Command-line agent (Claude Code, Codex CLI and similar)

Everything runs in one place: the agent runs the checker on your computer,
reads only its summary, does the public research and writes the report.

**One-time setup**

```sh
./install.sh                     # installs the skill for detected agents
cd <install dir> && npm install --omit=dev
```

**Recommended for Claude Code:** stop the agent from opening applicant files
directly. Copy `settings/claude-code-permissions.json` into your project's
`.claude/settings.json`, replacing `<APPLICANT_ROOT>` with the folder that holds
applicant packages (e.g. `/Users/you/applicants`). This blocks the agent's
file-reading tool. It does not block shell commands, so the skill also tells
the agent never to open applicant files.

**For each applicant**

1. Put the applicant's files (or the zip) in their own folder, e.g. `~/applicants/jane`.
2. Ask your agent: "Screen the tenant in ~/applicants/jane."
3. The agent runs `tbc check ~/applicants/jane`. If there is no
   `application.json`, the tool creates one from the documents, locally. Open
   it in your own editor, correct anything misread, and ask the agent to run
   the check again.
4. For the salary check, the agent researches the range and runs
   `tbc salary <folder> --range <low>-<high>`. Your salary figure stays in
   `application.json` on your computer.

You can also run the commands yourself:

```json
{
  "name": "Jane Doe", "city": "Toronto", "province": "ON", "country": "Canada",
  "employer": "Acme Widgets Inc.", "title": "Analyst",
  "dob": "1985-03-14", "currentAddress": "123 Main St, Toronto, ON M2M 4G3",
  "annualSalary": 85000,
  "reference": { "name": "Bob Landlord", "phone": "416-555-0100", "address": "77 Rental Ave, Toronto" }
}
```

```sh
tbc check ~/applicants/jane          # prints the summary, writes .tbc-state.json locally
tbc salary ~/applicants/jane --range 70000-95000
```

### Option C: Chat without skill support (e.g. ChatGPT)

Create a Project or custom GPT and paste the contents of `SKILL.md` and the four
files in `references/` into its instructions. Then follow the "For each
applicant" steps from Option A.

## Updating the web chat zip

The zip is a copy of `SKILL.md` and `references/`. After editing either, rebuild it
from this folder and upload it again:

```sh
rm -rf /tmp/tbc-web && mkdir -p /tmp/tbc-web/tenant-background-check \
  && cp -R SKILL.md references /tmp/tbc-web/tenant-background-check/ \
  && (cd /tmp/tbc-web && zip -qr tenant-background-check.zip tenant-background-check) \
  && mv /tmp/tbc-web/tenant-background-check.zip upload-to-web-chat/
```

## What it checks

| Area | Checks (local unless noted) |
|---|---|
| Credit report (PDF) | report style, template fonts per line, score gauge vs printed score, range labels, date format and age, postal code format, editing-tool producer, later edits (ignoring "fast web view" files), hidden or stacked text |
| Credit report (screenshot) | gauge vs score (pixel measurement), template typeface (soft) |
| Identity | application name / date of birth / address vs every document |
| Paystubs | net vs gross, year-to-date progression, copies re-dated |
| Employment letter | word-processor origin (soft), free-mail address (soft), letterhead contacts for public comparison |
| Public (AI) | employer and profile, letterhead vs company website (soft), salary range, CanLII/LTB, landlord reference |

## Privacy

See `references/privacy-rules.md`. Only the applicant's name, city/province/country,
employer, job title, letterhead email domain and office address, and landlord
reference details are meant to be shared.

## Development

`npm install`, `npm test`, `npm run e2e`, `npm run build`. Rulebook calibration:
`CORPUS_DIR=<private samples> npm run corpus` and `tbc learn <genuine.pdf>`.

# Eval spec — ticket-support-triage-skill

This skill's classification and reply-drafting are performed by the invoking
agent's own reasoning (no deterministic pipeline script to shell out to), so
criteria are graded either by an `llm-judge` (reading the agent's own output)
or, for the two optional delivery scripts, by `command` checks against those
scripts directly.

## Criteria

1. **valid-json-shape** (`llm-judge`) — the response is a JSON object with
   exactly the six keys `name`, `email`, `message`, `sentiment`, `issue_type`,
   `draft_reply`.
2. **sentiment-in-enum** (`llm-judge`) — `sentiment` is exactly one of
   `Positive`, `Negative`, `Neutral`.
3. **issue-type-in-enum** (`llm-judge`) — `issue_type` is exactly one of
   `Billing`, `Technical`, `Login`, `General`, `Other`.
4. **reply-has-closing** (`llm-judge`) — `draft_reply` ends with the exact
   closing "Best regards,\nCustomer Support Team".
5. **csv-logger-self-test** (`command`) — `scripts/log_to_csv.py` accepts a
   sample record and writes a valid CSV row: `python3 scripts/log_to_csv.py --name Test --email t@example.com --message "hi" --sentiment Neutral --issue-type General --reply "Hi there,\n\nThanks.\n\nBest regards,\nCustomer Support Team" --csv-path /tmp/eval_tickets_log.csv && test -f /tmp/eval_tickets_log.csv`

## Golden cases

- `case-1` (`split: val`) — Negative/Billing: duplicate subscription charge, unresponsive support.
- `case-2` (`split: val`) — Neutral/Login: "How do I reset my password? I can't find the link."
- `case-3` (`split: val`) — Positive/General: praise for a new dashboard update.
- `case-4` (`split: test`, holdout) — Negative/Technical: app crashing on photo upload.

```json
{
  "skill": "ticket-support-triage-skill",
  "criteria": [
    {"id": "valid-json-shape", "text": "Response is a JSON object with exactly the six required keys", "type": "llm-judge"},
    {"id": "sentiment-in-enum", "text": "sentiment is one of Positive, Negative, Neutral", "type": "llm-judge"},
    {"id": "issue-type-in-enum", "text": "issue_type is one of Billing, Technical, Login, General, Other", "type": "llm-judge"},
    {"id": "reply-has-closing", "text": "draft_reply ends with the fixed closing signature", "type": "llm-judge"},
    {"id": "csv-logger-self-test", "text": "log_to_csv.py writes a valid CSV row", "type": "command", "cmd": "python3 scripts/log_to_csv.py --name Test --email t@example.com --message 'hi' --sentiment Neutral --issue-type General --reply 'Hi there,\\n\\nThanks.\\n\\nBest regards,\\nCustomer Support Team' --csv-path /tmp/eval_tickets_log.csv && test -f /tmp/eval_tickets_log.csv"}
  ],
  "golden": [
    {"id": "case-1", "input": "golden/case-1/input.md", "expected": "golden/case-1/expected.json", "split": "val"},
    {"id": "case-2", "input": "golden/case-2/input.md", "expected": "golden/case-2/expected.json", "split": "val"},
    {"id": "case-3", "input": "golden/case-3/input.md", "expected": "golden/case-3/expected.json", "split": "val"},
    {"id": "case-4", "input": "golden/case-4/input.md", "expected": "golden/case-4/expected.json", "split": "test"}
  ],
  "judge": {
    "model": "claude-sonnet-5",
    "temperature": 0,
    "canary": "golden/canary/expected.json"
  }
}
```

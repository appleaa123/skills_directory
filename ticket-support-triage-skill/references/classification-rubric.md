# Classification Rubric

## Sentiment

| Value | Signals |
|-------|---------|
| `Positive` | Thanks, praise, satisfaction, "this worked great", compliments on service |
| `Negative` | Frustration, anger, complaints, "still broken", repeated unresolved issues, all-caps/exclamation-heavy tone |
| `Neutral` | Plain factual questions, requests for information, no strong emotional signal |

When a message mixes signals (e.g., polite but describing a real problem),
weight the emotional tone of the language over the topic itself. A calmly
worded billing question is `Neutral`; the same question with "this is
unacceptable" is `Negative`.

## Issue Type

| Value | Signals |
|-------|---------|
| `Billing` | Charges, refunds, invoices, subscription cost, payment methods, double charges |
| `Technical` | App crashes, bugs, error messages, broken features, performance issues |
| `Login` | Password resets, can't sign in, account lockouts, 2FA issues, "forgot my email" |
| `General` | Account questions, feature questions, how-to requests, anything not clearly fitting the other categories |
| `Other` | Doesn't fit any category above (spam, unrelated feedback, unclear intent) |

## Fallback rule

If the message is too short, garbled, or ambiguous to classify with
confidence, use `sentiment: Neutral` and `issue_type: General` rather than
forcing a specific category. This matches the source project's behavior of
defaulting to safe values on parse failure.

## Worked examples

**Input**: "I was charged twice for my subscription this month and nobody
has responded to my emails. This is really frustrating."
→ `sentiment: Negative`, `issue_type: Billing`

**Input**: "How do I reset my password? I can't find the link."
→ `sentiment: Neutral`, `issue_type: Login`

**Input**: "Just wanted to say the new dashboard update is fantastic, thank you!"
→ `sentiment: Positive`, `issue_type: General`

**Input**: "The app keeps crashing every time I try to upload a photo."
→ `sentiment: Negative`, `issue_type: Technical`

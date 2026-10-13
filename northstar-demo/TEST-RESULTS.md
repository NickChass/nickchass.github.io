# Northstar: recorded demonstration results

Self-initiated fictional-data demonstration, observed 12-13 October 2026. This is not a client case study or a claim of production reliability. The private scenario is paused.

| Check | Result | New rows / emails |
|---|---|---|
| Website build | Assigned Maya | 1 / 1 |
| Website care | Assigned Theo | 1 / 1 |
| Unknown service | Assigned manual review | 1 / 1 |
| Replay of first submission ID | Stopped before write/send | 0 / 0 |
| Same email, new submission ID | Retained as a distinct enquiry | 1 / 1 |
| Malformed email | Receipt acknowledged; validation filter stopped it | 0 / 0 |
| Missing required ID | Webhook rejected with HTTP 400 | 0 / 0 |
| Email whitespace/case | Trimmed and lowercased | 1 / 1 |
| Formula-like message | Stored as literal text, not a formula | 1 / 1 |
| Blank service | Assigned manual review | 1 / 1 |
| Private form submission | One complete row and notification | 1 / 1 |
| Controlled finalization failure and recovery | Resumed failed update and ledger completion only | 1 / 1 total across failure and recovery |

**Total: 12 passed checks, 9 rows, 9 delivered emails and 9 completed ledger records.**
All three fictional owners used one authorized test inbox. This verifies routing labels and one destination, not three separate inboxes. Counts were checked in Sheets and Gmail. Private execution identifiers and account links are excluded from this public summary.

The recovery test deliberately broke the final spreadsheet update after email delivery. Repairing the saved execution and resuming from that step finalized the existing row without repeating the earlier row or email. The normal configuration was restored afterwards.

Normal accepted enquiries used 8 Make credits. Ten fixture cases used 61 credits, the actual form used 8, and the deliberate failure used 7. Recovery showed 2 operations; its separate credit total was not captured. These observations are not a processing or delivery SLA.

Remaining client acceptance checks: closely timed duplicate arrivals, failure before email acceptance, delivered failure alerts, expired connections, sustained volume, ambiguous timeouts, and the client's actual form and permissions. No time savings or revenue improvement were measured.

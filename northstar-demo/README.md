# Northstar enquiry automation

A self-initiated, fictional-data portfolio demonstration by Nicholai Chasseau. Built with Make, Google Sheets, Gmail and a submission-ID ledger. AI assisted implementation and troubleshooting; the documented outcomes were checked against the running workflow.

**Enquiry form → validation and owner assignment → submission ledger → Sheets → internal email → final status.**

[Case study](https://nickchass.github.io/case-studies/northstar-automation.html) · [Recorded results](TEST-RESULTS.md)

## What it demonstrates

- Maps seven incoming fields into a ten-column register; trims/lowercases email.
- Assigns website_build to Maya, website_care to Theo, and other values to manual review.
- Checks stable submission IDs, preserving valid new enquiries from the same email address.
- Stores formula-like text literally and escapes HTML in the internal email.
- Leaves a pending row and processing ledger record visible until finalization succeeds.
- Recovers a tested failure after email delivery without repeating the row or email.

Twelve documented checks passed with nine rows and nine delivered notifications. All fictional owners shared one authorized inbox. See the results and limits before adapting it.

## Files

- `make-template-reconnect-required.json`: restored scenario template with account bindings removed. It has not been imported and tested in a second account.
- `enquiries-headers.csv`: header-only register template; create a tab named Enquiries.
- `demo-cases.json`: ten fictional fixtures, including intentionally invalid submissions.
- `send-demo.py`: standard-library Python fixture validator and optional sender.
- `private-demo-server.py` and `private-demo.html`: optional loopback-only presenter form. These are not a public website backend.
- `TEST-RESULTS.md`: observed results and untested production cases.

## Connect a private test copy

1. Import the JSON into an **inactive** Make scenario. Inspect every module after import.
2. Create an API-key-protected custom webhook. Its text fields are submission_id (required), submitted_at, name, email (required), company, service and message.
3. Create a Make data store keyed by submission_id, with status, owner, sheet_row and updated_at fields. Connect all three ledger modules.
4. Create a Google Sheet with the supplied headers. Authorize Sheets and Gmail through the owning account's normal sign-in flow. Replace REPLACE_WITH_SPREADSHEET_ID wherever used and reselect the Enquiries tab in both spreadsheet modules.
5. Replace owner@example.com with one explicitly authorized internal test inbox. Never map an untrusted form field to the notification recipient.
6. Verify Raw spreadsheet input, final row mapping {{5.rowNumber}}, ordered processing, incomplete execution storage, and manual Retry handlers with automatic completion disabled. Keep discard-on-full off.
7. Test in a supervised session. A missing ID is rejected by the webhook; a malformed email may receive HTTP 200 receipt acknowledgement before filtering. Receipt is not completion. Inspect Make, the row, ledger and inbox.
8. Pause the scenario and stop the local presenter server after testing. Importing this template alone does not produce a working installation.

## Offline inspection

Use Python 3.10 or later; no third-party packages are required by the sender or local server.

```sh
python3 send-demo.py --validate
python3 send-demo.py --list
python3 send-demo.py --show build
```

These commands send nothing. Sending uses `--case` and a privately configured MAKE_DEMO_WEBHOOK_URL and MAKE_DEMO_API_KEY; do not put credentials in command arguments, tracked files or screenshots. Obtain permission for a specific inbox and message allowance first.

For the optional presenter form, run `python3 private-demo-server.py`, open http://127.0.0.1:8765 locally and enter credentials privately. Credentials stay in server memory and are cleared on exit. Use example.com fictional contact addresses. The form sends real requests and internal emails only after connection and explicit submission; do not expose it to the Internet.

## Recovery and limitations

The ledger is not an exactly-once guarantee across arbitrary outages. Inspect records and sent messages before replaying an ambiguous action. Ordered processing pauses behind an unresolved incomplete execution. The notified_at field records status-finalization time, which may be later than actual email acceptance.

Closely timed duplicates, pre-email failure, delivered alerts, expired credentials and load require further testing. A production project also needs agreed validation feedback, access ownership, monitoring and usage limits. The demo is not currently running as a public intake service.

Normal-path usage observed: 8 credits per accepted enquiry. Estimate software costs separately using current [Make pricing](https://www.make.com/en/pricing). No savings, revenue or availability guarantee is claimed.

[Make webhooks](https://apps.make.com/gateway) · [Scenario settings](https://help.make.com/scenario-settings) · [Retry handler](https://help.make.com/retry-error-handler)

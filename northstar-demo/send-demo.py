#!/usr/bin/env python3
"""Send one fictional fixture to Make; this does not implement the workflow.

Offline: python3 send-demo.py --list | --validate | --show build
Sending: set MAKE_DEMO_WEBHOOK_URL in your local environment, then use --case.
Optional webhook authentication: MAKE_DEMO_API_KEY (x-make-apikey header).
Do not put the URL or key in command arguments, files, screenshots, or logs.
"""

import argparse
import datetime
import json
import os
from pathlib import Path
import re
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request


FIXTURES = Path(__file__).with_name("demo-cases.json")
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+\Z", re.ASCII)
HOST = re.compile(r"hook\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.make\.com\Z", re.ASCII)
CASE_ID = re.compile(r"[a-z][a-z0-9_]*\Z", re.ASCII)


def input_errors(payload):
    """Match the simple demo rules, not full email-address validation."""
    errors = []
    sid = payload.get("submission_id")
    if not isinstance(sid, str) or not sid.strip():
        errors.append("submission_id")
    email = payload.get("email")
    if not isinstance(email, str) or not EMAIL.fullmatch(email.strip().lower()):
        errors.append("email")
    return errors


def load_and_validate():
    """Validate fixtures offline, including their intentionally invalid inputs."""
    data = json.loads(FIXTURES.read_text(encoding="utf-8"))
    if data.get("version") != 1 or data.get("fictional_only") is not True:
        raise ValueError("Fixture version or fictional-only flag is invalid.")
    cases = data.get("cases")
    if not isinstance(cases, list) or len(cases) != 10:
        raise ValueError("Exactly ten fixture cases are required.")
    found = {}
    for case in cases:
        cid = case.get("case_id", "")
        if not isinstance(cid, str) or not CASE_ID.fullmatch(cid) or cid in found:
            raise ValueError("A fixture case ID is missing, invalid, or repeated.")
        payload, expected = case.get("payload"), case.get("expected")
        if not isinstance(payload, dict) or not isinstance(expected, dict):
            raise ValueError(f"{cid}: payload and expected must be objects.")
        if not isinstance(case.get("description"), str):
            raise ValueError(f"{cid}: description must be text.")
        for field in ("submitted_at", "name", "email", "company", "service", "message"):
            if not isinstance(payload.get(field), str):
                raise ValueError(f"{cid}: {field} must be text.")
        # Require an explicit time zone; datetime.fromisoformat supports this Z conversion.
        stamp = datetime.datetime.fromisoformat(payload["submitted_at"].replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            raise ValueError(f"{cid}: submitted_at needs a time zone.")
        errors = input_errors(payload)
        if sorted(errors) != sorted(expected.get("invalid_fields", [])):
            raise ValueError(f"{cid}: intentional-invalid expectations do not match inputs.")
        if errors:
            if expected.get("status") != "rejected":
                raise ValueError(f"{cid}: invalid input must expect rejection.")
        else:
            # Valid contact addresses in this fixture are reserved fictional addresses.
            if payload["email"].strip().lower().split("@", 1)[1] != "example.com":
                raise ValueError(f"{cid}: use only example.com for fictional email.")
            if expected.get("status") not in ("recorded", "duplicate_ignored"):
                raise ValueError(f"{cid}: expected status is invalid.")
        recorded = expected["status"] == "recorded"
        if expected.get("new_rows") != int(recorded) or expected.get("notifications") != int(recorded):
            raise ValueError(f"{cid}: unexpected row/notification expectations.")
        route = {"website_build": "Maya", "website_care": "Theo"}.get(payload["service"], "manual-review")
        if expected.get("owner") != (route if recorded else None):
            raise ValueError(f"{cid}: unexpected owner.")
        if "normalized_email" in expected and expected["normalized_email"] != payload["email"].strip().lower():
            raise ValueError(f"{cid}: incorrect normalized email expectation.")
        if "literal_message" in expected and expected["literal_message"] != payload["message"]:
            raise ValueError(f"{cid}: incorrect literal text expectation.")
        found[cid] = case
    seen_submissions = {}
    for cid, case in found.items():
        prior = case.get("requires_case")
        if prior:
            if prior not in found or prior == cid or case["payload"] != found[prior]["payload"]:
                raise ValueError(f"{cid}: duplicate prerequisite must reference the identical original input.")
        if case["expected"]["status"] == "duplicate_ignored" and not prior:
            raise ValueError(f"{cid}: duplicate test needs a prerequisite.")
        sid = case["payload"].get("submission_id")
        if sid:
            if sid in seen_submissions and prior != seen_submissions[sid]:
                raise ValueError(f"{cid}: submission IDs can repeat only in an explicit replay test.")
            seen_submissions.setdefault(sid, cid)
    return found


def checked_url(raw):
    """Allow only the regional HTTPS Make gateway form reviewed for this demo."""
    if not raw or re.search(r"[\s\x00-\x1f\x7f]", raw):
        raise ValueError("Webhook URL is missing or invalid; check the environment variable.")
    parts = urllib.parse.urlsplit(raw)
    if (parts.scheme != "https" or parts.username is not None or parts.password is not None
            or parts.port not in (None, 443) or not HOST.fullmatch(parts.hostname or "")
            or parts.query or parts.fragment
            or not re.fullmatch(r"/[A-Za-z0-9_-]+", parts.path)):
        raise ValueError("Use an HTTPS hook.<region>.make.com webhook copied from Make.")
    # Base and legacy domains are deliberately excluded. Review any extension
    # against the actual Make UI/official documentation before changing HOST.
    return raw


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward an API key or input to a redirected endpoint.


def make_opener():
    # Python.org macOS installations may lack the optional root bundle.
    # Use the OS trust bundle when present; certificate verification stays on.
    system_bundle = Path('/etc/ssl/cert.pem')
    context = ssl.create_default_context(cafile=str(system_bundle) if system_bundle.is_file() else None)
    return urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=context))


def send_one(case):
    url = checked_url(os.environ.get("MAKE_DEMO_WEBHOOK_URL", ""))
    key = os.environ.get("MAKE_DEMO_API_KEY", "")
    if key and (re.search(r"[\x00-\x1f\x7f]", key) or not key.isascii()):
        raise ValueError("Webhook API key has invalid header characters.")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if key:
        headers["x-make-apikey"] = key
    body = json.dumps(case["payload"], ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    opener = make_opener()
    try:
        with opener.open(request, timeout=30) as response:
            status = response.getcode()
            if not 200 <= status < 300:
                print(f"HTTP {status}: gateway did not report acceptance; inspect Make before retrying.")
                return 3
    except urllib.error.HTTPError as exc:
        # Do not print exception text, response bodies, redirect targets, or secrets.
        print(f"HTTP {exc.code}: request failed or redirect was refused. Inspect Make before retrying.")
        exc.close()
        return 3
    except (urllib.error.URLError, socket.timeout, TimeoutError, OSError):
        print("Network request failed or timed out. Delivery may have occurred; inspect Make before retrying.")
        return 3
    print(f"Case {case['case_id']}: HTTP {status} from the gateway.")
    print("Acceptance is not workflow completion. Check Make execution history and the demo sheet.")
    print("Check the configured test notification destination and expected outcome too.")
    print("No automatic retries were attempted.")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Preview or send one fictional Make webhook test. Offline actions never send.")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--list", action="store_true", help="list cases offline")
    action.add_argument("--validate", action="store_true", help="validate fixture structure and expected inputs offline")
    action.add_argument("--show", metavar="CASE_ID", help="show one fictional payload and expected result offline")
    action.add_argument("--case", metavar="CASE_ID", help="POST exactly one case to the configured Make webhook")
    args = parser.parse_args(argv)
    try:
        cases = load_and_validate()
    except (OSError, ValueError, TypeError, KeyError, AttributeError):
        print("Fixture validation failed. Check demo-cases.json structure; no request was sent.", file=sys.stderr)
        return 2
    if args.list:
        for cid, case in cases.items():
            print(f"{cid}: {case['description']}")
        return 0
    if args.validate:
        print("PASS: 10 fictional fixtures; routing, intentional invalid inputs, and duplicate prerequisite validated offline.")
        print("This checks the sender fixtures only. It does not test a live Make workflow.")
        return 0
    cid = args.show or args.case
    if cid not in cases:
        print("Unknown case ID. Use --list; no request was sent.", file=sys.stderr)
        return 2
    case = cases[cid]
    if args.show:
        print(json.dumps(case, indent=2, ensure_ascii=False))
        return 0
    if case.get("requires_case"):
        print(f"Prerequisite: {case['requires_case']} must have completed before this duplicate test.")
    if case["expected"]["status"] == "rejected":
        print("This intentionally invalid input should be rejected by the workflow.")
    try:
        return send_one(case)
    except (ValueError, TypeError):
        # URL parsing errors can include private values; never print the exception.
        print("Webhook configuration invalid. Use the environment variables and a regional Make HTTPS webhook; no request was sent.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

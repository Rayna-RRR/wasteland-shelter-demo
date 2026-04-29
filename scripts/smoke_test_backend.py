#!/usr/bin/env python3

import json
import os
import sys
from urllib import error
from urllib import request


DEFAULT_BASE_URL = "http://127.0.0.1:5001"
BASE_URL = os.environ.get("WASTELAND_API_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
TIMEOUT_SECONDS = 8


class SmokeFailure(Exception):
    pass


def format_payload(payload):
    if isinstance(payload, dict):
        message = payload.get("message")
        status = payload.get("status")
        parts = []
        if status:
            parts.append(f"status={status}")
        if message:
            parts.append(f"message={message}")
        if parts:
            return ", ".join(parts)
    return str(payload)


def request_json(method, path, payload=None):
    url = f"{BASE_URL}{path}"
    headers = {
        "Accept": "application/json"
    }
    body = None

    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    api_request = request.Request(
        url,
        data=body,
        headers=headers,
        method=method
    )

    try:
        with request.urlopen(api_request, timeout=TIMEOUT_SECONDS) as response:
            raw_body = response.read().decode("utf-8")
            data = json.loads(raw_body) if raw_body else None
            return response.status, data
    except error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw_body) if raw_body else None
        except json.JSONDecodeError:
            data = raw_body
        return exc.code, data
    except error.URLError as exc:
        raise SmokeFailure(
            f"{method} {path} could not connect to {BASE_URL}: {exc.reason}"
        ) from exc


def require(condition, message):
    if not condition:
        raise SmokeFailure(message)


def pass_step(message):
    print(f"PASS {message}")


def assert_status_ok(method, path, payload=None):
    status_code, data = request_json(method, path, payload)
    require(
        status_code == 200,
        f"{method} {path} returned HTTP {status_code}: {format_payload(data)}"
    )
    return data


def ensure_initialized():
    init_status = assert_status_ok("GET", "/api/init/status")
    require(
        isinstance(init_status, dict),
        "GET /api/init/status did not return a JSON object"
    )
    pass_step("GET /api/init/status")

    if init_status.get("initialized"):
        pass_step("shelter is already initialized")
        return

    init_payload = {
        "shelter_code": "SMOKE-TEST",
        "commander_name": "Tester",
        "difficulty": "标准"
    }
    initialized = assert_status_ok("POST", "/api/init", init_payload)
    require(
        isinstance(initialized, dict) and initialized.get("initialized"),
        "POST /api/init did not initialize the shelter"
    )
    pass_step("POST /api/init initialized shelter")


def find_assignable_survivor(survivors):
    for survivor in survivors:
        if survivor.get("assignable") and survivor.get("id"):
            return survivor
    return None


def resolve_pending_event(run_state, source):
    if not isinstance(run_state, dict) or not run_state.get("pending_event_id"):
        return None

    pending_event = run_state.get("pending_event") or {}
    choices = pending_event.get("choices") or []
    require(
        choices,
        f"{source} reported a pending event, but it has no choices"
    )

    choice = choose_event_choice(choices)
    choice_id = choice.get("id")
    require(
        choice_id,
        f"{source} reported a pending event choice without an id"
    )

    resolved = assert_status_ok(
        "POST",
        "/api/event/resolve",
        {
            "choice_id": choice_id
        }
    )
    require(
        isinstance(resolved, dict) and resolved.get("status") == "ok",
        "POST /api/event/resolve did not return status=ok"
    )
    pass_step(
        "POST /api/event/resolve "
        f"cleared pending event {run_state.get('pending_event_id')}"
    )
    return resolved


def choose_event_choice(choices):
    risky_markers = ("重伤", "停工", "离队")
    for choice in choices:
        label = choice.get("label") or ""
        description = choice.get("description") or ""
        text = f"{label} {description}"
        if "避免离队" in text:
            return choice
        if not any(marker in text for marker in risky_markers):
            return choice
    return choices[0]


def check_required_flow():
    status = assert_status_ok("GET", "/api/status")
    require(
        isinstance(status, dict) and status.get("status") == "ok",
        "GET /api/status did not return status=ok"
    )
    pass_step("GET /api/status")

    ensure_initialized()

    resources = assert_status_ok("GET", "/api/resources")
    for key in ("food", "power", "materials", "premium_currency"):
        require(key in resources, f"GET /api/resources missing field: {key}")
    pass_step("GET /api/resources")

    resolve_pending_event(resources.get("run_state"), "GET /api/resources")

    gacha = assert_status_ok("POST", "/api/gacha")
    require(
        isinstance(gacha, dict) and gacha.get("status") == "ok",
        "POST /api/gacha did not return status=ok"
    )
    require("survivor" in gacha, "POST /api/gacha missing survivor result")
    pass_step("POST /api/gacha")

    resolve_pending_event(gacha.get("run_state"), "POST /api/gacha")

    survivors = assert_status_ok("GET", "/api/survivors")
    require(
        isinstance(survivors, list) and survivors,
        "GET /api/survivors returned no survivors"
    )
    pass_step("GET /api/survivors")

    survivor = find_assignable_survivor(survivors)
    require(
        survivor is not None,
        "No assignable survivor found for POST /api/duty"
    )

    duty = assert_status_ok(
        "POST",
        "/api/duty",
        {
            "survivor_id": survivor["id"],
            "duty_type": "cook"
        }
    )
    require(
        isinstance(duty, dict) and duty.get("status") == "ok",
        "POST /api/duty did not return status=ok"
    )
    pass_step("POST /api/duty")

    offer_state = assert_status_ok("GET", "/api/emergency-offer/state")
    require(
        isinstance(offer_state, dict) and offer_state.get("status") == "ok",
        "GET /api/emergency-offer/state did not return status=ok"
    )
    pass_step("GET /api/emergency-offer/state")


def check_optional_log_endpoint(path):
    status_code, data = request_json("GET", path)
    if status_code == 404:
        pass_step(f"optional {path} not available")
        return

    require(
        status_code == 200,
        f"GET {path} returned HTTP {status_code}: {format_payload(data)}"
    )
    require(
        isinstance(data, list),
        f"GET {path} did not return a JSON list"
    )
    pass_step(f"GET {path}")


def main():
    print(f"Smoke testing backend: {BASE_URL}")
    try:
        check_required_flow()
        for path in (
            "/api/gacha-logs",
            "/api/duty-logs",
            "/api/emergency-offer/logs"
        ):
            check_optional_log_endpoint(path)
    except SmokeFailure as exc:
        print(f"FAIL {exc}")
        return 1

    print("PASS backend smoke test completed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

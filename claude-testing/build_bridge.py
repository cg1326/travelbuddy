#!/usr/bin/env python3
"""
TravelBuddy Build Bridge
========================
Run this on your Mac in a terminal tab. It gives Claude a way to
build, install, reset, and screenshot the app without you doing
anything manually.

Usage:
    pip install flask
    python build_bridge.py

It will listen on http://localhost:4724
"""

import subprocess
import os
import base64
import tempfile
import time
from flask import Flask, jsonify, request

app = Flask(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
WORKSPACE     = os.path.expanduser("/Users/cindyguo/TravelBuddy/ios/TravelBuddy.xcworkspace")
SCHEME        = "TravelBuddy"
BUNDLE_ID     = "com.cindyguo.travelbuddy"
SIMULATOR     = "iPhone 17 Pro Max"    # run `xcrun simctl list devices` to confirm the name
CONFIGURATION = "Debug"
IOS_VERSION = "26.0"   # match what's shown in Xcode → Devices & Simulators
PORT          = 4724
# ─────────────────────────────────────────────────────────────────────────────

def run(cmd, timeout=300):
    """Run a shell command, return (success, stdout, stderr)."""
    result = subprocess.run(
        cmd, shell=True, capture_output=True, text=True, timeout=timeout
    )
    return result.returncode == 0, result.stdout, result.stderr

def get_simulator_udid():
    """Find the UDID of the booted simulator matching SIMULATOR name."""
    ok, out, _ = run("xcrun simctl list devices booted --json")
    if not ok:
        return None
    import json
    devices = json.loads(out)
    for runtime_devices in devices.get("devices", {}).values():
        for d in runtime_devices:
            if SIMULATOR.lower() in d["name"].lower() and d["state"] == "Booted":
                return d["udid"]
    return None


@app.route("/status", methods=["GET"])
def status():
    udid = get_simulator_udid()
    return jsonify({
        "ok": True,
        "simulator": SIMULATOR,
        "booted_udid": udid,
        "bundle_id": BUNDLE_ID,
    })


@app.route("/build", methods=["POST"])
def build():
    """
    Build the app and install it on the simulator.
    Optionally pass { "clean": true } in JSON body to clean first.
    """
    body = request.get_json(silent=True) or {}
    clean = body.get("clean", False)

    # 1. Boot simulator if needed
    run(f'xcrun simctl boot "{SIMULATOR}" 2>/dev/null || true')
    time.sleep(2)

    # 2. Optionally clean
    if clean:
        ok, out, err = run(
            f'xcodebuild clean '
            f'-workspace "{WORKSPACE}" '
            f'-scheme "{SCHEME}" '
            f'-configuration {CONFIGURATION} '
            f'-sdk iphonesimulator'
        )
        if not ok:
            return jsonify({"ok": False, "step": "clean", "error": err}), 500

    # 3. Build
    ok, out, err = run(
        f'xcodebuild build '
        f'-workspace "{WORKSPACE}" '
        f'-scheme "{SCHEME}" '
        f'-configuration {CONFIGURATION} '
        f'-sdk iphonesimulator '
        f'-destination "platform=iOS Simulator,name={SIMULATOR}" '
        f'ONLY_ACTIVE_ARCH=YES '
        f'| xcpretty || true',  # xcpretty makes output readable; falls back gracefully
        timeout=1200  # 20 min — first build of a React Native app needs the extra time
    )
    if not ok:
        return jsonify({"ok": False, "step": "build", "error": err}), 500

    # 4. Find the .app and install it
    ok, app_path, _ = run(
        f'find ~/Library/Developer/Xcode/DerivedData -name "TravelBuddy.app" '
        f'-path "*/Build/Products/Debug-iphonesimulator/*" '
        f'! -path "*/Index.noindex/*" | head -1'
    )
    app_path = app_path.strip()
    if not app_path:
        return jsonify({"ok": False, "step": "find_app", "error": "Could not find .app build output"}), 500

    udid = get_simulator_udid()
    if not udid:
        return jsonify({"ok": False, "step": "simulator", "error": f"No booted simulator named '{SIMULATOR}'"}), 500

    ok, out, err = run(f'xcrun simctl install {udid} "{app_path}"')
    if not ok:
        return jsonify({"ok": False, "step": "install", "error": err}), 500

    return jsonify({"ok": True, "app": app_path, "udid": udid})


@app.route("/reset", methods=["POST"])
def reset():
    """
    Terminate and uninstall the app, then reinstall a clean copy.
    Use this between test cases to get a blank-slate app state.
    """
    udid = get_simulator_udid()
    if not udid:
        return jsonify({"ok": False, "error": f"No booted simulator named '{SIMULATOR}'"}), 500

    run(f'xcrun simctl terminate {udid} {BUNDLE_ID} 2>/dev/null || true')
    time.sleep(0.5)
    run(f'xcrun simctl uninstall {udid} {BUNDLE_ID}')
    time.sleep(0.5)

    # Reinstall last build
    ok, app_path, _ = run(
        f'find ~/Library/Developer/Xcode/DerivedData -name "TravelBuddy.app" '
        f'-path "*/Build/Products/Debug-iphonesimulator/*" '
        f'! -path "*/Index.noindex/*" | head -1'
    )
    app_path = app_path.strip()
    if not app_path:
        return jsonify({"ok": False, "error": "No previous build found — run /build first"}), 500

    ok, out, err = run(f'xcrun simctl install {udid} "{app_path}"')
    if not ok:
        return jsonify({"ok": False, "error": err}), 500

    return jsonify({"ok": True, "message": "App reset to clean install", "udid": udid})


@app.route("/launch", methods=["POST"])
def launch():
    """Launch (or relaunch) the app."""
    udid = get_simulator_udid()
    if not udid:
        return jsonify({"ok": False, "error": f"No booted simulator named '{SIMULATOR}'"}), 500
    run(f'xcrun simctl terminate {udid} {BUNDLE_ID} 2>/dev/null || true')
    time.sleep(0.3)
    ok, out, err = run(f'xcrun simctl launch {udid} {BUNDLE_ID}')
    return jsonify({"ok": ok, "output": out, "error": err})


@app.route("/screenshot", methods=["GET"])
def screenshot():
    """
    Take a simulator screenshot and return it as a base64-encoded PNG.
    Claude can decode this to visually verify UI state.
    """
    udid = get_simulator_udid()
    if not udid:
        return jsonify({"ok": False, "error": f"No booted simulator named '{SIMULATOR}'"}), 500

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        path = f.name

    ok, _, err = run(f'xcrun simctl io {udid} screenshot "{path}"')
    if not ok:
        return jsonify({"ok": False, "error": err}), 500

    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    os.unlink(path)

    return jsonify({"ok": True, "format": "png", "base64": data})


@app.route("/terminate", methods=["POST"])
def terminate():
    """Force-close the app (simulates a force quit)."""
    udid = get_simulator_udid()
    if not udid:
        return jsonify({"ok": False, "error": "No booted simulator"}), 500
    run(f'xcrun simctl terminate {udid} {BUNDLE_ID}')
    return jsonify({"ok": True, "message": "App terminated"})


if __name__ == "__main__":
    print(f"✅  TravelBuddy Build Bridge running on http://localhost:{PORT}")
    print(f"    Simulator : {SIMULATOR}")
    print(f"    Bundle ID : {BUNDLE_ID}")
    print(f"    Workspace : {WORKSPACE}")
    print()
    app.run(host="0.0.0.0", port=PORT)

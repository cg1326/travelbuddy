# TravelBuddy — Claude + Appium Testing Setup

One-time setup. After this, Claude can build, test, and fix your app in a loop.

---

## Step 1 — Update the workspace path in build_bridge.py

Open `claude-testing/build_bridge.py` and set the `WORKSPACE` variable
to the actual path on your Mac:

```python
WORKSPACE = "/Users/cindyguo/path/to/TravelBuddy/ios/TravelBuddy.xcworkspace"
SIMULATOR = "iPhone 16"    # run `xcrun simctl list devices` to confirm the name
```

Also confirm your simulator's iOS version in `appium_runner.py`:

```python
IOS_VERSION = "18.0"   # match what's shown in Xcode → Devices & Simulators
```

---

## Step 2 — Install dependencies (run once in Terminal)

```bash
# Appium and the iOS driver
npm install -g appium
appium driver install xcuitest

# Python dependencies
pip3 install flask Appium-Python-Client
```

---

## Step 3 — Boot your simulator

Open Xcode → Simulator, or run:

```bash
open -a Simulator
```

Make sure the device shown matches the `SIMULATOR` name in your config.

---

## Step 4 — Start the two servers (two Terminal tabs)

**Tab 1 — Appium:**
```bash
appium --port 4723
```

**Tab 2 — Build Bridge:**
```bash
cd /path/to/TravelBuddy/claude-testing
python build_bridge.py
```

Leave both running. That's it — Claude takes over from here.

---

## What Claude can now do

| Action | How |
|---|---|
| Build & install the app | Calls `POST localhost:4724/build` |
| Reset app to clean state | Calls `POST localhost:4724/reset` |
| Take a screenshot | Calls `GET localhost:4724/screenshot` |
| Tap a UI element | Runs `python appium_runner.py tap "Label"` |
| Check if element exists | Runs `python appium_runner.py element_exists "Label"` |
| Submit feedback rating | Runs `python appium_runner.py submit_feedback 5` |
| Run a full test section | Runs `python tests/personalization_tests.py section1_dynamic_multipliers` |
| Run all tests | Runs `python tests/personalization_tests.py all` |

---

## The full Claude loop

Once both servers are running, you can tell Claude things like:

- *"Run the personalization tests"*
- *"The animation test is failing — fix it"*
- *"Add a test for the new feedback modal"*

Claude will: build → install → run tests → read results → edit the source
code → rebuild → re-test, all without you touching the simulator.

---

## Troubleshooting

**"No booted simulator" error**
→ Make sure your simulator is running and the `SIMULATOR` name matches exactly.
   Run `xcrun simctl list devices booted` to see what's booted.

**Appium can't find elements**
→ Run `python appium_runner.py get_page_source` and share the output with Claude.
   It will update the element locators to match your actual UI.

**Build fails**
→ Make sure `pod install` is up to date: `cd ios && pod install`
   Also confirm `xcpretty` is installed: `gem install xcpretty`

**"Connection refused" on localhost:4724**
→ The build bridge isn't running. Start it in a Terminal tab (Step 4 above).

#!/usr/bin/env python3
"""
TravelBuddy Appium Runner
=========================
Claude uses this to drive the iOS Simulator — finding elements, tapping,
entering values, taking screenshots, and asserting UI state.

Run Appium separately first:
    appium --port 4723

Then Claude calls this script directly:
    python appium_runner.py <command> [args...]

Examples:
    python appium_runner.py screenshot
    python appium_runner.py find_element "Smart Suggestion"
    python appium_runner.py tap_element "Smart Suggestion"
    python appium_runner.py get_text "bannerTitle"
    python appium_runner.py run_test personalization_section1
"""

import sys
import os
import json
import time
import base64
import argparse
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
try:
    from appium.options import XCUITestOptions
except ImportError:
    from appium.options.ios.xcuitest.base import XCUITestOptions

# ── Config ────────────────────────────────────────────────────────────────────
BUNDLE_ID        = "com.cindyguo.travelbuddy"
SIMULATOR        = "iPhone 17 Pro Max"
IOS_VERSION      = "26.0"
APPIUM_URL       = "http://localhost:4723"
WDA_DERIVED_DATA = os.path.expanduser("~/.appium/wda_dd")

# Tab bar tap coordinates (points, confirmed via page source inspection)
# Screen size: 440 × 956 pt. Tab bar items at y≈891.
TAB_COORDS = {
    "Today":   (87,  891),
    "Plans":   (220, 891),
    "Profile": (353, 891),
}
# ─────────────────────────────────────────────────────────────────────────────


def make_driver():
    options = XCUITestOptions()
    options.bundle_id           = BUNDLE_ID
    options.device_name         = SIMULATOR
    options.platform_version    = IOS_VERSION
    options.automation_name     = "XCUITest"
    options.no_reset            = True      # keep app data between steps
    options.new_command_timeout = 120
    options.derived_data_path   = WDA_DERIVED_DATA
    options.use_prebuilt_wda    = True
    return webdriver.Remote(APPIUM_URL, options=options)


class TravelBuddyDriver:
    def __init__(self):
        self.driver = make_driver()

    def quit(self):
        self.driver.quit()

    # ── Core helpers ─────────────────────────────────────────────────────────

    def screenshot_b64(self):
        return self.driver.get_screenshot_as_base64()

    def save_screenshot(self, path="screenshot.png"):
        self.driver.save_screenshot(path)
        return path

    def find(self, text, by=AppiumBy.ACCESSIBILITY_ID, timeout=10):
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, text))
        )

    def find_all(self, text, by=AppiumBy.ACCESSIBILITY_ID):
        return self.driver.find_elements(by, text)

    def tap(self, text, by=AppiumBy.ACCESSIBILITY_ID, timeout=10):
        el = self.find(text, by=by, timeout=timeout)
        el.click()
        time.sleep(0.5)

    def tap_if_present(self, text, by=AppiumBy.ACCESSIBILITY_ID):
        els = self.find_all(text, by=by)
        if els:
            els[0].click()
            time.sleep(0.5)
            return True
        return False

    def tap_contains(self, partial_label, timeout=10):
        """Tap first element whose label contains partial_label."""
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        el = WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located(
                (AppiumBy.XPATH, f'//*[contains(@label, "{partial_label}")]')
            )
        )
        el.click()
        time.sleep(0.6)

    def element_exists(self, text, by=AppiumBy.ACCESSIBILITY_ID):
        return len(self.find_all(text, by=by)) > 0

    def element_contains_exists(self, partial_label):
        return len(self.driver.find_elements(
            AppiumBy.XPATH, f'//*[contains(@label, "{partial_label}")]'
        )) > 0

    def get_text(self, accessibility_id):
        el = self.find(accessibility_id)
        return el.text

    def swipe_up(self):
        size = self.driver.get_window_size()
        self.driver.swipe(
            size["width"] // 2, int(size["height"] * 0.7),
            size["width"] // 2, int(size["height"] * 0.3),
            duration=500
        )

    def wait_for(self, text, by=AppiumBy.ACCESSIBILITY_ID, timeout=15):
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, text))
        )

    def wait_gone(self, text, by=AppiumBy.ACCESSIBILITY_ID, timeout=10):
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        WebDriverWait(self.driver, timeout).until_not(
            EC.presence_of_element_located((by, text))
        )

    def get_page_source(self):
        return self.driver.page_source

    # ── Navigation ───────────────────────────────────────────────────────────

    def go_to_tab(self, tab_name):
        """Navigate to a bottom tab: Today, Plans, Profile."""
        x, y = TAB_COORDS.get(tab_name, TAB_COORDS["Today"])
        self.driver.execute_script('mobile: tap', {'x': x, 'y': y})
        time.sleep(1.0)

    def go_back(self):
        """
        Navigate back from TripDetail to MainTabs.
        TripDetail's back button is inaccessible via Appium (visible=false,
        gesture swipe ignored). Reliable approach: terminate + relaunch the app.
        Navigation state is not persisted, so app restarts on MainTabs/Today.
        AsyncStorage (plans, ratings, multipliers) is preserved across relaunches.
        """
        self.driver.execute_script('mobile: terminateApp', {'bundleId': BUNDLE_ID})
        time.sleep(1)
        self.driver.execute_script('mobile: activateApp', {'bundleId': BUNDLE_ID})
        time.sleep(3.5)  # Wait for splash + data load

    # ── Date / Time pickers ──────────────────────────────────────────────────

    def _get_picker_wheels(self):
        return self.driver.find_elements(AppiumBy.XPATH, '//XCUIElementTypePickerWheel')

    def _tap_done(self):
        """Tap Done button if visible (dismisses any open picker)."""
        els = self.driver.find_elements(AppiumBy.XPATH, '//*[@label="Done"]')
        if els:
            els[0].click()
            time.sleep(0.5)

    def set_date_picker(self, month: int, day: int, year: int):
        """
        Set the currently-open date picker (Month/Day/Year spinner).
        Uses send_keys for direct value setting — most reliable approach.
        month: 1-12 (int), day: 1-31 (int), year: e.g. 2026 (int)
        """
        months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
        pickers = self._get_picker_wheels()
        if len(pickers) < 3:
            return
        pickers[0].send_keys(months[month - 1])
        time.sleep(0.2)
        pickers = self._get_picker_wheels()
        pickers[1].send_keys(str(day))
        time.sleep(0.2)
        pickers = self._get_picker_wheels()
        pickers[2].send_keys(str(year))
        time.sleep(0.2)
        self._tap_done()

    def set_time_picker(self, hour24: int, minute: int):
        """
        Set the currently-open time picker (Hour/Minute/AM-PM spinner).
        hour24: 0-23, minute: 0-59.
        Picker wheel value format: "X o'clock", "XX minutes", "AM"/"PM"
        """
        h12 = hour24 % 12 or 12
        ampm = 'AM' if hour24 < 12 else 'PM'
        pickers = self._get_picker_wheels()
        if len(pickers) < 3:
            return
        pickers[0].send_keys(f"{h12} o'clock")
        time.sleep(0.2)
        pickers = self._get_picker_wheels()
        pickers[1].send_keys(f"{minute} minutes")  # e.g. "0 minutes", not "00 minutes"
        time.sleep(0.2)
        pickers = self._get_picker_wheels()
        pickers[2].send_keys(ampm)
        time.sleep(0.2)
        self._tap_done()

    def open_date_picker(self, picker_index: int):
        """Tap the Nth 'Select' button to open a date/time picker.
        Index order: 0=DepDate, 1=DepTime, 2=ArrDate, 3=ArrTime"""
        selects = self.driver.find_elements(AppiumBy.XPATH, '//*[@label="Select"]')
        if picker_index < len(selects):
            selects[picker_index].click()
            time.sleep(1.0)

    # ── Plan creation ────────────────────────────────────────────────────────

    def create_plan(self, name: str, from_city: str, to_city: str,
                    depart_date: str, arrive_date: str,
                    depart_time: str = "09:00", arrive_time: str = "22:00"):
        """
        Create a new plan via the Plans tab.
        Dates: 'YYYY-MM-DD', times: 'HH:MM' (24h).
        Handles the full flow: Plans → Create → Name → Add Flights → Review → Save.
        """
        import datetime

        def parse_date(s):
            dt = datetime.datetime.strptime(s, '%Y-%m-%d')
            return dt.month, dt.day, dt.year

        def parse_time(s):
            h, m = map(int, s.split(':'))
            return h, m

        d_month, d_day, d_year = parse_date(depart_date)
        a_month, a_day, a_year = parse_date(arrive_date)
        d_hour, d_min = parse_time(depart_time)
        a_hour, a_min = parse_time(arrive_time)

        # 1. Navigate to Plans tab
        self.go_to_tab("Plans")

        # 2. Tap Create New Plan
        self.tap_contains("Create New Plan")

        # 3. Enter plan name
        # Must wait 1.5s after click for iOS keyboard to fully appear before send_keys
        tfs = self.driver.find_elements(AppiumBy.XPATH, '//XCUIElementTypeTextField')
        if tfs:
            tfs[0].click()
            time.sleep(1.5)
            tfs[0].send_keys(name)
            time.sleep(0.5)
        self.tap_contains("Continue")
        time.sleep(1.0)

        # 4. Fill From city (do NOT call clear() — it stales the React Native element)
        tfs = self.driver.find_elements(AppiumBy.XPATH, '//XCUIElementTypeTextField')
        tfs[0].click(); time.sleep(0.4)
        tfs[0].send_keys(from_city); time.sleep(0.5)
        # Dismiss keyboard by tapping outside
        self.driver.execute_script('mobile: tap', {'x': 220, 'y': 200})
        time.sleep(0.5)

        # 5. Fill To city
        tfs = self.driver.find_elements(AppiumBy.XPATH, '//XCUIElementTypeTextField')
        tfs[1].click(); time.sleep(0.4)
        tfs[1].send_keys(to_city); time.sleep(0.5)
        self.driver.execute_script('mobile: tap', {'x': 220, 'y': 200})
        time.sleep(0.5)

        # 6. Departure Date (Select[0])
        self.open_date_picker(0)
        self.set_date_picker(d_month, d_day, d_year)

        # 7. Departure Time (Select[1])
        self.open_date_picker(1)
        self.set_time_picker(d_hour, d_min)

        # 8. Arrival Date (Select[2])
        self.open_date_picker(2)
        self.set_date_picker(a_month, a_day, a_year)

        # 9. Arrival Time (Select[3])
        self.open_date_picker(3)
        self.set_time_picker(a_hour, a_min)

        # 10. Add This Flight
        self.tap_contains("Add This Flight")
        time.sleep(1.5)

        # 11. Continue to Review
        self.tap_contains("Continue to Review")
        time.sleep(1.5)

        # 12. Save Plan → lands on TripDetail (stack: [MainTabs(Plans), TripDetail])
        self.tap_contains("Save Plan")
        time.sleep(2.0)

        # 13. Go back to Plans list so subsequent create_plan calls work
        self.go_back()

    # ── Trip details & feedback ───────────────────────────────────────────────

    def open_trip_details(self, plan_name: str):
        """
        Open a plan in Trip Details by tapping the plan card matching plan_name.
        Navigates to Plans tab first. Handles plans in the 'Past Plans' collapsed
        section (plans whose arriveDate + 2 days is before today).
        """
        self.go_to_tab("Plans")
        time.sleep(0.8)

        def find_plan_card():
            return self.driver.find_elements(
                AppiumBy.XPATH, f'//*[contains(@label, "{plan_name}")]'
            )

        els = find_plan_card()
        if not els:
            # Plan may be in collapsed 'Past Plans' section — expand it
            past_toggles = self.driver.find_elements(
                AppiumBy.XPATH, '//*[contains(@label, "Past Plans")]'
            )
            if past_toggles:
                past_toggles[0].click()
                time.sleep(0.8)
                els = find_plan_card()
        if not els:
            # Try scrolling down to find it
            self.swipe_up()
            time.sleep(0.5)
            els = find_plan_card()
        if els:
            els[0].click()
            time.sleep(1.5)

    def submit_feedback(self, days: int):
        """
        Submit a post-trip feedback rating from TripDetails.
        Taps the feedback banner → selects Day N → taps Submit.
        Banner text: 'How was your recovery? Tell us to help tailor your next plan.'
        """
        self.tap_contains("How was your recovery")
        time.sleep(1.0)
        # Tap the day button
        day_label = f"Day {days}" if days < 7 else "Day 7+"
        self.tap_contains(day_label)
        time.sleep(0.3)
        self.tap_contains("Submit")
        time.sleep(1.0)

    def banner_visible(self):
        """Check if Smart Suggestion banner is visible (any screen)."""
        return self.element_contains_exists("Smart Suggestion Available")

    def get_smart_suggestion_target(self):
        """
        Open the Smart Suggestion modal and return the page source for parsing.
        Dismisses with 'Decide Later'.
        """
        self.tap_contains("Smart Suggestion Available")
        time.sleep(0.8)
        source = self.driver.page_source
        self.tap_contains("Decide Later")
        time.sleep(0.5)
        return source

    def accept_suggestion(self):
        self.tap_contains("Smart Suggestion Available")
        time.sleep(0.8)
        self.tap_contains("Yes, Update My Settings")
        time.sleep(1.0)

    def dismiss_suggestion(self):
        self.tap_contains("Smart Suggestion Available")
        time.sleep(0.8)
        self.tap_contains("No, Keep My Current Settings")
        time.sleep(0.5)

    def go_to_preference_profile(self):
        """Navigate to Profile tab → tap My Travel Style."""
        self.go_to_tab("Profile")
        time.sleep(0.5)
        self.tap_contains("My Travel Style")
        time.sleep(1.0)


# ── CLI interface ──────────────────────────────────────────────────────────────

def result(ok, data):
    print(json.dumps({"ok": ok, **data}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", help="Command to run")
    parser.add_argument("args", nargs="*", help="Arguments")
    args = parser.parse_args()

    tb = TravelBuddyDriver()

    try:
        cmd = args.command

        if cmd == "screenshot":
            path = tb.save_screenshot("current_screen.png")
            result(True, {"screenshot": path})

        elif cmd == "screenshot_b64":
            result(True, {"base64": tb.screenshot_b64(), "format": "png"})

        elif cmd == "element_exists":
            label = args.args[0]
            exists = tb.element_exists(label)
            result(True, {"exists": exists, "label": label})

        elif cmd == "tap":
            label = args.args[0]
            tb.tap(label)
            result(True, {"tapped": label})

        elif cmd == "tap_if_present":
            label = args.args[0]
            tapped = tb.tap_if_present(label)
            result(True, {"tapped": tapped, "label": label})

        elif cmd == "get_text":
            label = args.args[0]
            text = tb.get_text(label)
            result(True, {"label": label, "text": text})

        elif cmd == "get_page_source":
            result(True, {"source": tb.get_page_source()})

        elif cmd == "banner_visible":
            result(True, {"visible": tb.banner_visible()})

        elif cmd == "accept_suggestion":
            tb.accept_suggestion()
            result(True, {"action": "accepted suggestion"})

        elif cmd == "dismiss_suggestion":
            tb.dismiss_suggestion()
            result(True, {"action": "dismissed suggestion"})

        elif cmd == "get_suggestion_text":
            source = tb.get_smart_suggestion_target()
            result(True, {"page_source": source})

        elif cmd == "go_to_tab":
            tb.go_to_tab(args.args[0])
            result(True, {"tab": args.args[0]})

        elif cmd == "submit_feedback":
            days = int(args.args[0])
            tb.submit_feedback(days)
            result(True, {"days": days})

        elif cmd == "swipe_up":
            tb.swipe_up()
            result(True, {"action": "swipe_up"})

        else:
            result(False, {"error": f"Unknown command: {cmd}"})

    except Exception as e:
        result(False, {"error": str(e)})
    finally:
        tb.quit()


if __name__ == "__main__":
    main()

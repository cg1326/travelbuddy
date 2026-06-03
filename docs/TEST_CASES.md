# 🧪 TravelBuddy Holistic Test Plan

Use these test cases to validate the App's logic, UI, and Notification system.
**Current Reference Date:** Dec 30, 2025 (Based on your system time).

---

## 🏗️ Setup
**Before starting:**
1.  Go to **Profile** → **Reset/Clear All Data** (if available) or manually delete existing plans.
2.  Ensure **Notifications** are enabled in Profile.

---

## 1. The "Departing Soon" Test (Travel Phase)
**Goal:** Verify "Travel Day" mode, countdown accuracy, and immediate persistent notifications.

### 📝 Input
*   **Trip Name:** `LAX Run`
*   **From:** `New York` (ET)
*   **To:** `Los Angeles` (PT)
*   **Depart:** Today (Dec 30), **5:00 PM** (17:00)
*   **Arrive:** Today (Dec 30), **8:30 PM** (20:30)

### ✅ Expected Behavior
1.  **Today View:**
    *   **Status Bar:** "Currently: Traveling to Los Angeles".
    *   **Countdown:** Should show "Flight leaves in Xh Ym" (approx 3-4 hours).
    *   **Coming Up:** Should show "Caffeine OK" or "Hydrate" cards timestamped for ~4:00 PM or now.
    *   **Flight Card:** Navy blue "Your Flight" card is visible.
2.  **Notifications:**
    *   You should see a persistent notification immediately: `LAX Run` / `Caffeine OK` (or similar).
    *   **Wait 1 minute:** The notification should **NOT** buzz/vibrate again (silent update).
3.  **Action:**
    *   Open "View Full Plan".
    *   Find a card (e.g., "Stay Hydrated"). Click **Done**.
    *   Go back to **Today View**. That card should **disappear** from "Coming Up".
    *   Go back to Plan, **Undo** it. It should **reappear** on Today View.

---

## 2. The "Red-Eye Connection" Test (Multi-Leg & Staggering)
**Goal:** Verify complex routes, layover logic, and staggered notification triggers.

### 📝 Input
*   **Trip Name:** `Europe Trip`
*   **From:** `San Francisco` (PT)
*   **To:** `London` (GMT)
*   **Depart:** Today (Dec 30), **1:00 PM**
*   **Connection:** Add flight → `New York` (JFK)
    *   *Arrive JFK:* 9:30 PM
    *   *Depart JFK:* 11:30 PM (Overnight leg)
*   **Arrive:** Tomorrow (Dec 31), **11:30 AM**

### ✅ Expected Behavior
1.  **Full Plan Check (Travel Tab):**
    *   Look for a **Layover Card**: "New York Layover - 2 hour connection".
    *   Look for **Caffeine Warning**: Since the second leg is overnight (11:30 PM), you should see a "Caffeine Cutoff" or "Limit Caffeine" card earlier in the day.
2.  **Staggering Check:**
    *   Check the time instructions on the "Sleep on Flight" card for the JFK->LHR leg. It should be slightly offset (e.g. 5 mins before) vs the flight departure time to ensure you get the ping *just* before you board/takeoff.

---

## 3. The "Just Landed" Test (Adjust Phase)
**Goal:** Verify adjustment logic, "You've Arrived" state, and that the countdown disappears.

### 📝 Input
*   **Trip Name:** `Homecoming`
*   **From:** `Paris` (CET)
*   **To:** `New York` (ET)
*   **Depart:** Yesterday (Dec 29), 2:00 PM
*   **Arrive:** Today (Dec 30), **10:00 AM** (3 hours ago)

### ✅ Expected Behavior
1.  **Today View:**
    *   **Status Bar:** "Currently: Adjusting to New York".
    *   **Countdown:** Should say "Flight completed" or be hidden.
    *   **Coming Up:** Should show "You've Arrived!" (if you haven't dismissed it) or "Seek Sunlight" cards fitting the current time (1:00 PM ET).
2.  **Notifications:**
    *   Should show the current adjustment task (e.g., "Seek Sunlight" or "Stay Awake").
3.  **Filtered Content:**
    *   Verify that "Sleep on Flight" or "Departure Day" cards do **NOT** appear in the "Coming up" list, as those are in the past.

---

## 4. The "Prep Phase" Test (Future)
**Goal:** Verify preparation advice appears 2 days before.

### 📝 Input
*   **Trip Name:** `Tokyo Drift`
*   **From:** `New York` (ET)
*   **To:** `Tokyo` (JST)
*   **Depart:** Jan 1 (2 Days from now), 10:00 AM
*   **Arrive:** Jan 2, 2:00 PM

### ✅ Expected Behavior
1.  **Today View:**
    *   **Status Bar:** "Currently: Preparing for Tokyo".
    *   **Countdown:** "Flight leaves in 2 days".
    *   **Coming Up:** Should show prep tasks like "Sleep Earlier/Later" or "Hydrate" customized for the East→West shift.

---

## 5. The "Cleanup" Test (Empty State)
**Goal:** Verify deletion cleanup and empty state UI.

### 📝 Action
1.  Go to **Plans** tab.
2.  **Delete** all created plans.

### ✅ Expected Behavior
1.  **Notifications:** The persistent notification should **disappear** immediately. It should not linger.
2.  **Today View:**
    *   Should show the **"No Upcoming Trips"** empty state.
    *   Button should read **"+ Create New Plan"** (Teal color).
    *   Clicking it should take you to the *Name Your Trip* screen.

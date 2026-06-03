# Product Requirements Document: TravelBuddy - Adaptive Jet Lag Recovery

**Status:** MVP Built → Pre-Launch Phase
**Target Launch:** 3 months from now
**Platform:** React Native (iOS + Android)

---

## Executive Summary

TravelBuddy is a jet lag recovery app that adapts to the chaos of real-world travel. Unlike rigid schedule-based competitors (Timeshifter), TravelBuddy differentiates on **flexibility and adaptive guidance** — handling flight delays, exhaustion, missed actions, and changing plans without making users feel like they've "failed."

**Core Insight:** Travel is unpredictable. Flights get delayed. Users arrive exhausted. Plans change. Travelers don't need another rigid system to feel guilty about not following — they need adaptive recommendations that meet them where they are.

**Current State:** Functional MVP with sophisticated adaptive features: exhaustion-aware adjustments, conflict detection, quick delay handling, undo functionality, and multi-scenario planning.

**Path to Launch:** Double down on adaptivity by adding real-time replanning, tolerance messaging ("You're still 80% on track despite missing 3 actions"), and flexibility-focused onboarding.

---

## Problem Statement (Revised)

Leisure travelers crossing timezones face **unpredictable conditions** that break rigid jet lag recovery plans. Flights get delayed. Users arrive more exhausted than expected. They miss recommended actions because vacation activities take precedence. They feel overwhelmed by schedules that don't account for real-world chaos.

Existing solutions (Timeshifter) provide scientifically accurate schedules but treat deviations as failures. Users need a system that **adapts to reality** rather than demanding reality conform to the plan. The problem isn't lack of willpower — it's that travel is inherently unpredictable, and recovery plans need to flex accordingly.

**Impact:** Users abandon rigid plans after the first missed action, reverting to "winging it" and experiencing 4-5 days of jet lag instead of the possible 2-3 days with adaptive guidance.

---

## Goals (3-Month Launch Window)

1. **Achieve 70%+ adherence rate** even when users miss or delay 20-30% of recommended actions (measure adaptivity success)
2. **Reduce user-reported jet lag recovery time by 40%** compared to their previous trips (same outcome goal, more realistic path)
3. **95%+ of users report feeling supported, not judged** when they miss actions (measure via post-trip survey: "Did the app make you feel guilty when you couldn't follow recommendations?" - target 95% "No")
4. **Complete beta testing with 30-50 travelers** and achieve 4.0+ satisfaction rating, specifically validating adaptive features
5. **Launch on both iOS and Android** with App Store ratings of 4.2+ within first month

---

## Non-Goals (Unchanged)

1. **Wearable integration** — Keep it simple; users self-report
2. **Social features** — Focus on individual experience first
3. **Advanced ML personalization** — Use established protocols plus rule-based adaptivity
4. **Monetization at launch** — All plans free during beta/v1.0 to validate product-market fit
5. **Web version** — Mobile-only for notifications

---

## Monetization Strategy (Post-PMF)

### Pricing Model Options (To Be Tested)

**Phase 1: Free MVP (Current)**
- All features free during beta and initial launch
- Goal: Prove value delivery (recovery time reduction, adaptivity effectiveness) before asking for payment
- Duration: First 3-6 months or until 500+ completed trips

**Phase 2: Test Pricing Models (Choose One)**

#### Option A: Per-Trip Pricing
- **First plan free**, then **$2.99 per additional plan**
- Pros: Low commitment, pay-as-you-go aligns with occasional travelers
- Cons: Friction at every trip, might discourage creating plans for short trips
- Target conversion: 15-20% of users pay for 2nd trip

**Gatekeeping implementation:**
- After completing first trip, show paywall when user tries to create 2nd plan
- Allow viewing past plans for free (reference value)
- Message: "Your first trip is free! Unlock unlimited plans for $2.99/trip or $7.99/year"

#### Option B: Hybrid Model (Freemium)
- **First plan free**, then choice of:
  - **$2.99 per trip** (one-time purchase per plan)
  - **$7.99/year for unlimited plans** (subscription)
- Pros: Gives users choice, annual plan has better LTV for frequent travelers
- Cons: More complex to explain, need to predict which users will take annual
- Target conversion: 15-20% per-trip, 5-8% annual (of total user base)

**Gatekeeping implementation:**
- Same as Option A but present both options side-by-side
- Add "Best Value" badge on annual plan if user has 2+ trips in past 9 months (show value)
- For users creating 3rd plan on per-trip model, nudge: "You've spent $5.98. Save money with annual for $7.99"

#### Option C: Annual Subscription Only
- **First plan free**, then **$7.99/year for unlimited plans**
- Pros: Simple, predictable revenue, encourages multi-trip planning
- Cons: Higher upfront cost, less appealing to once-a-year travelers
- Target conversion: 5-8% of total users

**Gatekeeping implementation:**
- After first trip, show paywall: "Upgrade to Pro for $7.99/year"
- Include: Unlimited plans, priority feature requests, early access to new features (melatonin timing, weather integration)

### Recommended Approach: Start with Option B (Hybrid)

**Rationale:**
- Captures both occasional travelers (per-trip) and frequent travelers (annual)
- Can analyze conversion data to see which model resonates better
- Annual subscribers have higher LTV and lower churn
- Per-trip option reduces perceived commitment ("I can just pay once if I only travel rarely")

**Conversion Timing Experiment:**
Test when to ask for payment:
1. **Before 2nd trip creation** (Current plan: Show paywall when tapping "Create New Plan")
2. **During 2nd trip** (Let them create plan, show paywall when they try to view "Today View" on travel day)
3. **After 2nd trip** (Let them use app for free for 2 trips, then paywall on 3rd trip)

Hypothesis: Option 2 (during trip) will have highest conversion because users feel urgency and have already invested time in creating plan

### Premium Feature Ideas (Post-Launch, Optional Upsell)

If free → paid conversion is too low, consider freemium with premium features:

**Free tier:**
- 1 active plan at a time
- Basic recommendations (caffeine, sleep, light)
- Standard notifications

**Premium tier ($7.99/year):**
- Unlimited active plans
- Multi-leg flight support (currently free, but could be premium)
- Wearable integration (Apple Health, Google Fit)
- Pre-trip prep phase (currently 2 days, premium gets 4 days)
- Weather-aware light recommendations
- Calendar integration for automatic conflict detection
- "Smart defaults" based on past trip patterns
- Priority support

**Risk:** Gating multi-leg trips might frustrate users, but could work if most users (>70%) have simple single-leg trips

### Revenue Projections (Year 1, Post-Monetization)

**Assumptions:**
- 1,000 downloads in Year 1
- 40% create a 2nd plan within 9 months (North Star metric) = 400 potential converters
- 15% convert to per-trip ($2.99) = 60 users = $179.40
- 5% convert to annual ($7.99) = 50 users = $399.50
- **Total Year 1 revenue:** ~$580

**Not a business yet**, but validates willingness to pay

**Assumptions for Year 2 (with growth):**
- 5,000 downloads
- Same conversion rates
- **Year 2 revenue:** ~$2,900

Still not a business, but shows traction

**To reach $50K/year revenue (sustainable side project):**
- Need ~6,250 annual subscribers at $7.99/year
- OR ~125,000 downloads with 5% annual conversion
- OR combination of annual + per-trip pricing

**Path to $50K:**
1. Nail product-market fit (first 6 months, free)
2. Test pricing (months 7-12, iterate on model)
3. Optimize onboarding and conversion (Year 2)
4. Growth marketing (ASO, content, partnerships) - Year 2-3

---

## ✅ What's Already Built: The Adaptive Foundation

### Core Adaptive Features (This is Your Differentiation!)

#### 1. Exhaustion-Aware Replanning
- ✅ **On-arrival exhaustion check**: "How are you feeling? Exhausted / OK"
- ✅ **Modified schedules for exhausted users**: Prioritizes 90-min recovery nap, adjusts subsequent sleep windows
- ✅ **Persistent across phases**: Exhaustion status influences Day 2-3 recommendations
- **Why this matters:** Users don't have to pretend they're fine when they're wrecked. The app meets them where they are.

#### 2. Conflict Detection & Resolution
- ✅ **Multi-plan overlap detection**: Identifies when new trip's prep overlaps with previous trip's adjustment
- ✅ **User-controlled resolution**: "Prioritize new trip" vs "Keep both plans active"
- ✅ **Smart suppression**: Auto-suppresses irrelevant phases (e.g., prep phase when already adjusting from previous trip)
- **Why this matters:** Frequent travelers don't get nonsensical double-recommendations. The app understands real travel patterns.

#### 3. Quick Delay & Undo System
- ✅ **Quick delay modal**: Shift recommendations when flights are delayed
- ✅ **One-tap undo**: Users can mark actions complete by mistake and immediately undo
- ✅ **Non-punitive UX**: Skipping actions doesn't break the plan or show red X's
- **Why this matters:** Users feel in control, not micromanaged. The app is a helpful guide, not a strict taskmaster.

#### 4. Multi-Scenario Planning
- ✅ **Short trip detection (<3 days)**: Offers "stay on home time" vs "adjust to destination" strategies
- ✅ **Rapid connection handling (<6h layovers)**: Suppresses adjustment phase for brief stops
- ✅ **Flight duration tiers**: Different strategies for <6h (stay awake), 6-10h (limit sleep), >10h (full sleep) flights
- **Why this matters:** One-size-fits-all plans don't work. The app recognizes trip diversity.

#### 5. Timezone & Natural Light Adaptivity
- ✅ **SunCalc integration**: Calculates actual sunrise/sunset for user's exact location
- ✅ **Artificial light fallback**: If sunlight isn't available (cloudy day, user indoors), recommends bright indoor light
- ✅ **Small timezone difference logic (<3h)**: Partial adjustment strategy, not full shift
- **Why this matters:** Recommendations are geographically aware and weather-tolerant.

### What This Means for Positioning

**Old positioning:** "TravelBuddy reminds you to follow the plan"
**New positioning:** "TravelBuddy adapts the plan to your reality"

Competitors give you a perfect schedule and hope you follow it. TravelBuddy assumes things will go wrong and adapts accordingly.

---

## 🚧 Launch Blockers (Revised Priorities)

### P0 — Required for App Store Submission

#### 1. Adaptive Messaging & Tolerance UX ⭐ **NEW PRIORITY**
**Status:** Partially implemented (undo exists, but messaging needs work)
**Problem:** Users currently don't know the app is designed to be flexible. They might feel guilty when missing actions.
**Requirements:**
- **Onboarding reframe**: Change intro cards from "Follow the plan to beat jet lag" to "We'll adapt to your trip, even when things go wrong"
- **Progress messaging**: When user misses 2-3 actions, show: "You're still 80% on track — that's great for Day 2! Keep going."
- **Post-action skip options**: When user dismisses/skips action, optional quick question: "Why skip?" (No time / Didn't have access / Forgot) — data for future improvements, but framed as learning not judgment
- **Success celebration with tolerance**: Post-trip summary should say "You followed 65% of recommendations and recovered in 3 days — proof that flexibility works!"
- **Acceptance Criteria:** Beta testers confirm they feel supported, not stressed, when using the app (measured via post-trip survey)

#### 2. Real-Time Replanning ⭐ **NEW PRIORITY**
**Status:** Quick delay modal exists but needs expansion
**Problem:** Users can delay all actions, but can't say "My flight was delayed 3 hours, replan my entire day"
**Requirements:**
- **Flight delay handler**: "My flight is delayed by X hours" → Automatically shifts all remaining Travel phase and Day 1 Adjust phase actions
- **"I slept through my alarm" recovery**: If user misses bedtime/wake time by 2+ hours, offer to replan rest of day
- **Manual action rescheduling**: Long-press any action → "Delay by 30min / 1hr / 2hr" (currently only available in Quick Delay modal)
- **Acceptance Criteria:** 90% of beta testers who experience flight delays successfully use replanning feature; report feeling "the app saved my plan" vs "my plan was ruined"

#### 3. Post-Trip Survey with Adaptivity Questions
**Status:** Not implemented (was P0 in original spec)
**Requirements:**
- Survey questions:
  1. "How many days until you felt fully adjusted?" (1-7+ scale)
  2. "How well did you follow the plan?" (1-5 scale) → Reframe as "How many recommendations did you follow? Most / About half / A few"
  3. **NEW:** "Did the app make you feel guilty when you couldn't follow recommendations?" (Yes/No)
  4. **NEW:** "When your plans changed (flight delays, exhaustion, etc.), did the app adapt well?" (Yes / No / Didn't experience changes)
  5. "Would you recommend TravelBuddy to a friend?" (0-10 NPS)
- Store in AsyncStorage, sync to Firebase Analytics
- **Acceptance Criteria:** 40%+ completion rate; 95%+ answer "No" to guilt question

#### 4. Improved Onboarding (Reframed for Adaptivity)
**Status:** Intro cards exist but emphasize "follow the plan" too much
**Requirements:**
- Screen 1: "Travel is unpredictable. We get it." (show illustration of delayed flight)
- Screen 2: "We'll give you recommendations for caffeine, sleep, and light..." (existing)
- Screen 3: **NEW:** "...and adapt when things change" (show undo, delay, exhaustion examples)
- Screen 4: "You're in control. Skip, delay, or adjust anytime." (emphasize flexibility)
- Optional interactive tutorial: Show sample action, let user practice "Done", "Delay", "Skip"
- **Acceptance Criteria:** 90%+ users complete onboarding in <2 minutes; comprehension survey shows 80%+ understand they can modify the plan

#### 5. Error Handling & Edge Cases (Same as before)
**Status:** Needs audit
**Requirements:**
- Graceful handling of missing timezone data, invalid flight times, device time changes
- User-friendly error messages
- **Acceptance Criteria:** Beta testing reveals no crashes; all invalid inputs show clear errors

#### 6. Privacy Policy & Terms (Same as before)
**Status:** Not created
**Requirements:**
- Draft Privacy Policy and Terms of Service
- Add links in Profile Settings
- **Acceptance Criteria:** Legal review completed

#### 7. App Store Assets (Same as before)
**Status:** Not created
**Requirements:**
- App icon, screenshots (show adaptive features!), App Store description
- **NEW description angle:** "Jet lag plans that adapt to reality. Delayed flight? Exhausted? We've got you. Recover 40% faster without the guilt."
- **Acceptance Criteria:** Assets approved by beta testers

---

### P1 — Strongly Recommended for Launch

#### 8. Post-Trip Summary with Flexibility Celebration ⭐ **REVISED**
**Status:** Not implemented
**Requirements:**
- Show visual summary: "You followed 65% of recommendations" (don't hide this if it's <80%!)
- **Reframe lower adherence as success:** "You adapted the plan to fit your trip and still recovered in 3 days!"
- Confetti animation if recovery time improved (regardless of adherence %)
- Share button: "I beat jet lag in 3 days with TravelBuddy — even with a delayed flight! 🌍✈️"
- **Acceptance Criteria:** Users with 50-70% adherence still feel proud of results (survey: "Did the summary make you feel good about your trip?")

#### 9. "Why This Action?" Transparency
**Status:** Partially implemented (cards have "why" and "how" fields, but might not always show)
**Requirements:**
- Every action card shows brief explanation: "Caffeine now helps you stay awake until local bedtime"
- Tap for more detail: "Caffeine has a 5-hour half-life. Drinking coffee at 2pm means it's 50% out of your system by 7pm..."
- **Acceptance Criteria:** Beta testers report understanding why they're being asked to do each action (survey: 90%+ agree "I understood the science behind recommendations")

#### 10. Smart Defaults Based on Past Behavior ⭐ **NEW**
**Status:** Not implemented
**Problem:** Users who've completed 2-3 trips have established patterns (e.g., always arrive exhausted, always skip afternoon naps)
**Requirements:**
- After 2 completed trips, analyze user's adherence patterns
- Suggest defaults: "You usually arrive exhausted — should we assume that for this trip?" (pre-check exhaustion toggle)
- "You rarely take afternoon naps — should we focus on evening sleep instead?" (adjust recommendations)
- **Acceptance Criteria:** Return users (2+ trips) see at least 1 smart default suggestion; 70%+ accept the suggestion

---

## 🔮 Post-Launch: Doubling Down on Adaptivity

### Advanced Adaptive Features
- **Weather integration**: "It's raining in Tokyo today — here's indoor light exposure alternatives"
- **Calendar integration**: "You have a dinner at 8pm tonight — adjusting evening recommendations"
- **Context-aware nudges**: "You haven't opened the app in 6 hours — you're probably busy. Here's what you missed (no worries!)"
- **Proactive conflict detection**: "Your 2pm coffee recommendation conflicts with your 3pm meeting — want to shift it to 1pm?"

### Personalization Through Adaptation
- **Chronotype learning**: After 2-3 trips, identify if user is early bird or night owl based on what they actually complete (not what they say)
- **Tolerance thresholds**: Learn user's typical adherence pattern and adjust expectations (e.g., user always follows 70% → celebrate 70% as success, not failure)
- **Action preference learning**: If user consistently skips naps but completes light exposure, prioritize light recommendations

### Competitive Moat
- **Adaptive algorithm as IP**: The more users complete trips, the better the system gets at predicting what real travelers can actually do (vs theoretical optimal plans)
- **Data advantage**: Collect patterns on what actions are hardest to follow (e.g., morning light is 90% completion, afternoon naps are 40% completion) → Adjust defaults for all users

---

## Success Metrics (Revised)

### North Star Metric
**Repeat Plan Creation Rate:** % of users who create a 2nd plan within 6-9 months of their first plan

**Why this metric:**
- Captures moderate travelers (1-2 trips/year) across seasonal patterns (summer vacation + winter/fall trip)
- Indicates genuine value delivery (users come back voluntarily)
- Accounts for natural travel frequency without penalizing occasional travelers
- Will segment by: Frequent (3+ trips/year), Moderate (2 trips/year), Occasional (1 trip/year) once multi-year data exists

**Target:** 40-45% repeat usage within 9 months

**Secondary North Star (Outcome-Focused):**
"Adaptive recovery success rate" = % of users who recover in <3 days **despite** missing 20-30% of actions
- This validates whether adaptivity actually works

### Conversion & Monetization Metrics

#### Conversion Rate (Post-Free Launch)
**Definition:** % of users who pay after completing their first free plan

**Why it matters:** Validates whether users find enough value to pay

**Track by:**
- **When they convert:** Before 2nd trip / During 2nd trip / After 2nd trip completion
- **What convinced them:** Survey question "What made you decide to upgrade?" (Multiple choice: Worked well on first trip / Need it for upcoming trip / Want to support the app / Worried I'd lose access)

**Targets:**
- **Per-trip pricing model:** 15-20% conversion after first free trip
- **Annual pricing model:** 5-8% of total users convert to yearly subscription

**Segments to analyze:**
- Conversion by trip distance (short-haul vs long-haul first trip)
- Conversion by adherence rate on first trip (do high-adherence users convert more?)
- Conversion by time gap between Trip 1 and Trip 2 (do people who travel again within 3 months convert more than those who wait 6+ months?)

#### Time to First Plan Creation
**Definition:** Minutes/hours from app download to completing first plan setup

**Why it matters:** Identifies onboarding friction points

**Target:** <5 minutes for 80% of users

**Red flags:**
- If >30% of users abandon during flight input, simplify the form
- If >20% drop off during settings (bedtime/wake time), make settings optional or move post-plan creation

### Behavioral Metrics (Leading Indicators)

#### Plan Completion Rate
**Definition:** Average % of recommended actions completed across all users

**Why it matters:** Low completion means plan is unrealistic or has too much friction

**Target:** 70%+ average completion rate

**Track by phase:**
- Prepare phase completion: Target 60%+ (lower because users aren't "feeling" jet lag yet, less motivated)
- Travel phase completion: Target 75%+ (time-sensitive, high awareness)
- Adjust phase completion: Target 70%+ (motivation high but adherence fatigues over days)

#### Action Completion Rate by Type
**Why it matters:** Reveals which recommendations are realistic vs too difficult

**Track these action types:**
- Morning light exposure: Target 80%+ (relatively easy if reminded)
- Caffeine cutoff: Target 60%+ (hard due to habits/social pressure)
- Sleep on flight: Target 70%+ (depends on flight duration, seat comfort)
- Stay hydrated: Target 85%+ (easy, low friction)
- Avoid naps (when recommended): Target 50%+ (hardest - requires fighting exhaustion)
- Local meal times: Target 75%+ (social eating usually aligns)
- Supplements (melatonin/magnesium): Target 65%+ (requires remembering to pack/take)

**Use this data to:**
- Deprioritize actions with consistently <50% completion
- A/B test alternate phrasing/timing for medium-completion actions (50-70%)
- Double down on high-completion actions (>80%) in marketing messaging

#### Notification Response Rate
**Definition:** % of push notifications that result in app open within 30 minutes

**Why it matters:** Separates helpful notifications from annoying ones

**Target:** 30-40% overall (higher than typical app benchmarks of 10-15% because jet lag notifications are time-sensitive)

**Segment by notification type:**
- Action reminders (15 min before): Target 35-45%
- Phase change notifications ("You've arrived! Starting adjustment phase"): Target 60%+ (high novelty)
- Encouragement/progress ("You're 80% on track!"): Target 20-30% (informational, lower urgency)

**Red flags:**
- If <20% overall, notifications are too frequent or not valuable → Reduce frequency
- If users disable notifications entirely: Survey "Why did you turn off notifications?" → Fix onboarding explanation

#### Feature Usage Rates
**Track adoption of:**
- **Multi-leg trip planning:** % of users who add connections (indicates complexity tolerance)
- **Exhaustion toggle:** % of users who mark "Exhausted" on arrival (indicates adaptive feature awareness)
- **Quick delay feature:** % of users who use flight delay rescheduling
- **Undo functionality:** % of users who undo a completed action (measures error tolerance)
- **Settings customization:** % who change default bedtime/wake time, enable melatonin/magnesium
- **"Why this helps" expansions:** % who tap to read full explanations (measures curiosity/trust-building)

**Use for prioritization:**
- If <10% use multi-leg despite 30%+ of trips being multi-leg (from flight data), feature is too hidden → Improve discoverability
- If >60% use exhaustion toggle, this is a core feature → Highlight in onboarding and marketing

### Outcome Metrics (Lagging Indicators)

#### User-Reported Recovery Time
**Definition:** Average days until users report feeling "fully adjusted" (from post-trip survey)

**Target:** 2.5 days (compared to self-reported baseline of 4-5 days without app)

**Segment by:**
- Timezone difference (<3h, 3-6h, 6-9h, 9+h)
- Direction (eastward vs westward)
- Adherence rate (correlate recovery time with % of actions completed)

**Key insight to validate:** Do users with 60-70% adherence still recover in ~3 days? If yes, adaptivity is working.

#### Adherence Rate Under Chaos
**Definition:** Average plan completion % for users who experienced disruptions (flight delays, exhaustion, missed actions)

**Target:** 70%+ adherence even when users miss 20-30% of early actions

**Why it matters:** Measures whether adaptive features keep users engaged after initial setbacks

**Compare:**
- Users who experienced disruptions vs smooth trips
- If disruption group has <60% adherence, adaptivity features aren't working → Improve replanning UX

#### Guilt-Free Metric
**Definition:** % of users who answer "No" to post-trip survey question: "Did the app make you feel guilty when you couldn't follow recommendations?"

**Target:** 95%+ answer "No"

**Why it matters:** Core to differentiation (supportive vs judgmental tone)

**If <90%:** Review messaging, especially:
- Progress indicators (are we showing too much red/negative feedback?)
- Missed action handling (do we say "You missed X" or "Here's what's next"?)
- Completion percentage framing (is 65% framed as "good" or "failure"?)

#### NPS Score
**Target:** 40+ (category: "Good")

**Look for qualitative themes:**
- Promoters (9-10): What words do they use? ("Flexible", "Realistic", "Actually works", "Saved my trip")
- Detractors (0-6): Why? ("Too many notifications", "Didn't work", "Confusing", "App crashed")

#### App Store Rating
**Target:** 4.2+ with 50+ reviews in first 3 months

**Specifically look for reviews mentioning:**
- Adaptivity ("Worked even when my flight was delayed!")
- Ease of use ("So simple compared to other apps")
- Actual results ("Recovered in 2 days!")

**Red flags:**
- Reviews saying "Too complicated" → Simplify onboarding
- "Notifications were annoying" → Reduce frequency or improve targeting
- "Didn't work" → Dig into their trip details, was the plan wrong or did they not follow it?

#### Retention Metrics
**Week 1 retention:** Target 80%+ of users open app at least once between Days 1-7 post-download

**Why this matters:** Jet lag apps have natural "dead periods" (between trips), so Week 1 is critical

**Multi-month retention:**
- 3-month retention: Target 30-40% (accounts for users who don't travel again yet)
- 6-month retention: Target 25-35%
- 9-month retention: Target 20-30%

**Note:** These are lower than typical app retention because travel is episodic, not daily

#### Organic Referral Rate
**Definition:** % of users who share the app (measured via post-trip survey: "Did you recommend TravelBuddy to anyone?")

**Target:** 25%+

**Track referral sources:**
- Post-trip social share (from in-app share button)
- Word of mouth (survey: "How did you hear about us?")
- App Store search (implies brand awareness from referrals)

### Diagnostic Metrics

#### Uninstall Rate & Timing
**Track when users uninstall:**
- Within 24 hours (onboarding failure)
- Days 1-3 post-trip (plan didn't work)
- After 2-4 weeks (trip completed, app no longer needed - expected!)
- Before 2nd trip (forgot about app - retention opportunity)

**If >30% uninstall before completing first trip:** Major problem, investigate:
- Did they create a plan?
- Did they follow any actions?
- Did they disable notifications?

#### Sessions Per Active User
**Expected pattern for jet lag app:**
- **2 days before trip:** 1-2 sessions (plan creation)
- **Day of travel:** 3-5 sessions (checking actions, marking complete)
- **Days 1-3 post-arrival:** 4-8 sessions/day (high engagement during adjustment)
- **Days 4-7 post-arrival:** 1-2 sessions/day (tapering off)
- **Days 8+:** 0-1 sessions (trip complete, reviewing past plans)

**If sessions are lower:**
- Users aren't opening app to check actions → Notifications aren't working OR plan isn't valuable
- Users create plan but don't engage during trip → Onboarding didn't explain value

---

## Competitive Positioning (Revised)

### Primary Competitor: Timeshifter

**Timeshifter's Approach:**
- Scientifically validated (NASA, athletes)
- Rigid schedules with minimal flexibility
- **Unspoken message:** "If you follow the plan perfectly, you'll recover fast. If you deviate, good luck."
- Users who miss actions feel they've "broken" the plan

**TravelBuddy's Approach:**
- Science-backed but **reality-first**
- Adaptive schedules that tolerate chaos
- **Explicit message:** "Travel is unpredictable. We'll adapt. You're doing great."
- Users who miss actions still feel supported and see progress

### Head-to-Head Scenario

**Scenario:** User has flight from NYC to Tokyo. Flight is delayed 4 hours. They arrive exhausted at midnight instead of 8pm.

**Timeshifter:** Plan is now out of sync. User is confused about which recommendations to follow. Feels like they've "failed" already.

**TravelBuddy:**
1. User taps "My flight is delayed by 4 hours" → All Day 1 actions automatically shift
2. User marks "Exhausted" on arrival → Schedule adjusts to prioritize recovery nap over staying awake
3. User sees: "You're adapting to unexpected changes — that's the hardest part. You're still on track."

**Result:** TravelBuddy user still recovers in 3 days. Timeshifter user gives up and wings it (4-5 days).

### Differentiation Summary

| Feature | Timeshifter | TravelBuddy |
|---------|-------------|-------------|
| Science-backed | ✅ NASA-validated | ✅ Research-based |
| Pre-trip prep | ✅ 3-4 days | ⚠️ 2 days (MVP) |
| Adaptivity | ❌ Rigid schedule | ✅ Core feature |
| Flight delays | ❌ Manual recalc | ✅ One-tap replan |
| Exhaustion handling | ❌ N/A | ✅ Modified schedule |
| Missed action tolerance | ❌ Silent failure | ✅ Supportive messaging |
| Pricing | 💰 $9.99/plan | 🆓 Free (v1) |
| Target user | Frequent flyers, athletes | Leisure travelers |
| Tone | Clinical, professional | Supportive, realistic |

**Win condition:** Users choose TravelBuddy not because it's more scientific, but because it **actually works** for real travel (chaos included).

---

## User Stories (Revised to Emphasize Adaptivity)

### Sarah's Story: The Flight Delay
Sarah is flying NYC → Rome for a 10-day vacation. She creates a plan in TravelBuddy.

**Day 0 (Departure):**
- Flight delayed 3 hours. Sarah panics — her plan is ruined!
- Opens TravelBuddy, sees notification: "Flight delayed? Tap here to update your plan."
- Taps button, selects "3 hours delay", plan automatically adjusts
- Feels relieved: "Oh, the app just handles this."

**Day 1 (Arrival):**
- Lands at 11pm (not 8pm). Exhausted.
- App asks: "How are you feeling? Exhausted / OK"
- Selects "Exhausted"
- Schedule shifts: Original plan said "Stay awake until midnight." New plan says "Take 90-min recovery nap now, then short walk, then sleep at 1:30am."
- Sarah follows it, feels supported not judged

**Day 2:**
- Morning sunlight reminder at 8am. Sarah sleeps until 9am (missed it).
- Opens app, sees: "You're still 85% on track for the week. Here's what's next: Caffeine OK until 2pm."
- No red X, no guilt. Just adaptive guidance.
- Sarah completes 70% of Day 2 actions and feels good about it

**Day 3:**
- Feels adjusted! Completes post-trip survey: "Recovered in 2.5 days despite flight delay and missing some actions. This app is magic!"
- Shares on Instagram, 4 friends download it

### Mark's Story: The Short Trip Strategy
Mark is flying NYC → LA for a 2-day work trip (meetings on Day 2).

**Trip Creation:**
- App detects 3-hour timezone difference, 2-day trip duration
- Offers two strategies:
  1. "Stay on home time" (easier, less disruption)
  2. "Adjust to LA time" (better if you want to feel local)
- Mark picks "Stay on home time" because he's flying back quickly
- App generates plan: "Keep NYC sleep schedule, limit morning light in LA, caffeine timing based on NYC time"
- Mark follows it, feels sharp for meetings, flies home without jet lag

**Why this matters:** TravelBuddy didn't force Mark into a one-size-fits-all adjustment plan. It recognized his trip context and adapted strategy.

---

## Technical Architecture Notes

### Current Adaptive Logic (Already Implemented!)
Your `jetLagAlgorithm.ts` already has impressive adaptivity:
- `arrivalRestStatus` field (exhausted vs OK)
- `adjustmentPreference` field (stay_home vs adjust)
- `suppressPreparePhase` and `suppressAdjustPhase` flags for overlaps
- `JetLagConfig` constants for thresholds (can be tuned based on beta data!)

### Suggested Data Collection for Future ML
Even without ML in v1, collect structured data on:
- Which actions are skipped most often (by time of day, phase, user segment)
- Correlation between adherence % and recovery time
- Which adaptive features are used (exhaustion toggle, delay, undo) and outcomes

This data becomes your moat — eventually you can say "TravelBuddy is trained on 10,000 real trips, not just lab research."

---

## Revised Launch Timeline (3 Months)

### Month 1: Adaptive Feature Polish (Weeks 1-4)
- **Week 1-2**: Implement P0 #1-2 (adaptive messaging, real-time replanning)
- **Week 3**: Revise onboarding to emphasize flexibility
- **Week 4**: Implement post-trip survey with adaptivity questions

### Month 2: Beta Testing & Iteration (Weeks 5-8)
- **Week 5**: Recruit 30-50 beta testers, emphasize "we want to test this with real chaos" (encourage testing with delayed flights, busy schedules)
- **Week 6**: Collect beta feedback on adaptive features specifically ("Did replanning work?" "Did you feel supported?")
- **Week 7**: Iterate based on feedback, add P1 features (smart defaults, post-trip celebration)
- **Week 8**: Second beta round with 10-15 new users

### Month 3: App Store Submission & Soft Launch (Weeks 9-12)
- **Week 9**: Finalize app store assets (emphasize adaptivity in screenshots!)
- **Week 10**: Submit to App Store and Google Play
- **Week 11**: Soft launch to beta networks
- **Week 12**: Monitor metrics, focusing on adaptivity indicators (replanning usage, guilt-free metric, recovery despite low adherence)

---

## Open Questions (Revised)

### Pre-Launch
1. **[Product]** Should we add a "Flexible Mode" toggle in settings for users who want maximum adaptivity (e.g., plan shows 3-4 options per time slot, user picks what fits their schedule)?
2. **[UX]** How do we visualize "you're still on track" when users miss actions? Progress bar that shows "70% is great for Day 2"? Color-coded milestones (green at 60%+, yellow at 40-60%, red only below 40%)?
3. **[Data]** What's the minimum adherence % that still yields good outcomes? If users follow only 50% of recommendations, do they still recover faster? Need beta data.
4. **[Positioning]** Should we explicitly call out "adaptive" in the product name/tagline? "TravelBuddy: Adaptive Jet Lag Recovery" or keep it subtle?
5. **[Feature Priority]** Should real-time replanning (P0 #2) be v1.0 or can it wait for v1.1? It's complex to build but core to positioning.

### Post-Launch
6. **[Monetization]** Do users value adaptivity enough to pay for it? Could we have a "Pro" tier with advanced replanning (calendar integration, weather-aware, etc.)?
7. **[Partnerships]** Should we partner with airlines to offer "Flight delayed? Here's your updated TravelBuddy plan" messages?
8. **[Algorithm]** Can we A/B test strict vs flexible plans? Give half of users rigid Timeshifter-style plans, half get adaptive plans, measure outcomes?

---

## Next Steps (Immediate Action Plan)

**This week:**
1. Implement adaptive messaging in onboarding (P0 #1) — highest impact, lowest effort
2. Draft revised App Store description emphasizing adaptivity
3. Create beta tester recruitment post highlighting "We want to test this with chaotic trips!"

**Next week:**
4. Implement real-time replanning (P0 #2) — start with flight delay handler
5. Add post-trip survey with guilt/adaptivity questions (P0 #3)

**Prototype for beta testers:**
6. Create interactive demo showing: flight delay → replan → exhaustion toggle → recovery despite 65% adherence
7. Use this to pitch beta testers: "We're building a jet lag app that doesn't make you feel like you failed when travel gets messy."

---

## Closing Thoughts: Your Competitive Advantage

You've built something more sophisticated than you initially realized. The adaptive features aren't nice-to-haves — **they're your entire differentiation**.

Timeshifter wins on scientific rigor. You win on **real-world resilience**.

Most productivity/health apps assume perfect conditions. Yours assumes chaos and adapts. That's rare and valuable.

**Positioning test:** If a user says "I tried a jet lag app once but I couldn't stick to the schedule," they're your perfect customer. TravelBuddy is the app for people who've failed rigid plans before.

**Slogan idea:** "Jet lag plans that bend, not break."

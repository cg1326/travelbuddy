# travel buddy

Jet lag apps work great in theory. The schedule is scientifically sound, you follow it, and you recover in two days.

That doesn't happen. Flights get delayed, you arrive exhausted, and you skip the afternoon nap because you're actually on vacation. Existing apps treat any deviation as a silent failure, and most people abandon the plan after the first or first few missed actions.

travel buddy is an iOS mobile app that generates personalized jet lag recovery plans for leisure or casual travelers crossing time zones. The idea came from a simple pain point I’d dealt with when traveling: every time I flew internationally, I would try to do mental math on when to sleep to get X number of hours and when to not have caffeine, and inevitably still feel destroyed for the first three days of a trip. 

## Who does this benefit?

The immediate benefit is a recovery plan tailored to their specific route and schedule. Instead of Googling "how to beat jet lag when flying to Italy" or asking ChatGPT and getting imprecise or conflicting answers sourced from Reddit advice, they get a single adaptive plan with timed recommendations. For users going to weddings or vacations where they want to be present from the get go, even reducing one day from the total recovery time has meaningful value.


[![Download on the App Store](https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg)](https://apps.apple.com/us/app/travel-buddy-adjust-timezones/id6757408473)

<p align="center">
  <img width="800" alt="Frame 1" src="https://github.com/user-attachments/assets/f6bd4df3-c410-43bf-af9b-6fbb3a151aa8" />
  <img width="800" alt="Frame 4" src="https://github.com/user-attachments/assets/3d111b6a-3705-4df1-98cf-8a3222d56c8c" />
  <img width="800" alt="Frame 3" src="https://github.com/user-attachments/assets/157a4fe3-61f7-4f7b-94ab-14d4321ac308" />
  <img width="800" alt="Frame 2" src="https://github.com/user-attachments/assets/98fc6710-3729-4d12-bb59-0deece9476f2" />
  <img width="800" alt="Frame 5" src="https://github.com/user-attachments/assets/6ff2bb46-d9b8-453b-806b-f5c4041c2540" />
</p>

## What it does

**Flight delay replanning.** Tell the app your flight is delayed and by how much. Then, all remaining actions shift automatically to account for your inputs.

**Exhaustion-aware scheduling.** On arrival, the app asks how you're feeling. If you're feeling more drained than usual, it rebuilds Day 1 around a recovery nap rather than pushing the original timeline.

**Non-punitive UX.** Missing an action doesn't break the plan or show red indicators. Instead, the app shows the next recommended actions (forward-looking orientation).

**Multi-scenario logic.** Short trips, multi-leg routes, 3-hour vs. 12-hour timezone differences, east vs. west crossings all respectively get a different strategy.

**Conflict detection.** If you're flying again before you've finished recovering from the last trip, or if there's a logical conflict in back to back trips, the app catches the overlap and resolves it.

**Location-aware light guidance.** Sunrise and sunset times are calculated for your exact location. Overcast day or stuck indoors, it falls back to indoor light alternatives.

## How it compares to Timeshifter

Timeshifter gives you a scientifically validated schedule. It's a good product and works if you follow it. Most leisure travelers can't follow it perfectly, and the app doesn't account for that.

travel buddy is built for trips where something goes differently than planned, as users following 65-70% of recommendations are still recovering in under 3 days. Full adherence isn't the goal; rather, it's recovery that holds up when the trip doesn't go to plan.

## Product strategy (brainstorming)

### Positioning
**The flexible jet lag planner that adapts to real life**

Most jet lag apps assume everything goes to plan. Travel Buddy is built for when it doesn't: flight delays, missed recommendations, schedule conflicts, and trips where you're traveling with kids or running on three hours of sleep.

### Differentiation
Flexibility across three dimensions:
- **Adaptive**: adjusts when plans change (delays, missed steps, schedule conflicts)
- **Realistic**: accounts for real constraints like work commitments and sleep deprivation
- **Proportional**: matches guidance to the problem (a 2-hour timezone shift ≠ an 8-hour one)

### Target User
Moderate to frequent travelers who cross timezones 3–4x per year. Not the biohacker optimizing every circadian variable, but the person who wants to feel human on day one of their trip without a complicated plan.

- **Income:** $150K+ (international travel skews higher income)
- **Trip type:** Both domestic and international, ideally crossing 2+ timezones
- **Attitude:** Finds the science interesting when it's easy to follow. Won't go out of their way to over-optimize.

**Why this segment?** Timeshifter reviews consistently surface the same frustrations: recommendations that feel overwhelming, a "science-backed" angle that not everyone connects with, and zero flexibility when things change. Travel Buddy is the antidote: friendly, non-intimidating, and built for the casual-but-serious traveler.

### North Star Metric
**% of users who create a second plan within 9 months of their first**

Captures both moderate travelers (summer + winter trip) and frequent travelers. Target: 40–45% repeat usage within 9 months.

### Supporting Metrics

| Metric | Why it matters | Target |
|---|---|---|
| Per-trip conversion rate | Do people value it enough to pay? | 15–20% |
| Annual conversion rate | Overall monetization health | 5–8% |
| Plan completion rate | Low completion = friction or unrealistic recs | 70%+ |
| Notification response rate | Are notifications helpful or annoying? | 30–40% |
| Time to first plan | Onboarding friction | <5 min |

**Action completion by type** (tracks what's realistic vs. too hard):
- Morning light exposure
- Caffeine cutoff
- Sleep on flight
- Hydration
- Avoiding naps
- Local meal timing
- Supplements

### Some pricing ideas for future

- MVP all free initially
- First plan free, then $2.99/plan (MVP)
- First plan free, then $2.99/plan, or $7.99/year for unlimited use
- First plan free, then $7.99/year for unlimited use
- Need to gatekeep users trying to edit their first plan or Xth plan without paying for an additional plan or annual fee

## Tech stack

- React Native (iOS)
- TypeScript
- Firebase
- SunCalc

## Run it

```bash
npm install

# iOS
bundle install
bundle exec pod install
npm run ios

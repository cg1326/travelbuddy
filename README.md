# travel buddy

Jet lag apps work great in theory. The schedule is scientifically sound, you follow it, and you recover in two days.

That doesn't happen. Flights get delayed, youu arrive exhausted, and uou skip the afternoon nap because you're actually on vacation. Existing apps treat any deviation as a silent failure, and most people abandon the plan after the first or first few missed actions.

travel buddy is a iOS app for jet lag recovery built on the assumption that real travel is unpredictable. When something goes wrong, the plan adapts instead of falling apart.

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

## Tech

React Native (iOS + Android), TypeScript, Firebase, SunCalc.

## Run it

```bash
npm install

# iOS
bundle install
bundle exec pod install
npm run ios

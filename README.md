# travel buddy

Jet lag apps work great in theory. The schedule is scientifically sound, you follow it, and you recover in two days.

That doesn't happen. Flights get delayed. You arrive exhausted. You skip the afternoon nap because you're actually on vacation. Existing apps treat any deviation as a silent failure, and most people abandon the plan after the first missed action.

travel buddy is a React Native app (iOS) for jet lag recovery built on the assumption that real travel is unpredictable. When something goes wrong, the plan adapts instead of falling apart.

[![Download on the App Store](https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg)](https://apps.apple.com/us/app/travel-buddy-adjust-timezones/id6757408473)

<img width="800" alt="Frame 1" src="https://github.com/user-attachments/assets/b4c39fa9-34b0-4762-b736-8ae52ad308ce" />
<img width="800" alt="Frame 4" src="https://github.com/user-attachments/assets/80153729-0624-4e3a-9262-e80c52fb1b48" />
<img width="800" alt="Frame 3" src="https://github.com/user-attachments/assets/ac6f7558-0b28-4329-bf61-ab586950dc7c" />
<img width="800" alt="Frame 2" src="https://github.com/user-attachments/assets/71635a31-d5fe-4bde-8551-1431d2458032" />
<img width="800" alt="Frame 5" src="https://github.com/user-attachments/assets/f5553b20-572a-4ac1-a79a-a04df65d90c5" />

## What it does

**Flight delay replanning.** Tell the app your flight is delayed and by how much. All remaining actions shift automatically.

**Exhaustion-aware scheduling.** On arrival, the app asks how you're feeling. If you're wrecked, it rebuilds Day 1 around a recovery nap rather than pushing the original timeline.

**Non-punitive UX.** Missing an action doesn't break the plan or show red indicators. The app shows what's next, not what you failed at.

**Multi-scenario logic.** Short trips, multi-leg routes, 3-hour vs. 12-hour timezone differences, east vs. west crossings. Each gets a different strategy.

**Conflict detection.** Flying again before you've finished recovering from the last trip? The app catches the overlap and resolves it.

**Location-aware light guidance.** Sunrise and sunset times are calculated for your exact location using SunCalc. Overcast day or stuck indoors, it falls back to indoor light alternatives.

## How it compares to Timeshifter

Timeshifter gives you a scientifically validated schedule. It's a good product. It works if you follow it. Most leisure travelers can't follow it perfectly, and the app doesn't account for that.

travel buddy is built for trips where something goes differently than planned. Users following 65-70% of recommendations are still recovering in under 3 days. Full adherence isn't the goal; rather, it's recovery that holds up when the trip doesn't go to plan.

## Tech

React Native (iOS + Android), TypeScript, Firebase, SunCalc.

## Run it

```bash
npm install

# iOS
bundle install
bundle exec pod install
npm run ios

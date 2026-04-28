# TravelBuddy

Jet lag apps work great in theory. The schedule is scientifically sound, you follow it, and you recover in two days.

That doesn't happen. Flights get delayed. You arrive exhausted. You skip the afternoon nap because you're actually on vacation. Existing apps treat any deviation as a silent failure, and most people abandon the plan after the first missed action.

TravelBuddy is a React Native app (iOS + Android) for jet lag recovery built on the assumption that real travel is unpredictable. When something goes wrong, the plan adapts instead of falling apart.

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

## Status

MVP built, published on App Store as 'travel buddy' https://apps.apple.com/us/app/travel-buddy-jet-lag-plans/id6757408473.

## Run it

```bash
npm install

# iOS
bundle install
bundle exec pod install
npm run ios

# Android
npm run android
```

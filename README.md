# TravelBuddy

A jet lag recovery app that adapts to the chaos of real travel — delayed flights, exhaustion, missed actions and all.

## What it is

TravelBuddy is a React Native app (iOS + Android) that generates personalized jet lag recovery plans based on your flights, sleep schedule, and timezone. Unlike rigid schedule-based tools, TravelBuddy is built around one core idea: **travel is unpredictable, and your recovery plan should flex with it**.

Tell the app your flights. It builds a plan covering caffeine timing, sleep windows, light exposure, and more. When things go sideways — your flight is delayed, you land exhausted, or you miss a few recommendations — TravelBuddy adapts the plan rather than leaving you stranded with a schedule that no longer makes sense.

## Why it exists

Most jet lag apps give you a scientifically optimal schedule, then silently fail the moment reality intervenes. Flights get delayed. You arrive more wrecked than expected. You miss an afternoon nap because you were actually enjoying your vacation. Existing tools treat any deviation as a failure — and users just give up.

TravelBuddy is built for the other 99% of trips: the ones where something goes differently than planned. The app assumes chaos and adapts accordingly, so you stay on track even when your itinerary doesn't.

**Core insight:** Travelers don't need another rigid system to feel guilty about. They need adaptive guidance that meets them where they are.

## Key features

- **Adaptive replanning** — Tap "my flight is delayed" and the entire plan shifts automatically
- **Exhaustion-aware adjustments** — Arrive wrecked? The app modifies your Day 1 schedule around a recovery nap instead of pushing you to power through
- **Non-punitive UX** — Missing actions doesn't break your plan or show angry red indicators. The app shows you what's next, not what you failed at
- **Multi-scenario support** — Short trips, multi-leg flights, eastward vs. westward crossings, small vs. large timezone differences all get tailored strategies
- **Conflict detection** — Flying again before you've recovered from the last trip? The app detects overlapping plans and resolves them
- **Science-backed recommendations** — Caffeine timing, sleep windows, light exposure, and optional melatonin/magnesium guidance based on established jet lag research
- **Real sunrise/sunset data** — Light exposure recommendations use your actual location, with indoor light fallbacks for cloudy days

## Tech stack

- React Native (iOS + Android)
- TypeScript
- Firebase (backend + analytics)
- SunCalc (sunrise/sunset calculations)

## Status

MVP built, pre-launch. Currently preparing for App Store and Google Play submission.

## Getting started

```bash
npm install

# iOS
bundle install
bundle exec pod install
npm run ios

# Android
npm run android
```

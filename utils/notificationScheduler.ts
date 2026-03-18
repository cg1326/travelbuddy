import notifee, { AndroidImportance, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import moment from 'moment-timezone';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { calculateTimezoneDiff } from './jetLagAlgorithm';

const CHANNEL_ID = 'jet-lag-reminders';
const PERSISTENT_NOTIFICATION_ID = 'jet-lag-persistent';

export interface NotificationSettings {
  enabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const stored = await AsyncStorage.getItem('notification-settings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  await AsyncStorage.setItem('notification-settings', JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
}

// ----------------------------------------------------------------------
// SHARED LOGIC: Generate all cards for a plan with exact timestamps
// ----------------------------------------------------------------------

function getAllPlanCards(activePlan: any, cardStatuses: Record<string, string> = {}) {
  const allCards: any[] = [];
  const activePlanName = activePlan.name;

  activePlan.jetLagPlans.forEach((jetLagPlan: any, tripIndex: number) => {
    const trip = activePlan.trips[tripIndex];
    if (!trip) return; // Guard against missing trip
    const lastSegment = trip.segments && trip.segments.length > 0
      ? trip.segments[trip.segments.length - 1]
      : trip;
    const destTz = lastSegment.toTz || trip.toTz;

    // Safety fallback if no tz is present (rare)
    const arriveDateStr = `${lastSegment.arriveDate} ${lastSegment.arriveTime}`;
    const arriveDate = destTz
      ? moment.tz(arriveDateStr, 'YYYY-MM-DD HH:mm', destTz)
      : moment(arriveDateStr, 'YYYY-MM-DD HH:mm');

    const departDate = moment(trip.departDate);

    const processCard = (card: any, time: moment.Moment, phase: 'prepare' | 'travel' | 'adjust') => {
      // Check status
      const statusKey = `${activePlan.id}_${card.id}`;
      const status = cardStatuses[statusKey];

      // If skipped, do NOT include.
      if (status === 'skipped') return;

      // If done, generally do NOT include, EXCEPT for the "Arrival" card.
      // The user wants the "Welcome to [City]" notification to fire as a welcome message
      // even if they checked it off early.
      if (status === 'done' && card.id !== 'adjust-arrival') return;

      if (!card.isInfo && card.dateTime) {
        allCards.push({
          ...card,
          fullDateTime: time,
          planName: activePlanName,
          destination: trip.to,
          phase, // Store phase for navigation
          tripIndex: String(tripIndex),
        });
      }
    };

    // Prepare phase cards
    if (jetLagPlan.phases.prepare && jetLagPlan.phases.prepare.cards) {
      for (const card of jetLagPlan.phases.prepare.cards) {
        if (!card.dateTime) continue;
        processCard(card, moment(card.dateTime), 'prepare');
      }
    }

    // Travel phase cards
    if (jetLagPlan.phases.travel && jetLagPlan.phases.travel.cards) {
      for (const card of jetLagPlan.phases.travel.cards) {
        processCard(card, moment(card.dateTime), 'travel');
      }
    }

    // Adjust phase cards
    // SKIP if strategy is 'stay_home' OR if suppressAdjustPhase is true
    // (Note: For Stay Home, we sometimes merge adjust cards into travel, but those are usually in currentTrip.phases.travel if merged at generation time. 
    // If they are still in 'adjust' phase object, we should likely suppress them if the tab is hidden to avoid confusion, 
    // OR we assume 'travel' phase contains everything needed for Stay Home.)
    // Adjust phase cards
    if (jetLagPlan.phases.adjust && jetLagPlan.phases.adjust.cards) {
      for (const card of jetLagPlan.phases.adjust.cards) {
        if (!card.dateTime) continue;
        processCard(card, moment(card.dateTime), 'adjust');
      }
    }

    // Inject "Welcome / Energy Check" Notification (At Arrival)
    // This is a synthetic card just for notifications—it triggers the app to open,
    // where TripDetails.tsx will automatically show the "Exhausted/Ok" modal.
    // Suppress if this is a connection (adjust phase suppressed) OR stay_home
    // Also suppress if the user already responded to the in-app modal (arrivalRestStatus is set)
    if (!jetLagPlan.suppressAdjustPhase && jetLagPlan.strategy !== 'stay_home' && !trip.arrivalRestStatus) {
      const energyCheckTime = arriveDate.clone().add(15, 'minutes'); // Delay by 15 mins to sync with popup
      if (energyCheckTime.isValid()) {
        allCards.push({
          id: `energy-check-${tripIndex}`,
          title: `Welcome to ${trip.to}!`,
          time: 'Tell us how you feel post-flight so we can tailor the rest of your adjustment plan',
          dateTime: energyCheckTime.toISOString(),
          fullDateTime: energyCheckTime,
          planName: activePlanName,
          destination: trip.to,
          phase: 'adjust', // Explicitly Adjust phase
          isInfo: false, // Ensure it gets scheduled
          tripIndex: String(tripIndex),
        });
      }
    }

    // Inject "Post Trip Feedback" Notification (Lever A)
    const tzDiffHours = Math.abs(calculateTimezoneDiff(trip.from, trip.to, trip.departDate, trip.fromTz, trip.toTz));
    if (jetLagPlan.strategy !== 'stay_home' && !jetLagPlan.suppressAdjustPhase && tzDiffHours >= 4 && jetLagPlan.phases.adjust?.endDate) {
      // Schedule for exactly 24 hours after adjust phase ends
      const feedbackTime = moment.tz(jetLagPlan.phases.adjust.endDate, destTz).add(24, 'hours');

      if (feedbackTime.isValid()) {
        allCards.push({
          id: `post-trip-feedback-${tripIndex}`,
          title: 'How was your recovery?',
          time: "Let us know how you've adjusted so we can improve your future plans.",
          dateTime: feedbackTime.toISOString(),
          fullDateTime: feedbackTime,
          planName: activePlanName,
          destination: trip.to,
          phase: 'adjust',
          isInfo: false,
          tripIndex: String(tripIndex), // Explicitly pass tripIndex as string for deep linking
        });
      }
    }
  });

  // CHECK FOR CONFLICT WARNING
  // If any trip has a critical conflict, we should suppress all other advice to avoid confusing the user.
  // We will ONLY schedule the conflict warning notification.
  const conflictCard = allCards.find(c => c.id.startsWith('conflict-warning'));
  if (conflictCard) {
    console.warn('[NOTIF] Plan has conflict. Suppressing valid advice.');
    return [{
      ...conflictCard,
      // Ensure it has a valid time for notification (now + 1 min or original time)
      fullDateTime: moment(conflictCard.dateTime),
      planName: activePlanName,
      destination: 'Conflict'
    }];
  }

  // Deduplicate cards based on ID and Time to prevent spam
  const uniqueCards = [];
  const seenKeys = new Set();

  for (const card of allCards) {
    // Use TITLE + TIME as key to aggressively filter duplicates.
    // If two cards have different IDs but same text/time, we only want one.
    const key = `${card.title}-${card.fullDateTime.valueOf()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCards.push(card);
    }
  }

  // Sort chronologically
  return uniqueCards.sort((a, b) => a.fullDateTime.valueOf() - b.fullDateTime.valueOf());
}

// ----------------------------------------------------------------------
// HELPER: Find the single Active Plan
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// HELPER: Find the single Active Plan (Matches TodayView Logic)
// ----------------------------------------------------------------------
function getActivePlan(plans: any[]) {
  if (!plans || plans.length === 0) return null;
  const now = moment();

  let bestPlan: any = null;
  let smallestTimeDiff = Infinity;

  plans.forEach(plan => {
    // Only look at the primary/active trip context (usually the first one is fine for checking existence, 
    // but TodayView iterates all trips. We should ideally stick to the specific trip that is active.)
    // For simplicity and to match TodayView closely:

    plan.trips.forEach((trip: any, idx: number) => {
      const departDate = moment(trip.departDate);

      const lastSegment = trip.segments && trip.segments.length > 0
        ? trip.segments[trip.segments.length - 1]
        : trip;

      const destTz = lastSegment.toTz || trip.toTz;
      const arriveDateStr = `${lastSegment.arriveDate} ${lastSegment.arriveTime}`;
      const arriveDate = destTz
        ? moment.tz(arriveDateStr, 'YYYY-MM-DD HH:mm', destTz)
        : moment(arriveDateStr, 'YYYY-MM-DD HH:mm');

      // Expand window slightly to ensure we capture early prep cards matches TodayView logic (-2 days)
      const prepareStart = departDate.clone().subtract(2, 'days');
      const adjustEnd = arriveDate.clone().add(2, 'days').endOf('day');

      if (now.isAfter(adjustEnd)) return;

      const isWithinWindow = now.isBetween(prepareStart, adjustEnd, null, '[]');

      if (isWithinWindow) {
        // Active/In-Window
        let diff = 0;
        if (departDate.isSameOrBefore(now)) {
          // Departed already taking diff from departure
          diff = now.diff(departDate, 'hours');
        } else {
          // Not departed yet
          diff = departDate.diff(now, 'hours') + 1000; // Penalty to prioritize active travel over prep? 
          // actually TodayView uses days, let's stick to TodayView's weight
          // TodayView:
          // if departed: diff in days
          // if not departed: diff + 1000
        }

        // Re-implementing TodayView's exact scoring:
        let score = 0;
        if (departDate.isSameOrBefore(now)) {
          score = now.diff(departDate, 'minutes'); // Use minutes for finer grain
        } else {
          score = departDate.diff(now, 'minutes') + (1000 * 60); // +1000 arbitrary penalty
        }

        if (score < smallestTimeDiff) {
          smallestTimeDiff = score;
          bestPlan = plan;
        }

      } else if (departDate.isAfter(now)) {
        // Future Plan
        const score = departDate.diff(now, 'minutes') + (10000 * 60); // Higher penalty
        if (score < smallestTimeDiff) {
          smallestTimeDiff = score;
          bestPlan = plan;
        }
      }
    });
  });

  return bestPlan;
}


// ----------------------------------------------------------------------
// ANDROID STRATEGY: Periodic Polling (Persistent Banner)
// ----------------------------------------------------------------------
async function updateAndroidPersistentNotification(plans: any[], cardStatuses: Record<string, string>) {
  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    await notifee.cancelNotification(PERSISTENT_NOTIFICATION_ID);
    return;
  }

  const activePlan = getActivePlan(plans);
  if (!activePlan) {
    await notifee.cancelNotification(PERSISTENT_NOTIFICATION_ID);
    return;
  }

  const allCards = getAllPlanCards(activePlan, cardStatuses);
  const now = moment();

  // Find currently active card (Started but not expired)
  const validStartedCards = allCards.filter(card => {
    if (card.fullDateTime.isAfter(now)) return false; // Future
    const hoursSinceStart = now.diff(card.fullDateTime, 'hours', true);

    // Card level expiration:
    if (card.title.toLowerCase().includes('flight') || card.title.toLowerCase().includes('sleep')) {
      return hoursSinceStart <= 12;
    }
    return hoursSinceStart <= 4;
  });

  // Find upcoming
  const upcomingCards = allCards.filter(card => card.fullDateTime.isAfter(now));

  let currentCard = null;
  if (validStartedCards.length > 0) {
    currentCard = validStartedCards[validStartedCards.length - 1]; // Latest started
  } else if (upcomingCards.length > 0) {
    currentCard = upcomingCards[0]; // Next upcoming
  }

  if (!currentCard) {
    await notifee.cancelNotification(PERSISTENT_NOTIFICATION_ID);
    return;
  }

  // Check redundancy to avoid spam
  const lastState = (globalThis as any).lastNotifState || {};
  if (lastState.cardId === currentCard.id && lastState.title === currentCard.title) {
    return;
  }

  const isNewCard = currentCard.id !== lastState.cardId;
  (globalThis as any).lastNotifState = { cardId: currentCard.id, title: currentCard.title };

  await notifee.displayNotification({
    id: PERSISTENT_NOTIFICATION_ID,
    title: currentCard.title,
    body: currentCard.time,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification',
      color: '#5EDAD9',
      ongoing: true,
      onlyAlertOnce: !isNewCard,
      pressAction: { id: 'default' },
      actions: [{ title: 'View Plan', pressAction: { id: 'view' } }],
    },
    data: { planName: activePlan.name },
  });
}

// ----------------------------------------------------------------------
// iOS STRATEGY: Scheduled Triggers (Ahead-of-Time)
// ----------------------------------------------------------------------
async function scheduleIOSNotifications(plans: any[], cardStatuses: Record<string, string>) {
  console.log('[iOS] scheduleIOSNotifications called');
  const settings = await getNotificationSettings();

  // Always clear old pending notifications to prevent duplicates or stale plans
  await notifee.cancelAllNotifications();
  console.log('[iOS] Cancelled all pending notifications. Re-scheduling fresh batch...');

  if (!settings.enabled) {
    console.log('[iOS] Notifications disabled in settings');
    return;
  }

  const activePlan = getActivePlan(plans);
  if (!activePlan) {
    console.log('[iOS] No active plan found in window');
    return;
  }

  console.log(`[iOS] Found active plan: ${activePlan.name}`);

  const allCards = getAllPlanCards(activePlan, cardStatuses);
  const now = moment();

  // Schedule all FUTURE cards
  const futureCards = allCards.filter(card => card.fullDateTime.isAfter(now));

  console.log(`[iOS] Scheduling ${futureCards.length} triggers. (Total cards: ${allCards.length})`);

  for (const card of futureCards) {
    const triggerTimestamp = card.fullDateTime.valueOf();

    // Skip if somehow in past
    if (triggerTimestamp <= Date.now()) continue;

    let finalTriggerTimestamp = triggerTimestamp;
    let timingMsg = `at ${card.fullDateTime.format()}`;

    // Note: The "Welcome to [City]" (energy-check) notification is already delayed by 15 mins during creation.
    // We do NOT delay the "You've Arrived" card notification itself, as per user request.

    console.log(`  -> Scheduling: "${card.title}" ${timingMsg}`);

    // Use strict ID based on Plan + Card ID.
    // This ensures that if we re-run the scheduler, we are talking about the EXACT same notification slot.
    // If we cancel all, this ID is cleared. If we re-schedule, it uses this ID.
    const deterministicId = `${activePlan.id}-${card.id}`.replace(/[^a-zA-Z0-9]/g, '-');

    try {
      await notifee.createTriggerNotification(
        {
          id: deterministicId, // <--- CRITICAL FIX: Deterministic ID
          title: card.title,
          body: card.time || '', // Show only label/time, no explanation
          ios: {
            sound: 'default',
            interruptionLevel: 'active', // 'active' lights up screen
          },
          data: {
            planName: activePlan.name,
            cardId: card.id,
            phase: card.phase,
            tripIndex: card.tripIndex // Include tripIndex for feedback deep linking
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: finalTriggerTimestamp,
        }
      );
    } catch (err) {
      console.warn(`[iOS] Failed to schedule card ${card.title}:`, err);
    }
  }
}

// ----------------------------------------------------------------------
// MAIN ENTRY POINT
// ----------------------------------------------------------------------
export async function startPersistentNotificationUpdater(plans: any[], cardStatuses: Record<string, string> = {}) {
  console.warn('[NOTIF-DEBUG] startPersistentNotificationUpdater called');

  // Clear any existing Android interval (Zombie Check)
  if ((globalThis as any).jetLagInterval) {
    clearInterval((globalThis as any).jetLagInterval);
    (globalThis as any).jetLagInterval = null;
  }

  if (Platform.OS === 'ios') {
    const settings = await getNotificationSettings();
    console.warn(`[NOTIF-DEBUG] Settings enabled: ${settings.enabled}`);

    if (!settings.enabled) {
      console.warn('[iOS] Notifications disabled in settings, skipping permission request');
      await notifee.cancelAllNotifications();
      return;
    }

    // iOS: Check permission first
    const notifSettings = await notifee.getNotificationSettings();
    if (notifSettings.authorizationStatus === AuthorizationStatus.NOT_DETERMINED) {
      await notifee.requestPermission();
    }

    // iOS: Schedule once and done
    await scheduleIOSNotifications(plans, cardStatuses);
  } else {
    // Android: Start polling loop
    console.log('[Android] Starting persistent notification poller');
    await updateAndroidPersistentNotification(plans, cardStatuses); // Immediate update
    (globalThis as any).jetLagInterval = setInterval(async () => {
      await updateAndroidPersistentNotification(plans, cardStatuses);
    }, 30000); // 30s loop
  }
}

export async function stopPersistentNotification() {
  if ((globalThis as any).jetLagInterval) {
    clearInterval((globalThis as any).jetLagInterval);
    (globalThis as any).jetLagInterval = null;
  }
  await notifee.cancelAllNotifications(); // Clears both Android persistent and iOS pending triggers
}

// Compatibility stubs
export async function scheduleNotificationsForPlan(plan: any) { }
export async function cancelNotificationsForPlan(planId: string) { }
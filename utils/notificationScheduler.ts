import notifee, { AndroidImportance, AuthorizationStatus, TriggerType } from '@notifee/react-native';
import moment from 'moment-timezone';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
    const departDate = moment(trip.departDate);
    const arriveDate = moment(trip.arriveDate);

    const processCard = (card: any, time: moment.Moment) => {
      // Check status
      const statusKey = `${activePlan.id}_${card.id}`;
      const status = cardStatuses[statusKey];

      // If skipped or done, do NOT include in the schedule list
      if (status === 'skipped' || status === 'done') return;

      if (!card.isInfo && card.dateTime) {
        allCards.push({
          ...card,
          fullDateTime: time,
          planName: activePlanName,
          destination: trip.to,
        });
      }
    };

    // Prepare phase cards (2 days before departure)
    const prepareStart = departDate.clone().subtract(2, 'days');
    for (let day = 0; day < 2; day++) {
      if (!jetLagPlan.phases.prepare || !jetLagPlan.phases.prepare.cards) continue;
      for (const card of jetLagPlan.phases.prepare.cards) {
        processCard(card, moment(card.dateTime));
      }
    }

    // Travel phase cards
    if (jetLagPlan.phases.travel && jetLagPlan.phases.travel.cards) {
      for (const card of jetLagPlan.phases.travel.cards) {
        processCard(card, moment(card.dateTime));
      }
    }

    // Adjust phase cards
    if (jetLagPlan.phases.adjust && jetLagPlan.phases.adjust.cards) {
      for (const card of jetLagPlan.phases.adjust.cards) {
        if (card.isDailyRoutine) continue;
        processCard(card, moment(card.dateTime));
      }

      // Daily Routine Logic
      const dailyRoutineCards = jetLagPlan.phases.adjust.cards.filter(
        (c: any) => c.isDailyRoutine && c.dateTime
      );

      const durationDays = jetLagPlan.phases.adjust.durationDays || 4;

      // FIX: If arrived early morning (e.g. < 10 AM), start routine TODAY, not tomorrow.
      const arriveHour = arriveDate.hours();
      let startRoutineDate = arriveDate.clone().add(1, 'days'); // Default to tomorrow

      if (arriveHour < 10) {
        startRoutineDate = arriveDate.clone();
      }

      for (let i = 0; i < durationDays; i++) {
        const currentRoutineDay = startRoutineDate.clone().add(i, 'days');
        for (const card of dailyRoutineCards) {
          const cardTime = moment(card.dateTime);
          const routineTime = currentRoutineDay.clone()
            .hours(cardTime.hours())
            .minutes(cardTime.minutes());

          // Only add if this specific routine time is actually in the future relative to arrival
          // e.g. If landed at 9 AM, and routine is 7 AM, skip today's 7 AM card.
          if (routineTime.isAfter(arriveDate)) {
            processCard(card, routineTime);
          }
        }
      }
    }
    // Inject "Welcome / Energy Check" Notification (15 mins after arrival)
    // This is a synthetic card just for notifications—it triggers the app to open,
    // where TripDetails.tsx will automatically show the "Exhausted/Ok" modal.
    const energyCheckTime = arriveDate.clone().add(15, 'minutes');
    if (energyCheckTime.isValid()) {
      allCards.push({
        id: `energy-check-${tripIndex}`,
        title: `Welcome to ${trip.to}!`,
        time: 'Tell us how you feel post-flight so we can tailor the rest of your adjustment plan',
        dateTime: energyCheckTime.toISOString(),
        fullDateTime: energyCheckTime,
        planName: activePlanName,
        destination: trip.to,
        isInfo: false, // Ensure it gets scheduled
      });
    }
  });

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
function getActivePlan(plans: any[]) {
  if (!plans || plans.length === 0) return null;
  const now = moment();

  return plans.find(plan => {
    if (!plan.trips || plan.trips.length === 0) return false;
    const firstTrip = plan.trips[0];
    const lastTrip = plan.trips[plan.trips.length - 1];

    const departDate = moment(firstTrip.departDate);
    // Expand window slightly to ensure we capture early prep cards
    const prepareStart = departDate.clone().subtract(3, 'days');

    const lastSegment = lastTrip.segments && lastTrip.segments.length > 0
      ? lastTrip.segments[lastTrip.segments.length - 1]
      : lastTrip;
    const arriveDate = moment(lastSegment.arriveDate);

    // Match the Adjust Phase duration (Arrival + 2 days limit)
    const adjustEnd = arriveDate.clone().add(2, 'days');

    return now.isBetween(prepareStart, adjustEnd, null, '[]');
  });
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
  console.log('[iOS] Old notifications cancelled');

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

    console.log(`  -> Scheduling: "${card.title}" at ${card.fullDateTime.format()}`);

    // Create a deterministic ID based on title and time to allow overwriting
    // This strictly prevents duplicates even if the scheduler runs multiple times
    const deterministicId = `${card.title}-${triggerTimestamp}`.replace(/[^a-zA-Z0-9]/g, '-');

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
          data: { planName: activePlan.name, cardId: card.id },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: triggerTimestamp,
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
  // Clear any existing Android interval (Zombie Check)
  if ((globalThis as any).jetLagInterval) {
    clearInterval((globalThis as any).jetLagInterval);
    (globalThis as any).jetLagInterval = null;
  }

  if (Platform.OS === 'ios') {
    const settings = await getNotificationSettings();
    if (!settings.enabled) {
      console.log('[iOS] Notifications disabled in settings, skipping permission request');
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
import { getAnalytics, logEvent, setUserProperty } from '@react-native-firebase/analytics';

/**
 * Analytics Service
 * Wraps Firebase Analytics to provide a consistent interface for tracking.
 */
export const Analytics = {
    /**
     * Log a standard screen view.
     * Note: We mostly use automatic tracking in App.tsx, but this is available for modals.
     */
    logScreenView: async (currentScreen: string, previousScreen?: string) => {
        try {
            await logEvent(getAnalytics(), 'screen_view', {
                screen_name: currentScreen,
                screen_class: currentScreen,
                previous_screen: previousScreen,
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * Log a custom event with optional parameters.
     */
    logEvent: async (name: string, params: { [key: string]: any } = {}) => {
        try {
            await logEvent(getAnalytics(), name, params);
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * NORTH STAR METRIC: User created a new plan.
     * @param planCount Total number of plans this user has created (including this one).
     * @param isRepeat Boolean, simplified check from planCount > 1.
     * @param tripDurationDays Length of the trip in days.
     */
    logTripCreated: async (planCount: number, tripDurationDays: number) => {
        try {
            await logEvent(getAnalytics(), 'trip_created', {
                plan_count: planCount,
                is_repeat: planCount > 1,
                duration_days: tripDurationDays,
            });

            // Update user property for segmentation
            await setUserProperty(getAnalytics(), 'plan_count', planCount.toString());

            if (planCount === 1) {
                // First time user!
                await setUserProperty(getAnalytics(), 'first_plan_date', new Date().toISOString());
            }
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * CONVERSION: User viewed the paywall.
     * @param source Checkpoint where they hit the limit (e.g. 'limit_reached', 'settings', 'trip_details')
     */
    logPaywallView: async (source: string) => {
        try {
            await logEvent(getAnalytics(), 'paywall_view', {
                source: source,
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * CONVERSION: User completed a purchase.
     */
    logPurchase: async (amount: number, currency: string = 'USD') => {
        try {
            await logEvent(getAnalytics(), 'purchase', {
                value: amount,
                currency: currency,
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * USAGE: User completed a task (ticked a box).
     * @param taskType e.g. 'morning_light', 'caffeine_limit'
     * @param dayOfTrip 1, 2, 3...
     */
    logTaskCompleted: async (taskType: string, dayOfTrip: number) => {
        try {
            await logEvent(getAnalytics(), 'task_completed', {
                task_type: taskType,
                trip_day: dayOfTrip
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * NOTIFICATIONS: User opened the app via notification.
     */
    logNotificationOpened: async (type: string) => {
        try {
            await logEvent(getAnalytics(), 'notification_opened', {
                notification_type: type
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * ONBOARDING: User created their first plan ever.
     * @param timeTakenSeconds Time from install (or first open) to this moment.
     */
    logOnboardingComplete: async (timeTakenSeconds: number) => {
        try {
            await logEvent(getAnalytics(), 'onboarding_complete', {
                time_seconds: timeTakenSeconds
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    }
};

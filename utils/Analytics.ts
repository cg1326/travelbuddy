import { getAnalytics, logEvent, setUserProperty } from '@react-native-firebase/analytics';
import DeviceInfo from 'react-native-device-info';

/**
 * Analytics Service
 * Wraps Firebase Analytics to provide a consistent interface for tracking.
 */
export const Analytics = {
    /**
     * IDENTIFY SESSION: Determine if this is TestFlight, Simulator, or Production.
     * Call this once on app startup.
     */
    identifySession: async () => {
        try {
            const isEmulator = await DeviceInfo.isEmulator();

            // For iOS: Check multiple signals for TestFlight
            let isTestFlight = false;

            if (!isEmulator) {
                try {
                    // Method 1: Check bundle ID for beta suffix (if you use one)
                    const bundleId = DeviceInfo.getBundleId();
                    const hasBetaSuffix = bundleId.includes('.beta') || bundleId.includes('.testflight');

                    // Method 2: Try the isTestFlight() method (may not be available in all versions)
                    let isTestFlightMethod = false;
                    try {
                        // @ts-ignore - This method exists but may not be in types
                        isTestFlightMethod = await DeviceInfo.isTestFlight();
                    } catch (err) {
                        // Method not available, continue
                    }

                    // Method 3: Check installer package name (iOS specific)
                    // TestFlight apps return "TestFlight", AppStore apps return "AppStore"
                    const installerPackage = await DeviceInfo.getInstallerPackageName();
                    const isTestFlightInstaller = installerPackage === 'TestFlight';


                    // TestFlight if ANY method indicates it
                    isTestFlight = hasBetaSuffix || isTestFlightMethod || isTestFlightInstaller;

                    console.log('[Analytics] TestFlight Detection:', {
                        bundleId,
                        hasBetaSuffix,
                        isTestFlightMethod,
                        installerPackage,
                        isTestFlightInstaller,
                        finalDecision: isTestFlight
                    });
                } catch (err) {
                    console.warn('[Analytics] TestFlight detection failed:', err);
                    isTestFlight = false;
                }
            }

            let source = 'development'; // Safer default for unreleased app

            if (isEmulator) {
                source = 'simulator';
            } else if (__DEV__) {
                source = 'development';
            } else if (isTestFlight) {
                source = 'testflight';
            } else {
                // Real device, not categorized yet.
                const installerPackage = (await DeviceInfo.getInstallerPackageName()) || '';
                const installerLower = installerPackage.toLowerCase();

                if (installerLower.includes('testflight')) {
                    source = 'testflight';
                } else if (installerLower.includes('itunes') || installerLower.includes('appstore')) {
                    source = 'app_store';
                } else {
                    // Side-loaded, Xcode, or other non-store source
                    source = 'development';
                }
            }

            console.log(`[Analytics] Identifying Session Source: ${source} (Installer: ${await DeviceInfo.getInstallerPackageName()})`);

            // Always set the property (will override previous value if it changed)
            await setUserProperty(getAnalytics(), 'install_source', source);

            // Log identical custom event for easier filtering in Realtime/Events
            await logEvent(getAnalytics(), 'install_source_detected', {
                source: source,
                is_testflight: isTestFlight,
                is_emulator: isEmulator,
                installer: await DeviceInfo.getInstallerPackageName()
            });

        } catch (e) {
            console.warn('[Analytics] Error Identifying Session:', e);
        }
    },
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
    },

    // ========== FLIGHT IMPORT TRACKING ==========

    /**
     * FLIGHT IMPORT: User attempted to import a flight via API.
     * @param method 'api' for flight lookup, 'manual' for manual entry
     */
    logFlightImportAttempt: async (method: 'api' | 'manual') => {
        try {
            await logEvent(getAnalytics(), 'flight_import_attempt', {
                import_method: method
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * FLIGHT IMPORT: Flight import succeeded.
     * @param hasMultipleOptions True if user had to choose from multiple flight options
     */
    logFlightImportSuccess: async (hasMultipleOptions: boolean) => {
        try {
            await logEvent(getAnalytics(), 'flight_import_success', {
                had_multiple_options: hasMultipleOptions
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * FLIGHT IMPORT: Flight import failed.
     * @param errorType Type of error (e.g. 'not_found', 'api_error', 'no_time_data')
     */
    logFlightImportError: async (errorType: string) => {
        try {
            await logEvent(getAnalytics(), 'flight_import_error', {
                error_type: errorType
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    // ========== PLAN MANAGEMENT TRACKING ==========

    /**
     * PLAN MANAGEMENT: User deleted a plan.
     * @param remainingPlanCount Number of plans remaining after deletion
     * @param tripCount Number of trips in the deleted plan
     */
    logPlanDeleted: async (remainingPlanCount: number, tripCount: number) => {
        try {
            await logEvent(getAnalytics(), 'plan_deleted', {
                remaining_plans: remainingPlanCount,
                trip_count: tripCount
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * PLAN MANAGEMENT: User edited a plan.
     * @param changeType Type of change (e.g. 'add_trip', 'edit_trip', 'delete_trip', 'rename')
     */
    logPlanEdited: async (changeType: string) => {
        try {
            await logEvent(getAnalytics(), 'plan_edited', {
                change_type: changeType
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * PLAN MANAGEMENT: User activated a plan (set as active).
     * @param tripCount Number of trips in the activated plan
     */
    logPlanActivated: async (tripCount: number) => {
        try {
            await logEvent(getAnalytics(), 'plan_activated', {
                trip_count: tripCount
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    // ========== PHASE NAVIGATION TRACKING ==========

    /**
     * NAVIGATION: User viewed a specific phase tab.
     * @param phase Phase name (e.g. 'prepare', 'travel', 'adjust', 'today')
     * @param tripDay Day number within the trip (if applicable)
     */
    logPhaseViewed: async (phase: string, tripDay?: number) => {
        try {
            await logEvent(getAnalytics(), 'phase_viewed', {
                phase: phase,
                trip_day: tripDay || null
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * NAVIGATION: User switched between phase tabs.
     * @param fromPhase Previous phase
     * @param toPhase New phase
     */
    logTabSwitch: async (fromPhase: string, toPhase: string) => {
        try {
            await logEvent(getAnalytics(), 'tab_switch', {
                from_phase: fromPhase,
                to_phase: toPhase
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    // ========== ERROR TRACKING ==========

    /**
     * ERROR: User encountered a validation error.
     * @param field Field that failed validation (e.g. 'departure_city', 'arrival_time')
     * @param errorType Type of error (e.g. 'city_not_found', 'invalid_time', 'same_city')
     */
    logValidationError: async (field: string, errorType: string) => {
        try {
            await logEvent(getAnalytics(), 'validation_error', {
                field: field,
                error_type: errorType
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * ERROR: API call failed.
     * @param apiName Name of the API (e.g. 'flight_lookup', 'timezone_lookup')
     * @param errorCode Error code or type (e.g. '404', '403', '500', 'network_error')
     */
    logApiError: async (apiName: string, errorCode: string) => {
        try {
            await logEvent(getAnalytics(), 'api_error', {
                api_name: apiName,
                error_code: errorCode
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    // ========== FEATURE DISCOVERY TRACKING ==========

    /**
     * FEATURE: User used a specific feature.
     * @param featureName Name of the feature (e.g. 'quick_delay', 'flight_import', 'multi_segment')
     */
    logFeatureUsed: async (featureName: string) => {
        try {
            await logEvent(getAnalytics(), 'feature_used', {
                feature_name: featureName
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    /**
     * INTRO: User progressed through intro cards.
     * @param cardIndex Index of the card viewed (0-based)
     * @param totalCards Total number of intro cards
     */
    logIntroCardViewed: async (cardIndex: number, totalCards: number) => {
        try {
            await logEvent(getAnalytics(), 'intro_card_viewed', {
                card_index: cardIndex,
                total_cards: totalCards,
                progress_percent: Math.round((cardIndex / totalCards) * 100)
            });
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    },

    // ========== USER PROPERTIES ==========

    /**
     * Update multiple user properties at once.
     * @param properties Object containing user properties to update
     */
    updateUserProperties: async (properties: { [key: string]: string }) => {
        try {
            const analytics = getAnalytics();
            for (const [key, value] of Object.entries(properties)) {
                await setUserProperty(analytics, key, value);
            }
        } catch (e) {
            console.warn('Analytics Error:', e);
        }
    }
};

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateJetLagPlan, getDefaultUserSettings } from '../utils/jetLagAlgorithm';
import type {
  Trip,
  FlightSegment,
  Connection,
  Card,
  Phase,
  JetLagPlan,
  UserSettings,
  Plan,
  HITLSuggestion,
  OutcomeRating,
  PlanEditEvent,
} from '../types/models';
import moment from 'moment-timezone';
import { startPersistentNotificationUpdater, stopPersistentNotification } from '../utils/notificationScheduler';
import {
  getOutcomeRatings,
  getHITLQueue,
  dismissHITLSuggestion as dismissSuggestionAPI,
  submitOutcomeRating as submitRatingAPI,
  recordEditEvent as recordEditEventAPI,
  pruneHITLQueue,
} from '../utils/preferenceEngine';

interface PlanContextType {
  plans: Plan[];
  userSettings: UserSettings;
  addPlan: (name: string, trips: Trip[]) => Plan | undefined;
  updatePlan: (id: string, name: string, trips: Trip[]) => Plan | undefined;
  deletePlan: (id: string) => void;
  setActivePlan: (id: string) => void;
  getActivePlan: () => Plan | undefined;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  isLoading: boolean;
  cardStatuses: Record<string, string>;
  updateCardStatus: (planId: string, cardId: string, status: 'active' | 'done' | 'skipped') => void;
  batchUpdateCardStatuses: (updates: Array<{ planId: string, cardId: string, status: 'active' | 'done' | 'skipped' }>) => void;
  hitlQueue: HITLSuggestion[];
  dismissHITLSuggestion: (id: string) => Promise<void>;
  submitOutcomeRating: (rating: OutcomeRating) => Promise<void>;
  outcomeRatings: OutcomeRating[];
  refreshHITLQueue: () => Promise<void>;
  recordEditEvent: (event: PlanEditEvent) => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PLANS: '@travelbuddy_plans',
  USER_SETTINGS: '@travelbuddy_settings',
};

// Algorithm version for smart plan regeneration
// Increment this when the jet lag algorithm logic changes
const ALGORITHM_VERSION = '1.1.1'; // Refined Sunlight Advice Logic (Lock in Rhythm only on last day)



export function PlanProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(getDefaultUserSettings());
  const [cardStatuses, setCardStatuses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hitlQueue, setHitlQueue] = useState<HITLSuggestion[]>([]);
  const [outcomeRatings, setOutcomeRatings] = useState<OutcomeRating[]>([]);

  const refreshHITLQueue = async () => {
    const queue = await getHITLQueue();
    setHitlQueue(queue);
  };

  const dismissHITLSuggestion = async (id: string) => {
    await dismissSuggestionAPI(id);
    await refreshHITLQueue();
  };

  const submitOutcomeRating = async (rating: OutcomeRating) => {
    await submitRatingAPI(rating, plans, userSettings);
    const updatedRatings = await getOutcomeRatings();
    setOutcomeRatings(updatedRatings);
    await refreshHITLQueue();
  };

  const recordEditEvent = async (event: PlanEditEvent) => {
    await recordEditEventAPI(event, userSettings);
    await refreshHITLQueue();
  };

  // Load data on mount
  useEffect(() => {
    loadData();
    refreshHITLQueue();
  }, []);

  // Save plans whenever they change
  useEffect(() => {
    if (!isLoading) {
      savePlans(plans);
    }
  }, [plans, isLoading]);

  // Save settings whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveUserSettings(userSettings);
    }
  }, [userSettings, isLoading]);

  const loadData = async () => {
    try {
      const [plansData, settingsData, statusesData, ratingsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PLANS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS),
        AsyncStorage.getItem('@travelbuddy_card_statuses'),
        AsyncStorage.getItem('@travelbuddy_outcome_ratings'),
      ]);

      if (ratingsData) {
        setOutcomeRatings(JSON.parse(ratingsData));
      }

      let currentSettings = getDefaultUserSettings();

      if (settingsData) {
        const parsedSettings = JSON.parse(settingsData);
        const mergedSettings = { ...getDefaultUserSettings(), ...parsedSettings };
        currentSettings = mergedSettings;
        setUserSettings(mergedSettings);
      }

      let activePlans: Plan[] = [];

      if (plansData) {
        const parsedPlans = JSON.parse(plansData);
        activePlans = parsedPlans;

        // 1. Show cached data IMMEDIATELY to unblock UI
        setPlans(parsedPlans);

        // 2. Smart regeneration: Only regenerate if algorithm version changed
        setTimeout(() => {
          console.log('🔄 Checking if plans need regeneration...');
          try {
            // Check if any plans need regeneration
            const plansNeedingUpdate = parsedPlans.filter((plan: Plan) =>
              !plan.algorithmVersion || plan.algorithmVersion !== ALGORITHM_VERSION
            );

            if (plansNeedingUpdate.length > 0) {
              console.log(`📝 Regenerating ${plansNeedingUpdate.length} outdated plan(s)...`);

              const regeneratedPlans = parsedPlans.map((plan: Plan) => {
                // Only regenerate if version is outdated
                if (!plan.algorithmVersion || plan.algorithmVersion !== ALGORITHM_VERSION) {
                  return {
                    ...plan,
                    jetLagPlans: plan.trips.map(trip =>
                      generateJetLagPlan(trip, plan.trips, currentSettings)
                    ),
                    algorithmVersion: ALGORITHM_VERSION,
                  };
                }
                // Plan is up to date, return as-is
                return plan;
              });

              setPlans(regeneratedPlans);
              activePlans = regeneratedPlans;
              console.log('✅ Regeneration complete');

              // Update notifications with fresh data
              const initialStatuses = statusesData ? JSON.parse(statusesData) : {};
              startPersistentNotificationUpdater(regeneratedPlans, initialStatuses).catch(console.error);
            } else {
              console.log('✅ All plans up to date, skipping regeneration');
              // Still update notifications with existing data
              const initialStatuses = statusesData ? JSON.parse(statusesData) : {};
              startPersistentNotificationUpdater(parsedPlans, initialStatuses).catch(console.error);
            }
          } catch (regenError) {
            console.error('❌ Background regeneration failed:', regenError);
          }
        }, 100);
      }

      let initialStatuses = {};
      if (statusesData) {
        initialStatuses = JSON.parse(statusesData);
        setCardStatuses(initialStatuses);
      }

      // Start notifications regardless of regeneration success
      startPersistentNotificationUpdater(activePlans, initialStatuses).catch(err =>
        console.error('Failed to start notifications:', err)
      );

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePlans = async (plansToSave: Plan[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plansToSave));
    } catch (error) {
      console.error('Error saving plans:', error);
    }
  };

  const saveUserSettings = async (settings: UserSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveCardStatuses = async (statuses: Record<string, string>) => {
    try {
      await AsyncStorage.setItem('@travelbuddy_card_statuses', JSON.stringify(statuses));
    } catch (error) {
      console.error('Error saving card statuses:', error);
    }
  };

  const updateCardStatus = (planId: string, cardId: string, status: 'active' | 'done' | 'skipped') => {
    batchUpdateCardStatuses([{ planId, cardId, status }]);
  };

  const batchUpdateCardStatuses = (updates: Array<{ planId: string, cardId: string, status: 'active' | 'done' | 'skipped' }>) => {
    setCardStatuses(prevStatuses => {
      const newStatuses = { ...prevStatuses };

      updates.forEach(({ planId, cardId, status }) => {
        const key = `${planId}_${cardId}`;
        if (status === 'active') {
          delete newStatuses[key];
        } else {
          newStatuses[key] = status;
        }
      });

      // Save side effect - simplified to just save the new state
      saveCardStatuses(newStatuses);

      // TRIGGER NOTIFICATION UPDATE with new statuses
      startPersistentNotificationUpdater(plans, newStatuses).catch(err =>
        console.error('Failed to update notifications after status change:', err)
      );

      return newStatuses;
    });
  };

  const updateUserSettings = async (settings: Partial<UserSettings>) => {
    // Merge new partial settings with our existing settings
    const newSettings = { ...userSettings, ...settings };
    setUserSettings(newSettings);

    // [Personalization Cleanup] Prune any HITL suggestions that are now redundant
    await pruneHITLQueue(newSettings);
    await refreshHITLQueue();

    // Only regenerate current and future plans — preserve past trip history
    const today = moment().format('YYYY-MM-DD');
    const updatedPlans = plans.map(plan => {
      // If every trip in this plan has already arrived, it's a past plan — don't touch it
      const isPastPlan = plan.trips.every(trip => trip.arriveDate < today);
      if (isPastPlan) return plan;

      return {
        ...plan,
        jetLagPlans: plan.trips.map(trip =>
          generateJetLagPlan(trip, plan.trips, newSettings)
        )
      };
    });
    setPlans(updatedPlans);

    // Update notifications with regenerated plans
    startPersistentNotificationUpdater(updatedPlans, cardStatuses).catch(error =>
      console.error('Failed to update notifications after settings change:', error)
    );
  };

  const addPlan = (name: string, trips: Trip[]): Plan | undefined => {
    try {
      console.log('🟢 addPlan() called');
      console.log('➡️ Plan name:', name);
      console.log('✈️ Trips passed in:', JSON.stringify(trips, null, 2));

      const jetLagPlans = trips.map((trip) => {
        console.log('🧮 Generating jet lag plan for trip:', trip.from, '→', trip.to);
        return generateJetLagPlan(trip, trips, userSettings);
      });

      console.log('✅ Jet lag plans generated successfully.');

      const newPlan: Plan = {
        id: Date.now().toString(),
        name,
        trips,
        createdAt: new Date().toISOString(),
        jetLagPlans,
        algorithmVersion: ALGORITHM_VERSION, // Tag with current version
      };

      console.log('📦 New plan object built:', JSON.stringify(newPlan, null, 2));

      const updatedPlans = [...plans, newPlan];
      setPlans(updatedPlans);
      console.log('💾 Plan saved in state. Updating persistent notification...');

      // Update persistent notification with new plans
      startPersistentNotificationUpdater(updatedPlans, cardStatuses)
        .then(() => console.log('✅ Notification updated successfully'))
        .catch((error) => console.error('❌ Failed to update notification:', error));

      return newPlan;
    } catch (err) {
      console.error('🔥 Error inside addPlan():', err);
      return undefined;
    }
  };

  const updatePlan = (id: string, name: string, trips: Trip[]): Plan | undefined => {
    try {
      console.log('🟡 updatePlan() called');
      const existingPlan = plans.find(p => p.id === id);

      // 1. Reconcile trips to preserve status BEFORE generating advice
      // This ensures generateJetLagPlan sees the correct arrivalRestStatus (e.g. 'exhausted')
      const reconciledTrips = trips.map((newTrip) => {
        const existingTrip = existingPlan?.trips.find(t => t.id === newTrip.id);

        // Robust location comparison (trimmed and case-insensitive)
        const isSameRoute = existingTrip &&
          existingTrip.from.trim().toLowerCase() === newTrip.from.trim().toLowerCase() &&
          existingTrip.to.trim().toLowerCase() === newTrip.to.trim().toLowerCase();

        if (isSameRoute) {
          return {
            ...newTrip,
            arrivalRestStatus: newTrip.arrivalRestStatus ?? existingTrip.arrivalRestStatus,
            arrivalRestRecordedAt: newTrip.arrivalRestRecordedAt ?? existingTrip.arrivalRestRecordedAt
          };
        }
        return newTrip;
      });

      // 2. Generate advice using RECONCILED trips
      const jetLagPlans = reconciledTrips.map((trip) => {
        return generateJetLagPlan(trip, reconciledTrips, userSettings);
      });

      let updatedPlanObj: Plan | undefined;

      const updatedPlans = plans.map(plan => {
        if (plan.id === id) {
          updatedPlanObj = {
            ...plan,
            name,
            trips: reconciledTrips,
            jetLagPlans,
            algorithmVersion: ALGORITHM_VERSION, // Tag with current version
          };
          return updatedPlanObj;
        }
        return plan;
      });

      console.log('💾 Plan updated in state. Updating persistent notification...');

      setPlans(updatedPlans);

      // Update persistent notification with updated plans
      startPersistentNotificationUpdater(updatedPlans, cardStatuses)
        .then(() => console.log('✅ Notification updated successfully'))
        .catch((error) => console.error('❌ Failed to update notification:', error));

      return updatedPlanObj;
    } catch (err) {
      console.error('🔥 Error inside updatePlan():', err);
      return undefined;
    }
  };

  const deletePlan = (id: string) => {
    const updatedPlans = plans.filter(plan => plan.id !== id);
    setPlans(updatedPlans);

    // Update or stop persistent notification
    if (updatedPlans.length === 0) {
      stopPersistentNotification().catch(error =>
        console.error('Failed to stop notification:', error)
      );
    } else {
      startPersistentNotificationUpdater(updatedPlans, cardStatuses).catch(error =>
        console.error('Failed to update notification:', error)
      );
    }
  };

  const setActivePlan = (id: string) => {
    setPlans(plans.map(plan => ({
      ...plan,
      isActive: plan.id === id,
    })));
  };

  const getActivePlan = () => {
    const today = moment().format('YYYY-MM-DD');

    // Find plans that are active today (today falls within their date range)
    const activePlans = plans.filter(plan => {
      if (plan.jetLagPlans.length === 0) return false;

      // Check if today falls within any trip's prepare-adjust window
      return plan.jetLagPlans.some(jetLagPlan => {
        const departDate = moment(jetLagPlan.departDate);
        const prepareStart = departDate.clone().subtract(2, 'days');

        // Find corresponding trip to get arrival date
        const trip = plan.trips.find(t => t.id === jetLagPlan.tripId);
        let arriveDate = departDate.clone();

        if (trip) {
          if (trip.segments && trip.segments.length > 0) {
            arriveDate = moment(trip.segments[trip.segments.length - 1].arriveDate);
          } else if (trip.arriveDate) {
            arriveDate = moment(trip.arriveDate);
          }
        }

        const durationDays = jetLagPlan.phases.adjust.durationDays || 4;
        // The adjust phase runs for 'durationDays' starting from arrival.
        // So adjustEnd is arrival + durationDays.
        // (Note: adjustEndDateCalculated in algorithm was start + duration. logic matches here).
        const adjustEnd = arriveDate.clone().add(durationDays, 'days');

        return moment(today).isBetween(prepareStart, adjustEnd, 'day', '[]');
      });
    });

    // If plans are active today, return the one with nearest departure
    if (activePlans.length > 0) {
      return activePlans.sort((a, b) => {
        const aDate = moment(a.jetLagPlans[0].departDate);
        const bDate = moment(b.jetLagPlans[0].departDate);
        return Math.abs(aDate.diff(today, 'days')) - Math.abs(bDate.diff(today, 'days'));
      })[0];
    }

    // No active plans today - find next upcoming plan
    const upcomingPlans = plans.filter(plan => {
      if (plan.jetLagPlans.length === 0) return false;
      const departDate = moment(plan.jetLagPlans[0].departDate);
      return departDate.isAfter(today);
    });

    if (upcomingPlans.length > 0) {
      return upcomingPlans.sort((a, b) => {
        const aDate = moment(a.jetLagPlans[0].departDate);
        const bDate = moment(b.jetLagPlans[0].departDate);
        return aDate.diff(bDate);
      })[0];
    }

    // All plans are in the past - return undefined
    return undefined;
  };

  return (
    <PlanContext.Provider value={{
      plans,
      userSettings,
      addPlan,
      updatePlan,
      deletePlan,
      setActivePlan,
      getActivePlan,
      updateUserSettings,
      isLoading,
      cardStatuses,
      updateCardStatus,
      batchUpdateCardStatuses,
      hitlQueue,
      dismissHITLSuggestion,
      submitOutcomeRating,
      outcomeRatings,
      refreshHITLQueue,
      recordEditEvent
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlans() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlans must be used within PlanProvider');
  }
  return context;
}
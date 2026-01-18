import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateJetLagPlan, getDefaultUserSettings } from '../utils/jetLagAlgorithm';
import moment from 'moment';
import { startPersistentNotificationUpdater, stopPersistentNotification } from '../utils/notificationScheduler';

interface Connection {
  city: string;
  duration: string;
}

interface FlightSegment {
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
}

interface Trip {
  id: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  hasConnections: boolean;
  segments: FlightSegment[];
  connections: Connection[];
}

interface Card {
  id: string;
  title: string;
  time: string;
  icon: string;
  color: string;
  why: string;
  how: string;
  dateTime?: string;
  isInfo?: boolean;
}

interface Phase {
  name: string;
  dateRange: string;
  cards: Card[];
  durationDays?: number;
}

interface JetLagPlan {
  tripId: string;
  from: string;
  to: string;
  departDate: string;
  phases: {
    prepare: Phase;
    travel: Phase;
    adjust: Phase;
  };
}

interface UserSettings {
  normalBedtime: string;
  normalWakeTime: string;
  useMelatonin: boolean;
  useMagnesium: boolean;
}

interface Plan {
  id: string;
  name: string;
  trips: Trip[];
  createdAt: string;
  jetLagPlans: JetLagPlan[];
}

interface PlanContextType {
  plans: Plan[];
  userSettings: UserSettings;
  addPlan: (name: string, trips: Trip[]) => Plan | undefined;
  updatePlan: (id: string, name: string, trips: Trip[]) => Plan | undefined;
  deletePlan: (id: string) => void;
  setActivePlan: (id: string) => void;
  getActivePlan: () => Plan | undefined;
  updateUserSettings: (settings: UserSettings) => void;
  isLoading: boolean;
  cardStatuses: Record<string, string>;
  updateCardStatus: (planId: string, cardId: string, status: 'active' | 'done' | 'skipped') => void;
  batchUpdateCardStatuses: (updates: Array<{ planId: string, cardId: string, status: 'active' | 'done' | 'skipped' }>) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PLANS: '@travelbuddy_plans',
  USER_SETTINGS: '@travelbuddy_settings',
};

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(getDefaultUserSettings());
  const [cardStatuses, setCardStatuses] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
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
      const [plansData, settingsData, statusesData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PLANS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS),
        AsyncStorage.getItem('@travelbuddy_card_statuses'),
      ]);

      let currentSettings = getDefaultUserSettings();

      if (settingsData) {
        const parsedSettings = JSON.parse(settingsData);
        currentSettings = parsedSettings;
        setUserSettings(parsedSettings);
      }

      let activePlans: Plan[] = [];

      if (plansData) {
        const parsedPlans = JSON.parse(plansData);
        activePlans = parsedPlans;

        // 1. Show cached data IMMEDIATELY to unblock UI
        setPlans(parsedPlans);

        // 2. Run heavy algorithm in background
        setTimeout(() => {
          console.log('🔄 Regenerating plans in background...');
          try {
            const regeneratedPlans = parsedPlans.map((plan: Plan) => ({
              ...plan,
              jetLagPlans: plan.trips.map(trip =>
                generateJetLagPlan(trip, plan.trips, currentSettings)
              )
            }));

            // Only update if different (optional optimization, but for now just update)
            setPlans(regeneratedPlans);
            activePlans = regeneratedPlans; // Update local ref for notifications
            console.log('✅ Background regeneration complete');

            // Update notifications with fresh data
            // Use local parsedStatuses if available, otherwise empty for now (state update might not be ready in closure)
            const initialStatuses = statusesData ? JSON.parse(statusesData) : {};
            startPersistentNotificationUpdater(regeneratedPlans, initialStatuses).catch(console.error);
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

  const updateUserSettings = (settings: UserSettings) => {
    setUserSettings(settings);
    // Regenerate jet lag plans for all existing plans with new settings
    const updatedPlans = plans.map(plan => ({
      ...plan,
      jetLagPlans: plan.trips.map(trip =>
        generateJetLagPlan(trip, plan.trips, settings)
      )
    }));
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
      console.log('➡️ Plan ID:', id);
      console.log('➡️ Plan name:', name);
      console.log('✈️ Trips passed in:', JSON.stringify(trips, null, 2));

      const jetLagPlans = trips.map((trip) => {
        console.log('🧮 Generating jet lag plan for trip:', trip.from, '→', trip.to);
        return generateJetLagPlan(trip, trips, userSettings);
      });

      console.log('✅ Jet lag plans generated successfully.');

      let updatedPlanObj: Plan | undefined;

      const updatedPlans = plans.map(plan => {
        if (plan.id === id) {
          updatedPlanObj = {
            ...plan,
            name,
            trips,
            jetLagPlans,
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
      batchUpdateCardStatuses
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
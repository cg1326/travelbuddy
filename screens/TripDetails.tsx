import React, { useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  Alert,
  Modal,
  LayoutAnimation,
} from 'react-native';
import { usePlans } from '../context/PlanContext';
import { useTheme } from '../context/ThemeContext';

import QuickDelayModal from '../components/QuickDelayModal';
import ConflictModal from '../components/ConflictModal';
import OnboardingModal from '../components/OnboardingModal'; // Import OnboardingModal
import PostTripFeedback from './PostTripFeedback';
import { getCityTimezone } from '../utils/jetLagAlgorithm';
import type { Card, Phase, JetLagPlan, Trip } from '../types/models';
import moment from 'moment-timezone';
import * as StoreReview from 'react-native-store-review';
import { Analytics } from '../utils/Analytics'; // Import Analytics


// Helper to determine if we should prompt for exhaustion
const isWithinArrivalWindow = (trip: Trip): boolean => {
  if (!trip) return false;
  // Use destination timezone for accurate "Now/Landed" comparison
  const destTz = trip.toTz || getCityTimezone(trip.to);
  // Valid if within 18 hours after landing, starting 15 minutes after arrival
  // Compare "Now" in destination vs "Arrival Time" in destination
  const landingTime = moment.tz(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm', destTz);
  const nowInDestination = moment.tz(destTz);

  const diffHours = nowInDestination.diff(landingTime, 'hours', true); // Use float for precision
  return diffHours >= 0.25 && diffHours < 18; // 0.25 hours = 15 minutes
};

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────
// HELPER: Get "Logical Date" for a card
// If card is between 12 AM and 5 AM, assign it to the PREVIOUS date string
// This ensures 12:00 AM sleep cards appear at the end of "Today" rather than start of "Tomorrow"
const getCardLogicalDate = (card: Card, tz: string) => {
  if (!card.dateTime) return '';
  const mom = moment.tz(card.dateTime, tz);

  // EXCEPTION: "You've Arrived" card should always appear on the actual arrival date,
  // even if it's 4 AM (which normally shifts to previous day).
  if (card.id === 'adjust-arrival') {
    return mom.format('YYYY-MM-DD');
  }

  if (mom.hour() < 5) {
    return mom.clone().subtract(1, 'day').format('YYYY-MM-DD');
  }
  return mom.format('YYYY-MM-DD');
};

export default function TripDetail({ route, navigation }: any) {
  const { plan: initialPlan, initialTripIndex, initialPhase, initialAction } = route.params;
  const { plans, updatePlan, cardStatuses, updateCardStatus, batchUpdateCardStatuses, userSettings, updateUserSettings } = usePlans();
  const { colors, isDark } = useTheme();


  // DEBUG LOG
  console.log('[TripDetail] Params:', { initialTripIndex, initialPhase, initialAction });

  // Get live plan from context to ensure updates (like exhaustion status) reflect immediately
  const plan = plans.find(p => p.id === initialPlan.id) || initialPlan;

  const [currentTripIndex, setCurrentTripIndex] = useState(initialTripIndex || 0);
  const [activePhase, setActivePhase] = useState<'prepare' | 'travel' | 'adjust'>(initialPhase || 'travel');

  // React to param changes (e.g. Navigation from Notification while screen is already mounted)
  React.useEffect(() => {
    if (initialPhase) {
      setActivePhase(initialPhase);
    }
    if (initialTripIndex !== undefined) {
      setCurrentTripIndex(initialTripIndex);
    }
  }, [initialPhase, initialTripIndex]);

  // FIX: Redirect if activePhase is hidden (e.g. "Prepare" for Stay Home trips) 
  // This handles cases where a notification might try to open a specific phase that is now hidden,
  // or if the default 'travel' matches but we want to be sure.
  React.useEffect(() => {
    const currentTrip = plan.trips[currentTripIndex];
    if (!currentTrip) return;

    // Check if current phase is valid
    let shouldRedirect = false;
    let targetPhase = activePhase;

    if (activePhase === 'prepare') {
      if (currentTrip.strategy === 'stay_home' || currentTrip.suppressPreparePhase) {
        shouldRedirect = true;
        targetPhase = 'travel';
      }
    } else if (activePhase === 'adjust') {
      if (currentTrip.strategy === 'stay_home' || currentTrip.suppressAdjustPhase) {
        shouldRedirect = true;
        targetPhase = 'travel';
      }
    }

    if (shouldRedirect) {
      console.log(`[TripDetail] Redirecting hidden phase ${activePhase} to ${targetPhase}`);
      setActivePhase(targetPhase);
    }
  }, [activePhase, currentTripIndex, plan.trips]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showExhaustionModal, setShowExhaustionModal] = useState(false);
  const [showEditTooltip, setShowEditTooltip] = useState(false);
  const [showDelayTooltip, setShowDelayTooltip] = useState(false);
  const [actionsBottom, setActionsBottom] = useState(0);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string>('This delay causes your arrival to overlap with your next flight\'s departure.');
  const [pendingUpdateTrips, setPendingUpdateTrips] = useState<any[] | null>(null);

  // Post Trip Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Onboarding Modal State
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Handle Initial Action from Notifications
  React.useEffect(() => {
    if (initialAction && typeof initialAction === 'string' && initialAction.includes('post-trip-feedback')) {
      // Delay slightly to let the screen mount
      setTimeout(() => setShowFeedbackModal(true), 500);
    }
  }, [initialAction]);

  // Check for First-Time Setup
  React.useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const setupShownKey = '@travelbuddy_setup_prompt_shown';
        const hasShown = await AsyncStorage.getItem(setupShownKey);

        if (!hasShown) {
          // Add a small delay so it doesn't pop up instantly over transitions
          setTimeout(() => {
            setShowOnboardingModal(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };

    checkOnboarding();
  }, []);

  const handleSaveOnboarding = async (bedtime: string, wakeTime: string) => {
    // 1. Close Modal FIRST to prevent UI freeze/crash sensation
    setShowOnboardingModal(false);

    // 2. Mark as shown immediately
    try {
      await AsyncStorage.setItem('@travelbuddy_setup_prompt_shown', 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }

    // 3. Update Context (heavy operation) with a slight delay to allow modal close animation
    setTimeout(() => {
      updateUserSettings({
        ...userSettings,
        normalBedtime: bedtime,
        normalWakeTime: wakeTime
      });
    }, 500);
  };



  const handleApplyDelay = (minutes: number, segmentIndex?: number, updateDeparture: boolean = true) => {
    const updatedTrips = [...plan.trips];
    const tripToUpdate = plan.trips[currentTripIndex];
    if (!tripToUpdate) return;

    // SEGMENT-LEVEL DELAY (multi-leg trips)
    if (segmentIndex !== undefined && tripToUpdate.segments && tripToUpdate.segments.length > 0) {
      const updatedSegments = [...tripToUpdate.segments];
      const segment = updatedSegments[segmentIndex];

      // Update selected segment times
      let segDepart = moment(`${segment.departDate} ${segment.departTime}`, 'YYYY-MM-DD HH:mm');
      if (updateDeparture) {
        segDepart.add(minutes, 'minutes');
      }

      const segArrive = moment(`${segment.arriveDate} ${segment.arriveTime}`, 'YYYY-MM-DD HH:mm').add(minutes, 'minutes');

      updatedSegments[segmentIndex] = {
        ...segment,
        departDate: segDepart.format('YYYY-MM-DD'),
        departTime: segDepart.format('HH:mm'),
        arriveDate: segArrive.format('YYYY-MM-DD'),
        arriveTime: segArrive.format('HH:mm'),
      };

      // Create the updated trip object
      const updatedTrip = {
        ...tripToUpdate,
        segments: updatedSegments,
      };

      // Update the trips array with the modified trip
      updatedTrips[currentTripIndex] = updatedTrip;

      // Check for missed connection with next segment
      if (segmentIndex < updatedSegments.length - 1) {
        const nextSegment = updatedSegments[segmentIndex + 1];
        const nextDepartTime = moment(`${nextSegment.departDate} ${nextSegment.departTime}`, 'YYYY-MM-DD HH:mm');

        if (segArrive.isAfter(nextDepartTime)) {
          // Show conflict modal for missed connection
          setConflictMessage(`This delay causes you to miss your connecting flight from ${segment.to} to ${nextSegment.to}.`);
          setPendingUpdateTrips(updatedTrips); // FIX: successfuly passing full trips array
          setShowConflictModal(true);
          return;
        }
      }

      // Update trip-level times if first or last segment
      let tripDepartDate = tripToUpdate.departDate;
      let tripDepartTime = tripToUpdate.departTime;
      let tripArriveDate = tripToUpdate.arriveDate;
      let tripArriveTime = tripToUpdate.arriveTime;

      if (segmentIndex === 0) {
        tripDepartDate = segDepart.format('YYYY-MM-DD');
        tripDepartTime = segDepart.format('HH:mm');
      }

      if (segmentIndex === updatedSegments.length - 1) {
        tripArriveDate = segArrive.format('YYYY-MM-DD');
        tripArriveTime = segArrive.format('HH:mm');
      }

      updatedTrips[currentTripIndex] = {
        ...tripToUpdate,
        departDate: tripDepartDate,
        departTime: tripDepartTime,
        arriveDate: tripArriveDate,
        arriveTime: tripArriveTime,
        segments: updatedSegments,
      };

      // Check for conflict with next trip (only if last segment was delayed)
      if (segmentIndex === updatedSegments.length - 1) {
        const nextTrip = plan.trips[currentTripIndex + 1];
        if (nextTrip) {
          const nextDepart = moment(`${nextTrip.departDate} ${nextTrip.departTime}`, 'YYYY-MM-DD HH:mm');
          if (segArrive.isAfter(nextDepart)) {
            setConflictMessage('This delay causes your arrival to overlap with your next flight\'s departure.');
            setPendingUpdateTrips(updatedTrips);
            setShowConflictModal(true);
            return;
          }
        }
      }

      performPlanUpdate(updatedTrips);
      return;
    }

    // TRIP-LEVEL DELAY (single flight or legacy behavior)
    let departMoment = moment(`${tripToUpdate.departDate} ${tripToUpdate.departTime}`, 'YYYY-MM-DD HH:mm');
    if (updateDeparture) {
      departMoment.add(minutes, 'minutes');
    }
    const arriveMoment = moment(`${tripToUpdate.arriveDate} ${tripToUpdate.arriveTime}`, 'YYYY-MM-DD HH:mm');

    const newDepart = departMoment;
    const newArrive = arriveMoment.add(minutes, 'minutes');

    const updatedSegments = tripToUpdate.segments ? [...tripToUpdate.segments] : [];

    // Update first segment departure (if exists)
    if (updatedSegments.length > 0) {
      const firstSeg = updatedSegments[0];
      let segDepart = moment(`${firstSeg.departDate} ${firstSeg.departTime}`, 'YYYY-MM-DD HH:mm');
      if (updateDeparture) {
        segDepart.add(minutes, 'minutes');
      }
      updatedSegments[0] = {
        ...firstSeg,
        departDate: segDepart.format('YYYY-MM-DD'),
        departTime: segDepart.format('HH:mm'),
      };
    }

    // Update last segment arrival (if exists)
    if (updatedSegments.length > 0) {
      const lastIdx = updatedSegments.length - 1;
      const lastSeg = updatedSegments[lastIdx];
      const segArrive = moment(`${lastSeg.arriveDate} ${lastSeg.arriveTime}`, 'YYYY-MM-DD HH:mm').add(minutes, 'minutes');
      updatedSegments[lastIdx] = {
        ...lastSeg,
        arriveDate: segArrive.format('YYYY-MM-DD'),
        arriveTime: segArrive.format('HH:mm'),
      };
    }

    updatedTrips[currentTripIndex] = {
      ...tripToUpdate,
      departDate: newDepart.format('YYYY-MM-DD'),
      departTime: newDepart.format('HH:mm'),
      arriveDate: newArrive.format('YYYY-MM-DD'),
      arriveTime: newArrive.format('HH:mm'),
      segments: updatedSegments,
    };

    // Check for conflicts with next trip
    const nextTrip = plan.trips[currentTripIndex + 1];
    if (nextTrip) {
      const nextDepart = moment(`${nextTrip.departDate} ${nextTrip.departTime}`, 'YYYY-MM-DD HH:mm');
      if (newArrive.isAfter(nextDepart)) {
        setConflictMessage('This delay causes your arrival to overlap with your next flight\'s departure.');
        setPendingUpdateTrips(updatedTrips);
        setShowConflictModal(true);
        return;
      }
    }

    performPlanUpdate(updatedTrips);
  };

  const performPlanUpdate = (updatedTrips: any[]) => {
    updatePlan(plan.id, plan.name, updatedTrips);
  };

  // Check conditions for edit tooltip
  React.useEffect(() => {
    let timeoutId: any;

    const checkTooltipConditions = async () => {
      try {
        const tooltipShownKey = `@travelbuddy_edit_tooltip_shown_global`; // Global key for user
        const viewCountKey = `@travelbuddy_plan_view_count_${plan.id}`;

        // Check if tooltip already shown for this plan
        const tooltipShown = await AsyncStorage.getItem(tooltipShownKey);
        if (tooltipShown === 'true') {
          return; // Already shown, don't show again
        }

        // Increment view count
        const viewCountStr = await AsyncStorage.getItem(viewCountKey);
        const viewCount = viewCountStr ? parseInt(viewCountStr, 10) : 0;
        const newViewCount = viewCount + 1;
        await AsyncStorage.setItem(viewCountKey, newViewCount.toString());

        // Check conditions: within 72 hours OR 3+ views
        const trip = plan.trips[currentTripIndex];
        const depTz = trip.fromTz || getCityTimezone(trip.from);
        const hoursUntilDeparture = moment.tz(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm', depTz).diff(moment.tz(depTz), 'hours');
        const within72Hours = hoursUntilDeparture <= 72 && hoursUntilDeparture >= 0;
        const hasEnoughViews = newViewCount >= 3;

        if (within72Hours || hasEnoughViews) {
          // Show tooltip after a brief delay to let the screen settle
          timeoutId = setTimeout(() => setShowEditTooltip(true), 500);
        }
      } catch (error) {
        console.error('Error checking tooltip conditions:', error);
      }
    };

    checkTooltipConditions();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [plan.id, currentTripIndex]);

  const handleDismissTooltip = async () => {
    setShowEditTooltip(false);
    try {
      const tooltipShownKey = `@travelbuddy_edit_tooltip_shown_global`;
      await AsyncStorage.setItem(tooltipShownKey, 'true');
    } catch (error) {
      console.error('Error saving tooltip dismissed state:', error);
    }
  };

  const handleDismissDelayTooltip = async () => {
    setShowDelayTooltip(false);
    try {
      const tooltipShownKey = `@travelbuddy_delay_tooltip_shown_global`; // Global key for user
      await AsyncStorage.setItem(tooltipShownKey, 'true');
    } catch (error) {
      console.error('Error saving delay tooltip dismissed state:', error);
    }
  };

  // Check for Delay Tooltip (Priority: Secondary)
  React.useEffect(() => {
    let timeoutId: any;

    const checkDelayTooltip = async () => {
      // 1. Priority Check: Don't show if Edit Tooltip is visible
      if (showEditTooltip) return;

      // 2. Phase Check: Only show in 'travel' phase or close to departure
      // Use logic similar to 'within 24h' or matches 'travel'
      const trip = plan.trips[currentTripIndex];
      const depTz = trip.fromTz || getCityTimezone(trip.from);
      const hoursUntilDeparture = moment.tz(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm', depTz).diff(moment.tz(depTz), 'hours');

      // Show if we are in travel phase active tab OR within 24 hours of flight
      const isRelevantTime = activePhase === 'travel' || (hoursUntilDeparture <= 24 && hoursUntilDeparture >= -24);

      if (!isRelevantTime) return;

      try {
        const tooltipShownKey = `@travelbuddy_delay_tooltip_shown_global`;
        const tooltipShown = await AsyncStorage.getItem(tooltipShownKey);

        if (tooltipShown !== 'true') {
          // Show it
          timeoutId = setTimeout(() => setShowDelayTooltip(true), 1000); // 1s delay to stagger execution
        }
      } catch (error) {
        console.error('Error checking delay tooltip:', error);
      }
    };

    checkDelayTooltip();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showEditTooltip, activePhase, plan.id, currentTripIndex]);



  // Check for Arrival Check-in (only if landed and within window)
  React.useEffect(() => {
    if (activePhase === 'adjust') {
      const currentTrip = plan.trips[currentTripIndex];
      const inWindow = isWithinArrivalWindow(currentTrip);

      console.log('[TripDetail] Popup Check:', {
        inWindow,
        status: currentTrip?.arrivalRestStatus,
        landingTime: currentTrip?.arriveTime,
        now: moment().format(),
        tz: currentTrip?.toTz || getCityTimezone(currentTrip?.to)
      });

      // Only prompt if status is not set AND we are within the valid window
      if (currentTrip && currentTrip.arrivalRestStatus === undefined && inWindow) {
        setShowExhaustionModal(true);
      }
    }
  }, [activePhase, currentTripIndex, plan]);

  // Helper to determine the relevant phase timezone
  const getPhaseTimezone = (phaseKey: string) => {
    const trip = plan.trips[currentTripIndex];
    if (phaseKey === 'adjust') {
      return trip.toTz || getCityTimezone(trip.to);
    }
    // Prepare and Travel phases use origin timezone
    return trip.fromTz || getCityTimezone(trip.from);
  };

  // Helper to get all dates in a phase
  const getDatesForPhase = (phaseKey: string) => {
    const tripPlan = plan.jetLagPlans[currentTripIndex];
    if (!tripPlan) return [];

    const phase = tripPlan.phases[phaseKey as keyof typeof tripPlan.phases];
    if (!phase.startDate || !phase.endDate) {
      // Fallback - Extract dates from cards
      const datesSet = new Set<string>();
      const tz = getPhaseTimezone(phaseKey);
      phase.cards.forEach((card: Card) => {
        if (card.dateTime) {
          datesSet.add(moment.tz(card.dateTime, tz).format('YYYY-MM-DD'));
        }
      });
      return Array.from(datesSet).sort();
    }

    // Generate dates between startDate and endDate inclusive
    const start = moment(phase.startDate, 'YYYY-MM-DD');
    const end = moment(phase.endDate, 'YYYY-MM-DD');
    const dates = [];

    let curr = start.clone();
    while (curr.isSameOrBefore(end, 'day')) {
      dates.push(curr.format('YYYY-MM-DD'));
      curr.add(1, 'day');
    }

    return dates;
  };



  // Reset selectedDate when phase or trip changes
  React.useEffect(() => {
    const dates = getDatesForPhase(activePhase);
    if (dates.length > 0) {
      // For Prepare AND Adjust phases, always default to the first date if not set or invalid
      // This prevents "Show All" (null) which would be overwhelming with unrolled daily cards
      if (activePhase === 'prepare' || activePhase === 'adjust') {
        if (!selectedDate || !dates.includes(selectedDate)) {
          setSelectedDate(dates[0]);
        }
      } else {
        setSelectedDate(null);
      }
    } else {
      setSelectedDate(null);
    }
  }, [activePhase, currentTripIndex]);

  const handleUpdateRestStatus = (status: 'exhausted' | 'ok') => {
    const updatedTrips = [...plan.trips];
    updatedTrips[currentTripIndex] = {
      ...updatedTrips[currentTripIndex],
      arrivalRestStatus: status,
      arrivalRestRecordedAt: new Date().toISOString() // Record timestamp
    };

    // Update the plan in context (triggers regeneration)
    updatePlan(plan.id, plan.name, updatedTrips);
    setShowExhaustionModal(false);
  };

  // Next Phase / Next Day Logic
  const getNextStepInfo = () => {
    const dates = getDatesForPhase(activePhase);

    // 1. Next Date in same phase?
    if (activePhase !== 'travel' && selectedDate) {
      const currentIndex = dates.indexOf(selectedDate);
      if (currentIndex !== -1 && currentIndex < dates.length - 1) {
        return { label: "Next Day", type: 'date', target: dates[currentIndex + 1] };
      }
    }

    // 2. Next Phase?
    if (activePhase === 'prepare') return { label: "Start Travel", type: 'phase', target: 'travel' };
    if (activePhase === 'travel') return { label: "Start Adjustment", type: 'phase', target: 'adjust' };

    // 3. End of Plan
    return { label: "Return to Plans", type: 'finish' };
  };

  const handleNextStep = () => {
    const { type, target } = getNextStepInfo();

    if (type === 'date') {
      setSelectedDate(target as string);
      // Optional: scroll to top
    } else if (type === 'phase') {
      setActivePhase(target as any);
    } else {
      navigation.navigate('MainTabs', { screen: 'Plans' });
    }
  };

  // OLD: Local state removed

  const checkAndPromptReview = async (updatedStatuses?: any) => {
    try {
      if (!plan || !plan.jetLagPlans || !plan.jetLagPlans[currentTripIndex]) return;

      const tripPlan = plan.jetLagPlans[currentTripIndex];
      const allCards = [
        ...tripPlan.phases.prepare.cards,
        ...tripPlan.phases.travel.cards,
        ...tripPlan.phases.adjust.cards
      ].filter(c => !c.isInfo);

      if (allCards.length === 0) return;

      const statusesToUse = updatedStatuses || cardStatuses;
      const completedCount = allCards.filter(c => {
        const status = statusesToUse[`${plan.id}_${c.id}`];
        return status === 'done' || status === 'skipped';
      }).length;

      const progressRatio = completedCount / allCards.length;

      if (progressRatio >= 0.5) {
        const storageKey = `review_prompt_shown_${plan.id}_trip_${currentTripIndex}`;
        const hasPrompted = await AsyncStorage.getItem(storageKey);

        if (!hasPrompted) {
          try {
            StoreReview.requestReview();
            await AsyncStorage.setItem(storageKey, 'true');
          } catch (e) {
            console.error('StoreReview error:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error checking review prompt:', error);
    }
  };

  const handleSkip = (cardId: string) => {
    updateCardStatus(plan.id, cardId, 'skipped');
    // Check for 50% progress after skip
    const updated = { ...cardStatuses, [`${plan.id}_${cardId}`]: 'skipped' };
    checkAndPromptReview(updated);
  };

  const handleDone = (cardId: string) => {
    updateCardStatus(plan.id, cardId, 'done');

    // ANALYTICS
    try {
      const tripPlan = plan.jetLagPlans[currentTripIndex];
      if (tripPlan) {
        const phases = [tripPlan.phases.prepare, tripPlan.phases.travel, tripPlan.phases.adjust];
        let foundCard = null;
        for (const phase of phases) {
          foundCard = phase.cards.find((c: any) => c.id === cardId);
          if (foundCard) break;
        }

        if (foundCard && foundCard.dateTime) {
          const tripStart = moment(plan.trips[currentTripIndex].departDate);
          const cardDate = moment(foundCard.dateTime);
          const day = cardDate.diff(tripStart, 'days') + 1;
          Analytics.logTaskCompleted(foundCard.title, day);
        }
      }
    } catch (e) {
      console.warn('Analytics log failed', e);
    }

    // Check for 50% progress after done
    const updated = { ...cardStatuses, [`${plan.id}_${cardId}`]: 'done' };
    checkAndPromptReview(updated);
  };

  const handleUndo = (cardId: string) => {
    updateCardStatus(plan.id, cardId, 'active');
  };

  const handleResetAll = () => {
    // Collect all updates first
    const visibleCards = getVisibleCards();
    const updates = visibleCards.map(card => ({
      planId: plan.id,
      cardId: card.id,
      status: 'active' as const
    }));

    // Perform batch update to ensure React state updates correctly
    batchUpdateCardStatuses(updates);
  };


  // Defensive check for malformed plan data
  if (!plan || !plan.trips || plan.trips.length === 0 || !plan.jetLagPlans) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Icon name="chevron-left" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.planName, { color: colors.text }]}>Error loading plan</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            This plan has no trips. Please delete it and create a new one.
          </Text>
        </View>
      </View>
    );
  }

  // Color palette for each activity type
  const CARD_THEMES: Record<string, {
    background: string;
    titleColor: string;
    timeColor: string;
    textColor: string;
    labelColor: string;
    skipBg: string;
    skipText: string;
    doneBg: string;
    doneText: string;
  }> = {
    // 💤 Sleep, Get Some Rest, Short Nap OK — teal theme
    "Sleep": {
      background: "#1C5D74",        // Teal blue background
      titleColor: "#FFFFFF",
      timeColor: "#DCE5E9",
      textColor: "#FFFFFF",
      labelColor: "#c1e0eeff",
      skipBg: "#6FA5B8",            // Muted teal-gray skip button
      skipText: "#FFFFFF",
      doneBg: "#0E3A47",            // Deep navy-teal done button
      doneText: "#FFFFFF",
    },

    // ☕ Caffeine OK — warm brown
    "Caffeine": {
      background: "#b98b75ff",        // Medium mocha brown
      titleColor: "#FFFFFF",
      timeColor: "#F8FAFC",
      textColor: "#FFFFFF",
      labelColor: "#6B3B2A",
      skipBg: "#CFA08C",            // Soft tan skip button
      skipText: "#FFFFFF",
      doneBg: "#6B3B2A",            // Deep brown done button
      doneText: "#FFFFFF",
    },

    // 🚫 No Caffeine — light clay / beige
    "NoCaffeine": {
      background: "#F3F0ED",        // Pale clay gray background
      titleColor: "#383430ff",        // Coffee-brown text
      timeColor: "#383430ff",
      textColor: "#383430ff",
      labelColor: "#68615bff",
      skipBg: "#E6E1DC",            // Subtle gray skip
      skipText: "#000000",
      doneBg: "#C9C4BF",            // Light warm gray done button
      doneText: "#FFFFFF",
    },

    // ☀️ Sunlight — soft yellow
    "Sunlight": {
      background: "#FFF7C5",        // Pale yellow background
      titleColor: "#000000",        // Dark navy-gray text
      timeColor: "#000000",
      textColor: "#000000",
      labelColor: "#F6CB60",        // Golden brown label
      skipBg: "#FEFCE8",            // Off-white skip button
      skipText: "#000000",
      doneBg: "#F6CB60",            // Pastel yellow done button
      doneText: "#FFFFFF",
    },

    "StayAwake": {
      background: "#FFF7C5",        // Pale yellow background (Matches Sunlight)
      titleColor: "#000000",
      timeColor: "#000000",
      textColor: "#000000",
      labelColor: "#F6CB60",        // Golden brown label
      skipBg: "#FEFCE8",            // Off-white skip button
      skipText: "#000000",
      doneBg: "#F6CB60",            // Pastel yellow done button
      doneText: "#FFFFFF",
    },

    "LockedIn": {
      background: "#FDE68A",        // Slightly darker yellow (Yellow 300)
      titleColor: "#000000",        // Dark navy-gray text
      timeColor: "#000000",
      textColor: "#000000",
      labelColor: "#854d0eff",        // Deep amber/brown label
      skipBg: "#FEFCE8",            // Off-white skip button
      skipText: "#000000",
      doneBg: "#b45309ff",            // Deep amber done button
      doneText: "#FFFFFF",
    },

    // 💧 Stay Hydrated — light blue (matches avoid bright light)
    "Hydrated": {
      background: "#DBEAFE",         // Light blue background
      titleColor: "#446084ff",         // Dark blue title
      timeColor: "#446084ff",
      textColor: "#446084ff",
      labelColor: "#3567a4ff",
      skipBg: "#EFF6FF",             // Slightly darker blue skip
      skipText: "#000000",
      doneBg: "#9AC8FF",             // Medium blue done
      doneText: "#FFFFFF",
    },



    // ⚠️ Priority / Recovery - Pastel Orange
    "Priority": {
      background: "#FFE4D6",        // Pastel Peach (Matches Exhausted Button)
      titleColor: "#9A3412",        // Dark Orange/Red text
      timeColor: "#C2410C",         // Medium Orange
      textColor: "#9A3412",         // Dark Orange text
      labelColor: "#EA580C",        // Label color
      skipBg: "#FED7AA",            // Orange-200
      skipText: "#7C2D12",
      doneBg: "#F97316",            // Orange-500
      doneText: "#FFFFFF",
    },

    "Navy": {
      background: "#1E3A5F",
      titleColor: "#FFFFFF",
      timeColor: "#FFFFFF",
      textColor: "#FFFFFF",
      labelColor: "#FFFFFF",
      skipBg: "#4A7A95",
      skipText: "#FFFFFF",
      doneBg: "#1E3A5F",
      doneText: "#FFFFFF",
    },

    "DailyRoutine": {
      background: "#E98983",
      titleColor: "#301715ff",
      timeColor: "#301715ff",
      textColor: "#301715ff",
      labelColor: "#87312bff",
      skipBg: "#fde0deff",
      skipText: "#301715ff",
      doneBg: "#84312bff",
      doneText: "#ffffffff",
    },

    "Arrived": {
      background: "#E98983",
      titleColor: "#fde0deff",
      timeColor: "#301715ff",
      textColor: "#301715ff",
      labelColor: "#87312bff",
      skipBg: "#fde0deff",
      skipText: "#301715ff",
      doneBg: "#84312bff",
      doneText: "#ffffffff",
    },

    // 🫐 Supplement (Melatonin/Magnesium) — Kawaii Taro Theme
    "Supplement": {
      background: "#F3E5F5",        // Soft Lilac / Taro Milk
      titleColor: "#7B1FA2",        // Warm Deep Purple
      timeColor: "#7B1FA2",
      textColor: "#4A148C",        // Darker Purple for text
      labelColor: "#9C27B0",        // Vibrant Warm Purple
      skipBg: "#E1BEE7",            // Pastel Lavender
      skipText: "#4A148C",
      doneBg: "#8E24AA",            // Medium Purple
      doneText: "#FFFFFF",
    },

    "ManagingEnergy": {
      background: "#FFD4C4",
      titleColor: "#5C3A2E",
      timeColor: "#5C3A2E",
      textColor: "#5C3A2E",
      labelColor: "#8B5A3C",
      skipBg: "#FFE8DC",
      skipText: "#5C3A2E",
      doneBg: "#E8A890",
      doneText: "#FFFFFF",
    },

    // 🥗 Meal (Dinner / Light Meal) — Pistachio Theme
    "Meal": {
      background: "#E6F5D0",        // Light Pistachio Green
      titleColor: "#3E5C41",        // Deep Organic Green
      timeColor: "#3E5C41",         // Deep Organic Green
      textColor: "#1A2E1C",        // Very Dark Green Description
      labelColor: "#3E5C41",        // Deep Organic Green
      skipBg: "#D4EBC0",            // Muted Pistachio Skip
      skipText: "#3E5C41",
      doneBg: "#3E5C41",            // Deep Organic Green Done
      doneText: "#FFFFFF",
    },

    // ⏳ Fasting — Soft Gray Theme
    "Fasting": {
      background: "#F1F5F9",        // Soft slate gray
      titleColor: "#475569",        // Medium slate
      timeColor: "#475569",
      textColor: "#334155",         // Darker slate for readability
      labelColor: "#64748B",        // Slate
      skipBg: "#E2E8F0",            // Muted slate skip
      skipText: "#475569",
      doneBg: "#64748B",            // Solid slate done
      doneText: "#FFFFFF",
    },

    // 🌊 Teal (Travel Day / Phase Tabs Match)
    "Teal": {
      background: "#C7F5E8",        // Soft Mint/Teal
      titleColor: "#0D4C4A",        // Dark Teal
      timeColor: "#0D4C4A",         // Dark Teal
      textColor: "#0D4C4A",         // Dark Teal
      labelColor: "#0F766E",        // Slightly lighter teal for labels
      skipBg: "#E0F2F1",            // Very light teal
      skipText: "#0D4C4A",
      doneBg: "#0D4C4A",            // Dark Teal
      doneText: "#FFFFFF",
    },

    // 👁 Default fallback (stay awake, etc.)
    "Default": {
      background: "#F1F5F9",
      titleColor: "#1E293B",
      timeColor: "#475569",
      textColor: "#334155",
      labelColor: "#475569",
      skipBg: "#E2E8F0",
      skipText: "#1E293B",
      doneBg: "#87a4c9ff",
      doneText: "#FFFFFF",
    },
  };


  function getCardTheme(title: string) {
    const t = title.toLowerCase();

    // Priority Cards — CHECK FIRST
    if (t.includes('priority') || t.includes('early bedtime'))
      return CARD_THEMES.Priority;

    // Supplements (Melatonin / Magnesium) — CHECK EARLY
    if (t.includes('melatonin') || t.includes('magnesium'))
      return CARD_THEMES.Supplement;

    // Supplements (Melatonin / Magnesium) — CHECK EARLY
    if (t.includes('melatonin') || t.includes('magnesium'))
      return CARD_THEMES.Supplement;

    // Fasting / Align Meal Schedule (Check BEFORE generic "meal" check)
    if (t.includes('fasting') || t.includes('align your meal schedule'))
      return CARD_THEMES.Fasting;

    // Meals (Dinner / Light Meal, Break Fast)
    // Fix: "Seattle" contains "eat", so we must be careful.
    if (
      (t.includes('eat ') || t.startsWith('eat')) || // Match "eat pattern" with space or start
      t.includes('dinner') ||
      t.includes('meal') ||
      t.includes('time for breakfast') ||
      t.includes('in-flight breakfast') ||
      t.includes('break your fast') ||
      t.includes('break fast')
    )
      return CARD_THEMES.Meal;

    // Daily Routine card
    if (t.includes('daily routine'))
      return CARD_THEMES.Hydrated;

    // You've Arrived card - custom theme
    if (t.includes("you've arrived") || t.includes("arrived"))
      return CARD_THEMES.Default;

    // Sleep / Rest / Nap / Head to Bed (but NOT "Avoid Naps")
    if ((t.includes("sleep") || t.includes("rest") || t.includes("nap") || t.includes("head to bed")) && !(t.includes("avoid") && t.includes("nap")))
      return CARD_THEMES.Sleep;

    // Caffeine OK
    if (t.includes('caffeine ok') || (t.includes('caffeine') && !t.includes('no') && !t.includes('cutoff') && !t.includes('limit') && !t.includes('after')))
      return CARD_THEMES.Caffeine;

    // No Caffeine
    if (t.includes('no caffeine') || t.includes('cutoff') || t.includes('limit caffeine') || (t.includes('after') && t.includes('caffeine')))
      return CARD_THEMES.NoCaffeine;

    // Your Flight - CHECK THIS FIRST before "light" check
    if (t.includes("your flight"))
      return CARD_THEMES.Teal;

    // Flight segment cards - CHECK THIS FIRST before "light" check  
    if (t.includes("flight from"))
      return CARD_THEMES.Navy;

    // Sunlight / Light (but not "avoid")
    if ((t.includes("sunlight") || t.includes("light") || t.includes("sun")) &&
      !t.includes("avoid"))
      return CARD_THEMES.Sunlight;

    // Lock In Rhythm - darker yellow
    if (t.includes("lock in your rhythm") || t.includes("lock in rhythm"))
      return CARD_THEMES.LockedIn;

    // Stay Awake
    if (t.includes("stay awake") || t.includes("awake") || t.includes("start your day"))
      return CARD_THEMES.StayAwake;

    // Managing Energy - peachy pastel
    if (t.includes("managing energy") || t.includes("manage energy"))
      return CARD_THEMES.ManagingEnergy;

    // Stay Hydrated
    if (t.includes("hydrate") || t.includes("hydration") || t.includes("hydrating"))
      return CARD_THEMES.Hydrated;

    return CARD_THEMES.Default;
  }

  function getCardIconName(title: string): string {
    const t = title.toLowerCase();

    // Flight cards - CHECK FIRST before other checks
    if (t.includes('flight from') || t.includes('your flight')) {
      return 'send';
    }

    // Sleep / Rest / Nap / Bed
    if (t.includes('sleep') || t.includes('rest') || t.includes('nap') || t.includes('bed')) {
      return 'moon';
    }

    // Caffeine
    if (t.includes('caffeine ok') || (t.includes('caffeine') && !t.includes('no'))) {
      return 'coffee';
    }

    // No Caffeine
    if (t.includes('no caffeine') || t.includes('caffeine cutoff')) {
      return 'x-circle';
    }

    // Align Meal Schedule / Fasting (Check BEFORE generic "meal" check)
    if (t.includes('fasting') || t.includes('align your meal schedule')) {
      return 'circle';
    }

    // Meal / Break Fast
    if ((t.includes('eat ') || t.startsWith('eat')) || t.includes('dinner') || t.includes('meal') || t.includes('time for breakfast') || t.includes('break your fast') || t.includes('break fast')) {
      return 'package';  // Food box icon
    }

    // Sunlight / Light (but check after flight cards)
    if (t.includes('sunlight') || (t.includes('light') && !t.includes('avoid')) || t.includes('lock in')) {
      return 'sun';
    }

    // Avoid bright light
    if (t.includes('avoid') && t.includes('light')) {
      return 'moon';
    }

    // Stay Awake
    if (t.includes('stay awake') || t.includes('awake') || t.includes('start your day')) {
      return 'eye';
    }

    // Hydration
    if (t.includes('hydrate') || t.includes('hydration') || t.includes('hydrating')) {
      return 'droplet';
    }



    // Daily Routine / Arrow
    if (t.includes('routine') || t.includes('starting tomorrow')) {
      return 'arrow-right';
    }

    // Layover / Activity
    if (t.includes('layover') || t.includes('active')) {
      return 'activity';
    }

    // Arrived / Celebration
    if (t.includes('arrived')) {
      return 'check-circle';
    }

    // Default
    return 'circle';
  }



  const trip: Trip = plan.trips[currentTripIndex];
  const tripPlan: JetLagPlan = plan.jetLagPlans[currentTripIndex];
  const currentPhase = tripPlan.phases[activePhase];

  // FIX #1: Get phase header text without single-date filtering
  const getPhaseHeaderText = () => {
    if (activePhase === 'prepare') {
      return tripPlan.strategy === 'stay_home'
        ? `Pre-Trip – ${currentPhase.dateRange}`
        : `Preparation Phase: ${currentPhase.dateRange}`;
    }
    if (activePhase === 'travel') {
      if (tripPlan.strategy === 'stay_home') {
        // Return a broader range if merged
        // Removed - just use standard Travel Day label
      }
      const isSingleDate = !currentPhase.dateRange.includes('-');
      return `Travel ${isSingleDate ? 'Day' : 'Days'}: ${currentPhase.dateRange}`;
    }
    // Adjust
    return tripPlan.strategy === 'stay_home'
      ? `Trip Schedule – ${currentPhase.dateRange}`
      : `Adjust Phase: ${currentPhase.dateRange}`;
  };

  // FIX #2: Filter cards based on whether showing arrival day or daily routine
  const getVisibleCards = () => {
    let cards = [];

    if (activePhase !== 'adjust') {
      cards = [...currentPhase.cards];

      // MERGE LOGIC: If strategy is 'stay_home' AND NOT suppressed, and we are looking at 'travel' phase,
      // append the 'adjust' phase cards to the end of the list.
      if (tripPlan.strategy === 'stay_home' && !tripPlan.suppressAdjustPhase && activePhase === 'travel') {
        const adjustCards = tripPlan.phases.adjust.cards.filter(c =>
          !c.title.includes('Arrival Day')
        );
        cards = [...cards, ...adjustCards];
      }

      // Filter by selectedDate (Only for Prepare phase as per user request)
      if (activePhase === 'prepare' && selectedDate) {
        const tz = getPhaseTimezone(activePhase);
        cards = cards.filter(c =>
          getCardLogicalDate(c, tz) === selectedDate
        );
      }

      return cards.sort((a, b) => {
        if (!a.dateTime || !b.dateTime) return 0;
        return moment(a.dateTime).diff(moment(b.dateTime));
      });
    } else {
      // FIX: Unified filtering for Adjust Phase (same as Prepare)
      // Since we now have unrolled daily cards with specific dates in the Adjust phase,
      // we can simply filter by the selectedDate using getCardLogicalDate.

      const tz = getPhaseTimezone('adjust');
      let adjustCards = [...currentPhase.cards];

      if (selectedDate) {
        adjustCards = adjustCards.filter(c =>
          getCardLogicalDate(c, tz) === selectedDate
        );
      }

      // Hide headers (Departure/Arrival/In Flight) as they are usually for Travel phase
      // unless they are specific informational headers we want to keep?
      // For now, keep them if they fall on the date, but usually Adjust phase doesn't have them.
      // But we should filter out the "Daily Routine" separator if it exists and looks cluttery
      adjustCards = adjustCards.filter(c => !c.id.includes('adjust-separator'));

      return adjustCards.sort((a, b) => {
        if (!a.dateTime || !b.dateTime) return 0;
        return moment(a.dateTime).diff(moment(b.dateTime));
      });
    }
  };


  const visibleCards = getVisibleCards();

  // Extract "Your Flight" card for sticky rendering
  const flightCard = activePhase === 'travel'
    ? visibleCards.find(c => c.title.toLowerCase().includes('flight from') || c.title.toLowerCase().includes('your flight'))
    : null;

  // Filter out flight card from main list if found
  const scrollableCards = flightCard
    ? visibleCards.filter(c => c.id !== flightCard.id)
    : visibleCards;


  // Card expand toggle
  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      newSet.has(cardId) ? newSet.delete(cardId) : newSet.add(cardId);
      return newSet;
    });
  };

  const getCardStatus = (cardId: string) => {
    const key = `${plan.id}_${cardId}`;
    return (cardStatuses[key] || 'active') as 'active' | 'done' | 'skipped';
  };

  // Count completed/skipped cards
  const statusCounts = visibleCards.reduce((acc, card) => {
    const status = getCardStatus(card.id);
    if (status === 'done') acc.done++;
    if (status === 'skipped') acc.skipped++;
    return acc;
  }, { done: 0, skipped: 0 });

  const hasAnyStatusChanges = statusCounts.done > 0 || statusCounts.skipped > 0;

  // Trip navigation arrows
  const goToPreviousTrip = () => {
    if (currentTripIndex > 0) {
      setCurrentTripIndex(currentTripIndex - 1);
      setActivePhase('travel');
    }
  };
  const goToNextTrip = () => {
    if (currentTripIndex < plan.trips.length - 1) {
      setCurrentTripIndex(currentTripIndex + 1);
      setActivePhase('travel');
    }
  };

  // ───────────────────────────────────────────────
  // 🎨 Auto-color mapping logic (matches Figma design)
  // ───────────────────────────────────────────────
  const getCardColor = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('sleep') || t.includes('plane')) return '#1E3A5F';   // navy
    if (t.includes('caffeine')) return '#C68C72';                       // brown
    if (t.includes('light') || t.includes('sun')) return '#FFF9C4';     // yellow
    if (t.includes('flight') || t.includes('hydrate')) return '#A6D3FF';// blue
    if (t.includes('awake')) return '#E2E8F0';                          // gray
    return '#E2E8F0'; // default gray
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ────── Header bar ────── */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Icon name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.planName, { color: colors.text }]}>{plan.name || (trip ? `Trip to ${trip.to}` : 'My Trip')}</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>{moment(trip.departDate).format('MMM D, YYYY')} Departure</Text>
        </View>

        <View
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onLayout={(e) => setActionsBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
        >
          {/* Quick Delay Button */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowDelayModal(true)}
          >
            <Icon name="clock" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              // Navigate to AddTrips with minimal params to avoid serialization issues
              navigation.push('AddTrips', {
                mode: 'edit',
                planName: plan.name,
                existingPlanId: plan.id
              });
            }}
          >
            <Icon name="edit-2" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showEditTooltip && (
        <View style={[styles.tooltipContainer, { top: actionsBottom + 6 }]}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>Flight changed?</Text>
            <Text style={styles.tooltipSubText}>Tap the pencil to update plan</Text>
            <TouchableOpacity onPress={handleDismissTooltip} style={styles.tooltipDismissButton}>
              <Text style={styles.tooltipDismissText}>Dismiss</Text>
            </TouchableOpacity>
            <View style={styles.tooltipArrow} />
          </View>
        </View>
      )}

      {/* Delay Tooltip (Mutually Exclusive with Edit Tooltip) */}
      {!showEditTooltip && showDelayTooltip && (
        <View style={[styles.delayTooltipContainer, { top: actionsBottom + 6 }]}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipText}>Running late?</Text>
            <Text style={styles.tooltipSubText}>Tap the clock to add a delay</Text>
            <TouchableOpacity onPress={handleDismissDelayTooltip} style={styles.tooltipDismissButton}>
              <Text style={styles.tooltipDismissText}>Dismiss</Text>
            </TouchableOpacity>
            {/* Arrow adjusted for clock icon position */}
            <View style={[styles.tooltipArrow, { right: 74 }]} />
          </View>
        </View>
      )}

      {/* ────── Trip Navigation Arrows ────── */}
      {
        plan.trips.length > 1 && (
          <View style={[styles.tripNavigation, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
            <TouchableOpacity
              style={[styles.navButton, currentTripIndex === 0 && styles.navButtonDisabled]}
              onPress={goToPreviousTrip}
              disabled={currentTripIndex === 0}>
              <Icon name="arrow-left" size={24} color="#0D4C4A" />
            </TouchableOpacity>

            <View style={styles.tripInfo}>
              <Text style={[styles.tripTitle, { color: colors.text }]}>{trip.from} {'>'} {trip.to}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentTripIndex === plan.trips.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={goToNextTrip}
              disabled={currentTripIndex === plan.trips.length - 1}>
              <Icon name="arrow-right" size={24} color="#0D4C4A" />
            </TouchableOpacity>
          </View>
        )
      }

      {/* ────── Phase Tabs (Prepare / Travel / Adjust) ────── */}
      {/* ────── Phase Tabs (Prepare / Travel / Adjust) ────── */}
      <View style={[styles.phaseTabs, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
        {['prepare', 'travel', 'adjust']
          .filter(phaseKey => {
            // For Stay Home trips, hide 'prepare' tab to simplify structure (User feedback)
            if (tripPlan.strategy === 'stay_home' && phaseKey === 'prepare') return false;

            // Hide 'prepare' tab if it overlaps with previous trip's adjust phase
            if (tripPlan.suppressPreparePhase && phaseKey === 'prepare') return false;

            // NEW: For Stay Home trips, ALSO hide 'adjust' tab, because we will merge it into 'travel'
            // OR if explicitly suppressed (e.g. rapid connection)
            if ((tripPlan.strategy === 'stay_home' || tripPlan.suppressAdjustPhase) && phaseKey === 'adjust') return false;

            return true;
          })
          .map((phaseKey, index, arr) => {
            // Dynamic Labeling
            let label = '';
            if (phaseKey === 'prepare') {
              label = tripPlan.strategy === 'stay_home' ? 'Pre-Trip' : 'Prepare';
            } else if (phaseKey === 'travel') {
              // If we merged adjust into travel, call it "Trip Itinerary" or "Trip Plan"
              label = 'Travel Day';
            } else if (phaseKey === 'adjust') {
              label = tripPlan.strategy === 'stay_home' ? 'Trip Schedule' : 'Adjust';
            }

            const isSingleTab = arr.length === 1;

            return (
              <TouchableOpacity
                key={phaseKey}
                style={[
                  styles.phaseTab,
                  { backgroundColor: activePhase === phaseKey ? undefined : colors.surface },
                  activePhase === phaseKey && styles.phaseTabActive,
                  { flex: 0, width: '31%' },
                  isDark && { shadowColor: 'transparent', elevation: 0 }
                ]}
                onPress={() => {
                  // For Stay Home trips with only one tab, don't allow switching
                  if (tripPlan.strategy === 'stay_home') return;
                  const previousPhase = activePhase;

                  // Smoothly animate the transition between phase cards
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActivePhase(phaseKey as any);

                  // Track phase navigation
                  Analytics.logTabSwitch(previousPhase, phaseKey);
                  Analytics.logPhaseViewed(phaseKey);
                }}
                disabled={tripPlan.strategy === 'stay_home'}>
                <Text
                  style={[
                    styles.phaseTabText,
                    { color: activePhase === phaseKey ? undefined : colors.text },
                    activePhase === phaseKey && styles.phaseTabTextActive,
                  ]}>
                  {label}
                </Text>
                <Text
                  style={[
                    styles.phaseTabDate,
                    { color: activePhase === phaseKey ? undefined : colors.subtext },
                    activePhase === phaseKey && styles.phaseTabDateActive,
                  ]}>
                  {tripPlan.phases[phaseKey as keyof typeof tripPlan.phases].dateRange}
                </Text>
              </TouchableOpacity>
            )
          })}
      </View>



      {/* ────── Sticky Section Header (navy bar) ────── */}


      {/* ────── Prepare/Adjust Phase Sub-Tabs ────── */}
      {(activePhase === 'prepare' || activePhase === 'adjust') && getDatesForPhase(activePhase).length > 1 && (
        <View style={[styles.prepareDateTabsContainer, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
          <View style={styles.prepareDateTabsScroll}>
            {getDatesForPhase(activePhase).map((dateStr) => {
              const mom = moment(dateStr);
              const isActive = selectedDate === dateStr;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    styles.prepareDateTab,
                    {
                      backgroundColor: isActive ? '#C7F5E8' : colors.surface,
                      borderColor: isActive ? '#C7F5E8' : colors.border
                    },
                    isActive && styles.prepareDateTabActive
                  ]}
                  onPress={() => {
                    // Smoothly animate the transition between date cards
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedDate(dateStr);
                  }}
                >
                  <Text style={[
                    styles.prepareDateTabText,
                    { color: isActive ? '#0D4C4A' : colors.subtext },
                    isActive && styles.prepareDateTabTextActive
                  ]}>
                    {mom.format('MMM D')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ────── Reset Button (for Prepare/Adjust) - MOVED BELOW PILLS ────── */}
      {
        activePhase !== 'travel' && hasAnyStatusChanges && (
          <View style={[styles.resetButtonContainer, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
            <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
              <Text style={styles.resetButtonText}>
                Reset All Cards ({statusCounts.done} done, {statusCounts.skipped} skipped)
              </Text>
            </TouchableOpacity>
          </View>
        )
      }

      {/* ────── Fixed "Your Flight" Card (Sticky) ────── */}
      {flightCard && (
        <View style={{
          paddingTop: 2,
          paddingBottom: 0, // Remove bottom padding per request
          backgroundColor: 'transparent',
          zIndex: 10,
          width: '100%', // Ensure full width
        }}>
          {(() => {
            const card = flightCard;
            // NEW DESIGN: Teal theme (match Travel Day tab) + Dark Teal stroke
            const theme = {
              background: '#C7F5E8',    // Teal BG
              titleColor: '#0D4C4A',    // Dark Teal
              timeColor: '#0D4C4A',     // Dark Teal
              textColor: '#0D4C4A',    // Dark Teal
              labelColor: '#0F766E',
              skipBg: '#E0F2F1', skipText: '#0D4C4A', doneBg: '#0D4C4A', doneText: '#FFFFFF'
            };
            const status = getCardStatus(card.id);

            return (
              // Override margins for sticky context to tighten spacing
              <View key={card.id} style={[styles.cardContainer, { marginBottom: 0, marginTop: 0 }]}>
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.background,
                      // Ticket Styling
                      borderBottomWidth: 2,
                      borderColor: '#0F766E', // Slightly darker/desaturated teal for dashed line
                      borderStyle: 'dashed',
                      paddingVertical: 12,    // Slimmer padding (default is usually 16)
                      borderRadius: 12,       // Keep rounded
                      borderBottomLeftRadius: 4,  // Slightly sharper bottom corners for "stub" feel
                      borderBottomRightRadius: 4,
                    } as ViewStyle,
                    status !== 'active' && styles.cardFaded,
                    (card.isInfo || card.title.includes('Routine')) && styles.cardInfo
                  ]}
                  onPress={() => {
                    if (status !== 'active') {
                      handleUndo(card.id);
                    } else if (!card.isInfo) {
                      toggleCard(card.id);
                    }
                  }}
                  disabled={card.isInfo}
                  activeOpacity={0.9}
                >
                  {/* Status badge */}
                  {status !== 'active' && (
                    <View style={[
                      styles.statusBadge,
                      status === 'done' ? styles.statusBadgeDone : styles.statusBadgeSkipped
                    ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {status === 'done' ? (
                          <>
                            <Icon name="check" size={12} color="#FFFFFF" />
                            <Text style={styles.statusBadgeText}>Done</Text>
                          </>
                        ) : (
                          <>
                            <Icon name="skip-forward" size={12} color="#FFFFFF" />
                            <Text style={styles.statusBadgeText}>Skipped</Text>
                          </>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Info button */}
                  {!card.isInfo && status === 'active' && (
                    <TouchableOpacity
                      style={styles.infoButton}
                      onPress={() => toggleCard(card.id)}
                    >
                      <Icon
                        name={expandedCards.has(card.id) ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={theme.titleColor}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Card header */}
                  <View style={[
                    styles.cardHeader,
                    card.isInfo && { paddingRight: 0 }
                  ]}>
                    <View style={styles.cardHeaderContent}>
                      {!card.title.includes('Daily Routine') && (
                        <Icon
                          name={getCardIconName(card.title)}
                          size={22}
                          color={theme.titleColor}
                          style={styles.cardIcon}
                        />
                      )}
                      <View style={styles.cardHeaderText}>
                        <Text
                          style={[
                            styles.cardTitle,
                            { color: theme.titleColor } as TextStyle,
                            card.isInfo && { marginBottom: 0 }
                          ]}
                          numberOfLines={card.title.includes('>') ? 1 : 2}
                          adjustsFontSizeToFit={card.title.includes('>') || card.title.includes('→')}
                          minimumFontScale={0.95}
                        >
                          {activePhase === 'prepare' ? card.title.split(' - ')[0] : card.title}
                        </Text>
                        {card.time && (
                          <Text style={[styles.cardTime, { color: theme.timeColor } as TextStyle]}>
                            {card.time}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Expanded details */}
                  {status === 'active' && expandedCards.has(card.id) && (
                    <View style={styles.cardExpanded}>
                      <Text style={[styles.cardExpandedLabel, { color: theme.labelColor } as TextStyle]}>
                        {card.title.toLowerCase().includes('arrived') ? 'WHAT THIS MEANS:' : 'WHY THIS HELPS:'}
                      </Text>
                      <Text style={[styles.cardExpandedText, { color: theme.textColor } as TextStyle]}>
                        {card.why}
                      </Text>

                      <Text style={[styles.cardExpandedLabel, { color: theme.labelColor } as TextStyle]}>
                        {card.title.toLowerCase().includes('arrived')
                          ? "WHAT'S NEXT:"
                          : (card.title.toLowerCase().includes('melatonin') || card.title.toLowerCase().includes('magnesium'))
                            ? 'OPTIONAL GUIDANCE:'
                            : 'HOW TO DO IT:'}
                      </Text>
                      <Text style={[styles.cardExpandedText, { color: theme.textColor } as TextStyle]}>
                        {card.how}
                      </Text>
                    </View>
                  )}

                  {/* Undo message */}
                  {status !== 'active' && (
                    <View style={styles.undoMessage}>
                      <Text style={[styles.undoMessageText, { color: theme.textColor } as TextStyle]}>
                        Tap card to undo
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  {!card.isInfo && status === 'active' && card.id !== 'conflict-warning' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.skipButton, { backgroundColor: theme.skipBg } as ViewStyle]}
                        onPress={() => handleSkip(card.id)}
                      >
                        <Text style={[styles.skipButtonText, { color: theme.skipText } as TextStyle]}>
                          Skip
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.doneButton, { backgroundColor: theme.doneBg } as ViewStyle]}
                        onPress={() => handleDone(card.id)}
                      >
                        <Text style={[styles.doneButtonText, { color: theme.doneText } as TextStyle]}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      )}

      {/* ────── Cards Section ────── */}
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: 40, paddingTop: flightCard ? 6 : 0 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ────── Reset Button (for Travel Day - after flight card) ────── */}
        {activePhase === 'travel' && hasAnyStatusChanges && (
          <View style={[styles.resetButtonContainer, { backgroundColor: colors.bg, borderBottomColor: 'transparent' }]}>
            <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
              <Text style={styles.resetButtonText}>
                Reset All Cards ({statusCounts.done} done, {statusCounts.skipped} skipped)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Render cards — only one navy header per day */}
        {scrollableCards.map((card: Card) => {
          const theme = getCardTheme(card.title);
          const status = getCardStatus(card.id);

          // Hide header pseudo-cards
          if (
            card.title.includes('Departure Day') ||
            card.title.includes('Arrival Day') ||
            card.title.includes('In Flight')
          ) {
            return null;
          }

          return (
            <View key={card.id} style={styles.cardContainer}>
              <TouchableOpacity
                style={[
                  styles.card,
                  { backgroundColor: theme.background } as ViewStyle,
                  status !== 'active' && styles.cardFaded,
                  (card.isInfo || card.title.includes('Routine')) && styles.cardInfo  // Check for "Routine" instead
                ]}
                onPress={() => {
                  if (card.id === 'conflict-warning') {
                    navigation.navigate('AddTrips', {
                      mode: 'edit',
                      planName: plan.name,
                      existingPlanId: plan.id
                    });
                    return;
                  }
                  if (status !== 'active') {
                    handleUndo(card.id);
                  } else if (!card.isInfo) {
                    toggleCard(card.id);
                  }
                }}
                disabled={card.isInfo && card.id !== 'conflict-warning'}
                activeOpacity={0.9}
              >
                {/* Status badge */}
                {status !== 'active' && (
                  <View style={[
                    styles.statusBadge,
                    status === 'done' ? styles.statusBadgeDone : styles.statusBadgeSkipped
                  ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {status === 'done' ? (
                        <>
                          <Icon name="check" size={12} color="#FFFFFF" />
                          <Text style={styles.statusBadgeText}>Done</Text>
                        </>
                      ) : (
                        <>
                          <Icon name="skip-forward" size={12} color="#FFFFFF" />
                          <Text style={styles.statusBadgeText}>Skipped</Text>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* Info button - positioned absolutely in top-right */}
                {!card.isInfo && status === 'active' && (
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => toggleCard(card.id)}
                  >
                    <Icon
                      name={expandedCards.has(card.id) ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.titleColor}
                    />
                  </TouchableOpacity>
                )}

                {/* Card header */}
                <View style={[
                  styles.cardHeader,
                  card.isInfo && { paddingRight: 0 }  // Remove extra padding for info cards
                ]}>
                  <View style={styles.cardHeaderContent}>
                    {!card.title.includes('Daily Routine') && (
                      <Icon
                        name={getCardIconName(card.title)}
                        size={22}
                        color={theme.titleColor}
                        style={styles.cardIcon}
                      />
                    )}
                    <View style={styles.cardHeaderText}>
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: theme.titleColor } as TextStyle,
                          card.isInfo && { marginBottom: 0 }  // Remove bottom margin for info cards
                        ]}
                        numberOfLines={card.title.includes('>') ? 1 : 2}
                        adjustsFontSizeToFit={card.title.includes('>') || card.title.includes('→')}
                        minimumFontScale={0.95}
                      >
                        {activePhase === 'prepare' ? card.title.split(' - ')[0] : card.title}
                      </Text>
                      {card.time && (
                        <Text style={[styles.cardTime, { color: theme.timeColor } as TextStyle]}>
                          {card.time}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>


                {/* Expanded details - only show if active and expanded */}
                {status === 'active' && expandedCards.has(card.id) && (
                  <View style={styles.cardExpanded}>
                    <Text style={[styles.cardExpandedLabel, { color: theme.labelColor } as TextStyle]}>
                      {card.title.toLowerCase().includes('arrived') ? 'WHAT THIS MEANS:' : 'WHY THIS HELPS:'}
                    </Text>
                    <Text style={[styles.cardExpandedText, { color: theme.textColor } as TextStyle]}>
                      {card.why}
                    </Text>

                    <Text style={[styles.cardExpandedLabel, { color: theme.labelColor } as TextStyle]}>
                      {card.title.toLowerCase().includes('arrived')
                        ? "WHAT'S NEXT:"
                        : (card.title.toLowerCase().includes('melatonin') || card.title.toLowerCase().includes('magnesium'))
                          ? 'OPTIONAL GUIDANCE:'
                          : 'HOW TO DO IT:'}
                    </Text>
                    <Text style={[styles.cardExpandedText, { color: theme.textColor } as TextStyle]}>
                      {card.how}
                    </Text>
                  </View>
                )}

                {/* Undo message for done/skipped cards */}
                {status !== 'active' && (
                  <View style={styles.undoMessage}>
                    <Text style={[styles.undoMessageText, { color: theme.textColor } as TextStyle]}>
                      Tap card to undo
                    </Text>
                  </View>
                )}

                {/* Actions - only show if active and not conflict warning */}
                {!card.isInfo && status === 'active' && card.id !== 'conflict-warning' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.skipButton, { backgroundColor: theme.skipBg } as ViewStyle]}
                      onPress={() => handleSkip(card.id)}
                    >
                      <Text style={[styles.skipButtonText, { color: theme.skipText } as TextStyle]}>
                        Skip
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.doneButton, { backgroundColor: theme.doneBg } as ViewStyle]}
                      onPress={() => handleDone(card.id)}
                    >
                      <Text style={[styles.doneButtonText, { color: theme.doneText } as TextStyle]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Next Phase Button */}
        <TouchableOpacity
          style={styles.nextPhaseButton}
          onPress={handleNextStep}
          activeOpacity={0.8}
        >
          <Text style={styles.nextPhaseButtonText}>{getNextStepInfo().label}</Text>
          <Icon name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Exhaustion Check-in Modal */}
      <Modal
        visible={showExhaustionModal}
        transparent={true}
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontFamily: 'Jua', fontSize: 24, color: colors.text, marginBottom: 12, textAlign: 'center' }}>
              Welcome to {plan.trips[currentTripIndex].to}!
            </Text>
            <Text style={{ fontFamily: 'Jua', fontSize: 16, color: colors.subtext, marginBottom: 24, textAlign: 'center' }}>
              How are you feeling after your journey? This helps us tailor your recovery plan.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: isDark ? '#7C2D12' : '#FFE4D6', // Dark Red or Pastel Peach
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 16,
                marginBottom: 12,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center', // Centered
              }}
              onPress={() => handleUpdateRestStatus('exhausted')}
            >
              <Text style={{ fontFamily: 'Jua', fontSize: 16, color: isDark ? '#FFE4D6' : '#7C2D12', textAlign: 'center' }}>I'm feeling drained and tired</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: isDark ? '#064E3B' : '#D1FAE5', // Dark Emerald or Pastel Teal
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 16,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center', // Centered
                marginBottom: 16,
              }}
              onPress={() => handleUpdateRestStatus('ok')}
            >
              <Text style={{ fontFamily: 'Jua', fontSize: 16, color: isDark ? '#D1FAE5' : '#0F766E', textAlign: 'center' }}>I feel reasonably rested</Text>
            </TouchableOpacity>

            {/* "Ask Me Later" Button */}
            <TouchableOpacity
              style={{ padding: 12, alignItems: 'center' }}
              onPress={() => setShowExhaustionModal(false)}
            >
              <Text style={{ fontFamily: 'Jua', fontSize: 14, color: colors.subtext }}>Ask me later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post Trip Feedback Modal */}
      <PostTripFeedback
        planId={plan.id}
        isVisible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* Quick Delay Modal */}
      <QuickDelayModal
        visible={showDelayModal}
        onClose={() => setShowDelayModal(false)}
        onApplyDelay={handleApplyDelay}
        segments={trip.segments}
        scheduledArriveTime={(() => {
          const lastSegment = trip.segments && trip.segments.length > 0
            ? trip.segments[trip.segments.length - 1]
            : null;

          if (lastSegment) {
            return moment.tz(`${lastSegment.arriveDate} ${lastSegment.arriveTime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.to || lastSegment.to));
          }
          return moment.tz(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.to));
        })()}
      />

      {/* Conflict Warning Modal */}
      <ConflictModal
        visible={showConflictModal}
        message={conflictMessage}
        onCancel={() => {
          setShowConflictModal(false);
          setPendingUpdateTrips(null);
        }}
        onUpdateAnyway={() => {
          if (pendingUpdateTrips) {
            performPlanUpdate(pendingUpdateTrips);
          }
          setShowConflictModal(false);
          setPendingUpdateTrips(null);
        }}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        visible={showOnboardingModal}
        onSave={handleSaveOnboarding}
        initialBedtime={userSettings?.normalBedtime}
        initialWakeTime={userSettings?.normalWakeTime}
      />
    </View >
  );
}

// ───────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────
const styles: { [key: string]: StyleProp<ViewStyle | TextStyle> } = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  headerContent: { flex: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  editButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  tooltipContainer: {
    position: 'absolute',
    right: 8,
    zIndex: 1000,
  },
  delayTooltipContainer: {
    position: 'absolute',
    right: 8, // Same right anchor, but we shift the arrow
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: '#1E293Bcc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: 190, // Slightly reduced from 200
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipText: {
    fontFamily: 'Jua',
    fontSize: 16, // Matches cardTitle
    color: '#FFFFFF',
    lineHeight: 20, // Increased line height
    textAlign: 'left',
    marginBottom: 4, // Increased spacing
  },
  tooltipSubText: {
    fontFamily: 'Jua',
    fontSize: 13, // Matches cardExpandedLabel
    color: '#CBD5E1',
    lineHeight: 18, // Increased line height
    textAlign: 'left',
    marginBottom: 8,
  },
  tooltipDismissButton: {
    alignSelf: 'center', // Centered
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  tooltipDismissText: {
    fontFamily: 'Jua',
    fontSize: 12,
    color: '#5EDAD9', // Cyan color
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 28,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1E293Bcc',
  },
  planName: { fontFamily: 'Jua', fontSize: 20, color: '#1E293B' },
  subtitle: { fontFamily: 'Jua', fontSize: 14, color: '#64748B', marginTop: 4 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontFamily: 'Jua', fontSize: 16, color: '#64748B', textAlign: 'center' },

  tripNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
  },
  navButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#5EDAD9', borderRadius: 20 },
  navButtonDisabled: { backgroundColor: '#E5E7EB' },
  tripInfo: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  tripTitle: { fontFamily: 'Jua', fontSize: 18, color: '#1E293B' },
  tripSubtitle: { fontFamily: 'Jua', fontSize: 14, color: '#64748B' },

  phaseTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#FFFFFF', gap: 12, justifyContent: 'center' }, // Increased gap and bottom padding
  phaseTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6', // Revert to Light Grey
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    // Remove borders
  },
  phaseTabActive: {
    backgroundColor: '#C7F5E8', // Keep Teal BG
    // Remove border
  },
  phaseTabText: { fontFamily: 'Jua', fontSize: 14, color: '#64748B', marginBottom: 2 },
  phaseTabTextActive: { color: '#0D4C4A', opacity: 1 }, // Force full opacity and Dark Teal
  phaseTabDate: { fontFamily: 'Jua', fontSize: 12, color: '#94A3B8' },
  phaseTabDateActive: { color: '#0D4C4A', opacity: 1 }, // Force full opacity and Dark Teal

  scrollView: { flex: 1 }, // BG color moved to inline style
  sectionHeader: {
    backgroundColor: '#C7F5E8', // Soft Mint (matches active tab)
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionHeaderText: { fontFamily: 'Jua', color: '#0D4C4A', fontSize: 16 },

  cardContainer: { marginTop: 8, marginBottom: 12, paddingHorizontal: 16 },
  card: { borderRadius: 12, padding: 16 },
  cardInfo: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',  // Change to center
    paddingRight: 40
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',  // Change to center
    flex: 1
  },
  cardIcon: {
    marginRight: 10,
    marginTop: 3  // Slightly adjust alignment
  },
  cardHeaderText: {
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center',  // Center content vertically
  },
  cardTitle: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4  // Space between title and time
  },
  cardTime: {
    fontFamily: 'Jua',
    fontSize: 13,  // Slightly smaller
    color: '#E2E8F0',
    lineHeight: 18  // Better spacing for wrapped text
  },
  infoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoButtonText: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#FFFFFF'
  },

  cardExpanded: { marginTop: 12 },
  cardExpandedLabel: { fontFamily: 'Jua', fontSize: 13, color: '#92400E', marginBottom: 2, textTransform: 'uppercase' },
  cardExpandedText: { fontFamily: 'Jua', fontSize: 14, color: '#64748B', marginBottom: 8 },

  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  skipButton: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 8, marginRight: 8 },
  skipButtonText: { fontFamily: 'Jua', color: '#475569' },
  doneButton: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#1E3A5F', borderRadius: 8 },
  doneButtonText: { fontFamily: 'Jua', color: '#FFFFFF' },

  bottomSpacer: { height: 60 },
  // Add these new styles:
  cardFaded: {
    opacity: 0.5,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  statusBadgeDone: {
    backgroundColor: '#10B981',
  },
  statusBadgeSkipped: {
    backgroundColor: '#94A3B8',
  },
  statusBadgeText: {
    fontFamily: 'Jua',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  undoMessage: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  undoMessageText: {
    fontFamily: 'Jua',
    fontSize: 13,
    fontStyle: 'italic',
  },
  resetButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resetButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#FFFFFF',
  },

  // Prepare Phase Date Sub-Tabs (New Refined Design)
  prepareDateTabsContainer: {
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  prepareDateTabsScroll: {
    flexDirection: 'row',
    gap: 12,
  },
  prepareDateTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9', // Revert to Light Gray
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  prepareDateTabActive: {
    backgroundColor: '#C7F5E8', // Teal for active
    borderColor: '#C7F5E8',
  },
  prepareDateTabText: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#64748B', // Revert to Slate for inactive
  },
  prepareDateTabTextActive: {
    color: '#0D4C4A', // Dark Teal text
    fontWeight: '600',
  },

  // Next Phase Button
  nextPhaseButton: {
    backgroundColor: '#1F4259', // Navy
    marginHorizontal: 16, // Match TodayView/View Full Plan padding
    marginTop: 24,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextPhaseButtonText: {
    fontFamily: 'Jua',
    fontSize: 16, // Match View Full Plan text size
    color: '#FFFFFF',
  },
});



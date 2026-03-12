import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'react-native-store-review';
import { usePlans } from '../context/PlanContext';
import { useTheme } from '../context/ThemeContext';
import moment from 'moment-timezone';
import Icon from 'react-native-vector-icons/Feather';
import { ProgressBar } from '../components/ProgressBar';
import { getCityTimezone } from '../utils/jetLagAlgorithm';

function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  return moment(time24, 'HH:mm').format('h:mm A');
}

import ConfettiCannon from 'react-native-confetti-cannon';


export default function TodayView({ navigation }: any) {
  const { plans, isLoading, cardStatuses } = usePlans();
  const { colors } = useTheme();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const confettiRef = React.useRef<ConfettiCannon>(null);


  // Force update every minute to keep countdown fresh
  const [, setTick] = useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Find the closest upcoming trip across all plans
  const now = moment();
  let activePlan: any = null;
  let currentTrip: any = null;
  let flightTrip: any = null;
  let tripIndex: number = 0;

  let smallestTimeDiff = Infinity;

  plans.forEach(plan => {
    plan.trips.forEach((trip: any, idx: number) => {
      const departDate = moment(trip.departDate);

      const lastSegment = trip.segments && trip.segments.length > 0
        ? trip.segments[trip.segments.length - 1]
        : trip;
      const arriveDate = moment(lastSegment.arriveDate);

      const prepareStart = departDate.clone().subtract(2, 'days');
      const adjustEnd = arriveDate.clone().add(2, 'days').endOf('day');

      if (now.isAfter(adjustEnd)) return;

      const isWithinWindow = now.isBetween(prepareStart, adjustEnd, null, '[]');

      if (isWithinWindow) {
        if (departDate.isSameOrBefore(now)) {
          const daysSinceDeparture = now.diff(departDate, 'days');
          const diff = daysSinceDeparture;
          if (diff < smallestTimeDiff) {
            smallestTimeDiff = diff;
            activePlan = plan;
            currentTrip = plan.jetLagPlans[idx];
            flightTrip = trip;
            tripIndex = idx;
          }
        } else {
          const daysUntilDeparture = departDate.diff(now, 'days');
          const diff = daysUntilDeparture + 1000;
          if (diff < smallestTimeDiff) {
            smallestTimeDiff = diff;
            activePlan = plan;
            currentTrip = plan.jetLagPlans[idx];
            flightTrip = trip;
            tripIndex = idx;
          }
        }
      } else if (departDate.isAfter(now)) {
        const daysUntilDeparture = departDate.diff(now, 'days');
        const diff = daysUntilDeparture + 10000;
        if (diff < smallestTimeDiff) {
          smallestTimeDiff = diff;
          activePlan = plan;
          currentTrip = plan.jetLagPlans[idx];
          flightTrip = trip;
          tripIndex = idx;
        }
      }
    });
  });


  // Calculate progress across ALL trips in the active plan (not just the current trip)
  let progressRatio = 0;
  if (activePlan) {
    let allPlanCards: any[] = [];

    activePlan.jetLagPlans.forEach((tripPlan: any) => {
      const includePrepare = tripPlan.strategy !== 'stay_home' && !tripPlan.suppressPreparePhase;
      const includeAdjust = tripPlan.strategy !== 'stay_home' && !tripPlan.suppressAdjustPhase;

      let phasesCards = [...tripPlan.phases.travel.cards];
      if (includePrepare && tripPlan.phases.prepare) {
        phasesCards = [...tripPlan.phases.prepare.cards, ...phasesCards];
      }
      if (includeAdjust && tripPlan.phases.adjust) {
        phasesCards = [...phasesCards, ...tripPlan.phases.adjust.cards];
      }

      allPlanCards = [...allPlanCards, ...phasesCards.filter((c: any) => !c.isInfo)];
    });

    const completedCount = allPlanCards.filter((c: any) => {
      const status = cardStatuses[`${activePlan.id}_${c.id}`];
      return status === 'done' || status === 'skipped';
    }).length;

    progressRatio = allPlanCards.length > 0 ? completedCount / allPlanCards.length : 0;
  }

  // Confetti Trigger Logic
  React.useEffect(() => {
    const checkAndFireConfetti = async () => {
      if (!activePlan || !currentTrip) return;

      const storageKey = `celebrated_completion_${activePlan.id}`;

      if (progressRatio === 1) {
        // Check if already celebrated today
        const hasCelebrated = await AsyncStorage.getItem(storageKey);
        if (!hasCelebrated) {
          // Fire!
          setIsConfettiActive(true);
          setShowCelebrationModal(true);
          // Mark as celebrated
          await AsyncStorage.setItem(storageKey, 'true');
        }
      } else {
        // Reset if progress drops below 100% (allows replay if user undos)
        await AsyncStorage.removeItem(storageKey);
      }
    };

    checkAndFireConfetti();
  }, [progressRatio, activePlan?.id]);

  // Safety trigger for review prompt if progress is >= 50%
  React.useEffect(() => {

    const triggerReviewIfNeeded = async () => {
      if (!activePlan || !currentTrip || isLoading) return;

      const allCards = [
        ...currentTrip.phases.prepare.cards,
        ...currentTrip.phases.travel.cards,
        ...currentTrip.phases.adjust.cards
      ].filter(c => !c.isInfo);

      if (allCards.length === 0) return;

      const completedCount = allCards.filter(c => {
        const status = cardStatuses[`${activePlan.id}_${c.id}`];
        return status === 'done' || status === 'skipped';
      }).length;

      const ratio = completedCount / allCards.length;

      if (ratio >= 0.5) {
        try {
          const storageKey = `review_prompt_shown_${activePlan.id}_trip_${tripIndex}`;
          const hasPrompted = await AsyncStorage.getItem(storageKey);

          if (!hasPrompted) {
            StoreReview.requestReview();
            await AsyncStorage.setItem(storageKey, 'true');
          }
        } catch (error) {
          console.error('Error in TodayView review trigger:', error);
        }
      }
    };

    triggerReviewIfNeeded();
  }, [cardStatuses, activePlan, currentTrip, isLoading]);

  if (!activePlan || !currentTrip) {
    return (
      <View style={[styles.emptyStateContainer, { backgroundColor: colors.bg }]}>
        <View style={styles.emptyStateContent}>
          <Text style={[styles.title, { color: colors.text }]}>No Upcoming Trips</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>Get started by creating your first travel plan!</Text>

          <TouchableOpacity
            style={styles.createFirstPlanButton}
            onPress={() => navigation.navigate('AddPlanName')}
          >
            <Text style={styles.createFirstPlanButtonText}>+ Create New Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewFullDayButton}
            onPress={() => navigation.navigate('Plans')}
          >
            <Text style={styles.viewFullDayText}>Go to Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Determine timezone from city name
  // Determine timezone from relevant cities
  const departureTimezone = flightTrip.fromTz || getCityTimezone(flightTrip.from);
  const destinationTimezone = flightTrip.toTz || getCityTimezone(flightTrip.to);

  const nowInDepartureCity = moment.tz(departureTimezone);
  const nowInDestination = moment.tz(destinationTimezone);

  // Determine "Subjective Today"
  // If we haven't reached the destination yet (or not in adjustment phase), we are on departure city time.
  // Once we land/adjust, we are on destination time.
  // This solves the International Date Line / Midnight flight problem.
  const arrivalDateTime = moment.tz(
    `${flightTrip.arriveDate} ${flightTrip.arriveTime}`,
    'YYYY-MM-DD HH:mm',
    destinationTimezone
  );
  const minutesSinceLanding = nowInDestination.diff(arrivalDateTime, 'minutes');

  const today = minutesSinceLanding > 0
    ? nowInDestination.format('YYYY-MM-DD')
    : nowInDepartureCity.format('YYYY-MM-DD');

  const fromAbbr = moment.tz(departureTimezone).zoneAbbr() || 'LT';
  const toAbbr = moment.tz(destinationTimezone).zoneAbbr() || 'LT';

  const flightDateTime = moment.tz(
    `${currentTrip.departDate} ${flightTrip.departTime}`,
    'YYYY-MM-DD HH:mm',
    departureTimezone
  );

  const hoursUntilFlight = flightDateTime.diff(nowInDepartureCity, 'hours');
  const minutesUntilFlight = flightDateTime.diff(nowInDepartureCity, 'minutes');

  // Recalculate diffs more precisely
  const totalMinutesUntilFlight = flightDateTime.diff(nowInDepartureCity, 'minutes');
  let timeUntilFlightText = '';

  if (minutesSinceLanding > 0) {
    timeUntilFlightText = 'Flight completed';
  } else if (totalMinutesUntilFlight > 1440) {
    const days = Math.floor(totalMinutesUntilFlight / 1440);
    timeUntilFlightText = `Flight leaves in ${days} day${days > 1 ? 's' : ''}`;
  } else if (totalMinutesUntilFlight > 60) {
    const hours = Math.floor(totalMinutesUntilFlight / 60);
    const minutes = totalMinutesUntilFlight % 60;
    timeUntilFlightText = `Flight leaves in ${hours}h ${minutes}m`;
  } else if (totalMinutesUntilFlight > 0) {
    timeUntilFlightText = `Flight leaves in ${totalMinutesUntilFlight} min`;
  } else if (totalMinutesUntilFlight <= 0 && minutesSinceLanding <= 0) {
    if (totalMinutesUntilFlight > -30) {
      timeUntilFlightText = 'Flight departing now';
    } else {
      timeUntilFlightText = 'Flight in progress';
    }
  } else {
    timeUntilFlightText = 'Flight completed';
  }

  let currentPhase: 'prepare' | 'travel' | 'adjust' = 'prepare';
  const todayDate = moment(today);
  const arrivalDateOnly = moment(flightTrip.arriveDate);
  const departureDateOnly = moment(currentTrip.departDate);

  if (todayDate.isSame(departureDateOnly, 'day')) {
    currentPhase = 'travel';
  } else if (todayDate.isBetween(departureDateOnly, arrivalDateOnly, 'day', '()')) {
    currentPhase = 'travel';
  } else if (todayDate.isSame(arrivalDateOnly, 'day') || todayDate.isAfter(arrivalDateOnly, 'day')) {
    currentPhase = 'adjust';
  }

  // FIX: If flight has indeed landed (based on time), force adjust phase.
  // This handles cases where flight arrives on same day as departure (which logic above sets to 'travel')
  if (minutesSinceLanding > 0) {
    currentPhase = 'adjust';
  }

  // FIX #1: Only show flight card if flight is TODAY or in progress (not landed yet)
  const showFlightCard = minutesSinceLanding <= 0 && (currentPhase === 'travel' || (currentPhase === 'prepare' && hoursUntilFlight <= 24));

  // Filter cards to show only upcoming 0-4 hours
  // Include dailyRoutine cards in adjust phase, exclude info cards
  // Exclude skipped or completed cards
  // FIX #2: Helper to get filtered cards from a specific phase
  const getFilteredCardsForPhase = (phaseName: string) => {
    return currentTrip.phases[phaseName].cards.filter((card: any) => {
      // Always exclude info cards (headers, flight info)
      if (card.isInfo) return false;

      // Check status in global context
      const statusKey = `${activePlan.id}_${card.id}`;
      const status = cardStatuses[statusKey];

      // Exclude skipped or completed cards
      if (status === 'skipped' || status === 'done') return false;

      // In adjust phase, include daily routine cards
      // In prepare/travel phases, exclude daily routine cards (they don't have specific times)
      if (phaseName === 'adjust') {
        return true;
      } else {
        return !card.isDailyRoutine;
      }
    });
  };

  // Get cards from current phase
  let allCards = getFilteredCardsForPhase(currentPhase);

  // Also get cards from the NEXT phase to handle boundaries (e.g. Prepare -> Travel)
  let nextPhase: string | null = null;
  if (currentPhase === 'prepare') nextPhase = 'travel';
  else if (currentPhase === 'travel') nextPhase = 'adjust';

  if (nextPhase) {
    const nextCards = getFilteredCardsForPhase(nextPhase);
    allCards = [...allCards, ...nextCards];
  }

  // FIX #2: Use correct timezone based on current phase
  const relevantTimezone = currentPhase === 'adjust' ? destinationTimezone : departureTimezone;
  const nowInRelevantCity = moment.tz(relevantTimezone);

  // Parse card times and filter for 0-4 hours from now
  // Parse card times and filter for 0-4 hours from now


  let upcomingCards: any[] = [];

  if (currentPhase === 'travel') {
    // Special handling for travel phase - show actionable cards (not info cards)
    upcomingCards = allCards
      .filter((card: any) => {
        if (card.isInfo || card.title === 'Your Flight') return false;

        // Filter out stale cards (> 1 hour ago) if they have a time
        if (card.dateTime) {
          const cardTime = moment.tz(card.dateTime, relevantTimezone);
          const minutesFromNow = cardTime.diff(nowInRelevantCity, 'minutes');
          if (minutesFromNow < -60) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (!a.dateTime || !b.dateTime) return 0;
        const timeA = moment.tz(a.dateTime, relevantTimezone);
        const timeB = moment.tz(b.dateTime, relevantTimezone);
        return timeA.diff(timeB);
      })
      .slice(0, 3);

  } else {
    // For prepare/adjust phases:
    // 1. Filter out cards from the past (stale)
    // 2. Show cards in next 4 hours OR next available cards if none in window

    // Sort all cards by time first
    const sortedCards = allCards
      .filter((card: any) => card.dateTime)
      .sort((a: any, b: any) => {
        const timeA = moment.tz(a.dateTime, relevantTimezone);
        const timeB = moment.tz(b.dateTime, relevantTimezone);
        return timeA.diff(timeB);
      });

    upcomingCards = sortedCards.filter((card: any) => {
      const cardTime = moment.tz(card.dateTime, relevantTimezone);
      const minutesFromNow = cardTime.diff(nowInRelevantCity, 'minutes');

      // Filter out stale cards (> 1 hour ago)
      if (minutesFromNow < -60) return false;

      return true;
    });

    // If we have cards in the immediate 0-4 hour window, prefer those
    const immediateCards = upcomingCards.filter((card: any) => {
      const cardTime = moment.tz(card.dateTime, relevantTimezone);
      const minutesFromNow = cardTime.diff(nowInRelevantCity, 'minutes');
      return minutesFromNow <= 240; // 4 hours
    });

    if (immediateCards.length > 0) {
      upcomingCards = immediateCards.slice(0, 3);
    } else {
      // Otherwise show the next 2 upcoming cards (up to 24h away)
      upcomingCards = upcomingCards.filter((card: any) => {
        const cardTime = moment.tz(card.dateTime, relevantTimezone);
        const minutesFromNow = cardTime.diff(nowInRelevantCity, 'minutes');
        return minutesFromNow <= 1440; // 24 hours
      }).slice(0, 2);
    }
  }


  const toggleCard = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  const getCardStyle = (card: any) => {
    const title = card.title.toLowerCase();

    // Priority Cards - CHECK FIRST
    if (title.includes('priority') || title.includes('early bedtime')) {
      return { bg: '#FFE4D6', text: '#9A3412', label: '#EA580C' }; // Pastel Peach (Matches Exhausted Button)
    }

    // Daily Routine card
    if (title.includes('daily routine')) {
      return { bg: '#DBEAFE', text: '#446084', label: '#3567a4' };
    }

    // You've Arrived
    if (title.includes("you've arrived") || title.includes("arrived")) {
      return { bg: '#F1F5F9', text: '#1E293B', label: '#475569' };
    }

    // Sleep / Rest / Nap / Head to Bed - teal theme (but NOT "Avoid Naps")
    if ((title.includes("sleep") || title.includes("rest") || title.includes("nap") || title.includes("head to bed")) && !(title.includes("avoid") && title.includes("nap"))) {
      return { bg: '#1C5D74', text: '#FFFFFF', label: '#c1e0ee' };
    }

    // Caffeine OK - warm brown
    if (title.includes('caffeine ok') || (title.includes('caffeine') && !title.includes('no') && !title.includes('cutoff') && !title.includes('limit') && !title.includes('after'))) {
      return { bg: '#b98b75', text: '#FFFFFF', label: '#6B3B2A' };
    }

    // No Caffeine - light clay/beige
    if (title.includes('no caffeine') || title.includes('cutoff') || title.includes('limit caffeine') || (title.includes('after') && title.includes('caffeine'))) {
      return { bg: '#F3F0ED', text: '#383430', label: '#68615b' };
    }

    // Your Flight
    if (title.includes("your flight")) {
      return { bg: '#DBEAFE', text: '#446084', label: '#3567a4' };
    }

    // Flight segment cards
    if (title.includes("flight from")) {
      return { bg: '#1E3A5F', text: '#FFFFFF', label: '#FFFFFF' };
    }

    // Supplements (Melatonin / Magnesium) — CHECK BEFORE sunlight to avoid false match
    if (title.includes('melatonin') || title.includes('magnesium')) {
      return { bg: '#F3E5F5', text: '#7B1FA2', label: '#9C27B0' };
    }

    // Meals (Dinner / Light Meal) — CHECK BEFORE sunlight to avoid 'light meal' matching sunlight
    if ((title.includes('eat ') || title.startsWith('eat')) || title.includes('dinner') || title.includes('meal')) {
      return { bg: '#E6F5D0', text: '#3E5C41', label: '#3E5C41' };
    }

    // Sunlight / Light (but not "avoid")
    if ((title.includes("sunlight") || title.includes("light") || title.includes("sun")) && !title.includes("avoid")) {
      return { bg: '#FFF7C5', text: '#000000', label: '#F6CB60' };
    }

    // Stay Awake
    if (title.includes("stay awake") || title.includes("awake") || title.includes("start your day")) {
      return { bg: '#FFF7C5', text: '#000000', label: '#F6CB60' };
    }

    // Stay Hydrated
    if (title.includes("hydrate") || title.includes("hydration") || title.includes("hydrating")) {
      return { bg: '#DBEAFE', text: '#446084', label: '#3567a4' };
    }

    // Managing Energy - peachy pastel
    if (title.includes("managing energy") || title.includes("manage energy")) {
      return { bg: '#FFD4C4', text: '#5C3A2E', label: '#8B5A3C' };
    }

    // Avoid / Nap warnings
    if (title.includes('avoid') || title.includes('nap')) {
      return { bg: '#F3F0ED', text: '#383430', label: '#68615b' };
    }

    // Default
    return { bg: '#F1F5F9', text: '#1E293B', label: '#475569' };
  };

  const getCardIconName = (title: string): string => {
    const t = title.toLowerCase();

    // Flight cards - CHECK FIRST before other checks
    if (t.includes('flight from') || t.includes('your flight')) {
      return 'send';
    }

    // Supplements (Melatonin / Magnesium)
    if (t.includes('melatonin') || t.includes('magnesium')) {
      return 'package';
    }

    // Sleep / Rest / Nap
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

    // Sunlight / Light (but check after flight cards)
    if (t.includes('sunlight') || (t.includes('light') && !t.includes('avoid'))) {
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

    // Eat / Dinner
    if (t.includes('eat') || t.includes('dinner') || t.includes('meal')) {
      return 'package';
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
  };

  const connectionText = flightTrip.hasConnections && flightTrip.connections.length > 0
    ? ` (via ${flightTrip.connections.map((c: any) => c.city).join(' & ')})`
    : '';

  // Determine which timezone to show
  let timezoneInfo = '';
  if (currentPhase === 'prepare') {
    timezoneInfo = ` ${flightTrip.from} time (${fromAbbr})`;
  } else if (currentPhase === 'travel') {
    timezoneInfo = ` ${flightTrip.to} time (${toAbbr})`;
  } else if (currentPhase === 'adjust') {
    timezoneInfo = ` ${flightTrip.to} time (${toAbbr})`;
  }

  // LOGIC TO DETERMINE BUTTON ACTION
  const handleViewFullDay = () => {
    if (activePlan) {
      navigation.navigate('TripDetail', {
        plan: activePlan,
        tripIndex: tripIndex
      });
    } else {
      navigation.navigate('AddPlanName');
    }
  };

  // Determine status text based on current phase and flight timing
  let statusText = '';
  if (currentPhase === 'prepare') {
    statusText = `Currently: Preparing for ${currentTrip.to}`;
  } else if (currentPhase === 'travel') {
    if (minutesSinceLanding > 0) {
      // Flight has landed, should be in adjust phase
      statusText = `Currently: Adjusting to ${currentTrip.to}`;
    } else if (minutesUntilFlight > 0) {
      statusText = `Currently: Traveling to ${currentTrip.to}`;
    } else {
      statusText = `Currently: In flight to ${currentTrip.to}`;
    }
  } else if (currentPhase === 'adjust') {
    // Check how long since arrival
    const arrivalDateTime = moment.tz(
      `${flightTrip.arriveDate} ${flightTrip.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      destinationTimezone
    );
    const hoursSinceArrival = nowInRelevantCity.diff(arrivalDateTime, 'hours');

    if (hoursSinceArrival < 0) {
      statusText = `Currently: Traveling to ${currentTrip.to}`;
    } else if (hoursSinceArrival < 72) { // Within 3 days of arrival
      statusText = `Currently: Adjusting to ${currentTrip.to}`;
    } else {
      statusText = ''; // No status text for completed trips
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Top info panel */}
        <View style={styles.topPanel}>
          <Text style={[styles.topPanelDate, { color: colors.text }]}>Today: {(minutesSinceLanding > 0 ? nowInDestination : nowInDepartureCity).format('MMM D, YYYY')}</Text>
          {statusText && <Text style={[styles.topPanelStatus, { color: colors.text }]}>{statusText}</Text>}
          <Text style={[styles.topPanelFlight, { color: colors.text }]}>{timeUntilFlightText}</Text>
        </View>

        {/* Flight info card - ONLY show if flight is today or in progress */}
        {showFlightCard && (
          <View style={[styles.flightCard, { backgroundColor: colors.surface }]}>
            <View style={styles.flightInfo}>
              <Text style={[styles.flightTitle, { color: colors.text }]}>Your Flight</Text>
              <Text style={styles.flightTime}>Departs {formatTo12Hour(flightTrip.departTime)}</Text>
              <Text style={[styles.flightRoute, { color: colors.text }]}>{flightTrip.from} {'>'} {flightTrip.to}{connectionText}</Text>
            </View>
            <Icon name="send" size={24} color={colors.text} />
          </View>
        )}

        {/* Progress Bar - only show if there's an active plan */}
        {activePlan && currentTrip && (
          <View style={{ marginBottom: 24 }}>
            <ProgressBar
              progress={progressRatio}
              label="Plan Progress"
              color="#5EDAD9"
            />
          </View>
        )}

        {/* Coming up label */}
        <Text style={[styles.comingUpLabel, { color: colors.text }]}>Coming up...</Text>

        {/* Action cards - only next 0-4 hours, NO Skip/Done buttons */}
        {upcomingCards.length > 0 ? (
          upcomingCards.map((card: any) => {
            const cardStyle = getCardStyle(card);
            const isExpanded = expandedCardId === card.id;

            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.actionCard, { backgroundColor: cardStyle.bg }]}
                onPress={() => toggleCard(card.id)}
                activeOpacity={0.7}
              >
                {/* Info button - positioned absolutely in top-right */}
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => toggleCard(card.id)}
                >
                  <Icon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={cardStyle.text}
                  />
                </TouchableOpacity>

                {/* Card header - matching TripDetails layout */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Icon
                      name={getCardIconName(card.title)}
                      size={22}
                      color={cardStyle.text}
                      style={styles.cardIconStyle}
                    />
                    <View style={styles.cardTextContainer}>
                      <Text style={[styles.cardTitle, { color: cardStyle.text }]}>
                        {card.title}
                      </Text>
                      <Text style={[styles.cardTime, { color: cardStyle.text }]}>
                        {card.time}
                      </Text>
                    </View>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <Text style={[styles.expandedLabel, { color: cardStyle.label }]}>Why it helps:</Text>
                    <Text style={[styles.expandedText, { color: cardStyle.text }]}>{card.why}</Text>
                    <Text style={[styles.expandedLabel, { color: cardStyle.label }]}>
                      {(card.title.toLowerCase().includes('melatonin') || card.title.toLowerCase().includes('magnesium'))
                        ? 'OPTIONAL GUIDANCE:'
                        : 'How to do it:'}
                    </Text>
                    <Text style={[styles.expandedText, { color: cardStyle.text }]}>{card.how}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={[styles.noActionsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.noActionsText, { color: colors.text }]}>No actions in the next 4 hours</Text>
            <Text style={[styles.noActionsSubtext, { color: colors.subtext }]}>Check back later or view your full plan</Text>
          </View>
        )}

        {/* View Full Plan button - Changes if no active plan */}
        <TouchableOpacity
          style={[
            styles.viewFullDayButton,
            !activePlan && { backgroundColor: '#5EDAD9' } // Use teal if creating new plan
          ]}
          onPress={handleViewFullDay}
        >
          <Text style={[
            styles.viewFullDayText,
            !activePlan && { color: '#0D4C4A' }
          ]}>
            {activePlan ? 'View Full Plan' : '+ Create New Plan'}
          </Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
      <Modal
        visible={showCelebrationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCelebrationModal(false)}
        onShow={() => {
          // Wait for slide animation (approx 500ms) then fire confetti
          setTimeout(() => {
            confettiRef.current?.start();
          }, 200);
        }}
      >
        <View style={styles.modalContainer}>
          <Image
            source={require('../assets/images/Congrats.png')}
            style={styles.modalImage}
            resizeMode="cover"
          />

          {isConfettiActive && (
            <ConfettiCannon
              count={200}
              origin={{ x: -10, y: 0 }}
              autoStart={false}
              ref={confettiRef}
              fadeOut={true}
              fallSpeed={3000}
              colors={['#5EDAD9', '#0D4C4A', '#2C8C8A', '#E0F7FA', '#FFFFFF']}
            />
          )}

          <TouchableOpacity
            style={styles.modalDoneButton}
            onPress={() => {
              setIsConfettiActive(false); // Unmount confetti immediately for smooth exit
              setShowCelebrationModal(false);
            }}
          >
            <Text style={styles.modalDoneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontFamily: 'Jua',
    fontSize: 20,
    color: '#94A3B8',
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 24,
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#64748B',
  },
  topPanel: {
    // Removed background and centering
    marginBottom: 24, // Increased from 8 to 24 for better separation (especially when flight card is missing)
    paddingLeft: 20,
    marginTop: 24,   // Increased from 10 to 24 to move it down further
  },
  topPanelDate: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#000000', // Black
    marginBottom: 8,
  },
  topPanelStatus: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#000000', // Black
    marginBottom: 8,
  },
  topPanelFlight: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#000000', // Black
  },
  flightCard: {
    backgroundColor: '#FFFFFF', // White
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Shadow style matching plan card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // flightIcon removed/unused
  flightInfo: {
    flex: 1,
  },
  flightTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#000000', // Black
    marginBottom: 2,
  },
  flightTime: {
    fontFamily: 'Jua',
    fontSize: 18, // Slightly larger
    color: '#3C82F6', // Blue
    marginBottom: 4,
  },
  flightRoute: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#000000', // Black
  },
  comingUpLabel: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 4,
  },
  actionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 40,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconStyle: {
    marginRight: 10,
    marginTop: 3,
  },
  cardTextContainer: {
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Jua',
    fontSize: 16,
    marginBottom: 4,
  },
  cardTime: {
    fontFamily: 'Jua',
    fontSize: 13,
    lineHeight: 16,
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
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 8,
  },
  expandedLabel: {
    fontFamily: 'Jua',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  expandedText: {
    fontFamily: 'Jua',
    fontSize: 14,
    lineHeight: 16,
    marginBottom: 8,
  },
  noActionsCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  noActionsText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  noActionsSubtext: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#94A3B8',
  },
  viewFullDayButton: {
    backgroundColor: '#1F4259',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  viewFullDayText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#FFFFFF',
  },
  spacer: {
    height: 40,
  },
  emptyStateContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  createFirstPlanButton: {
    backgroundColor: '#5EDAD9',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
    width: '100%',
  },
  createFirstPlanButtonText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#0D4C4A',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  modalDoneButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#1F4259',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '80%',
    zIndex: 100,
  },
  modalDoneButtonText: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#FFFFFF',
  },
});
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { usePlans } from '../context/PlanContext';
import moment from 'moment-timezone';
import Icon from 'react-native-vector-icons/Feather';

function formatTo12Hour(time24: string): string {
  if (!time24) return '';
  return moment(time24, 'HH:mm').format('h:mm A');
}

export default function TodayView({ navigation }: any) {
  const { plans, isLoading, cardStatuses } = usePlans();
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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
      const adjustEnd = arriveDate.clone().add(2, 'days');

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

  if (!activePlan || !currentTrip) {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateContent}>
          <Text style={styles.title}>No Upcoming Trips</Text>
          <Text style={styles.subtitle}>Get started by creating your first travel plan!</Text>

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
  const getTimezone = (city: string) => {
    const timezones: { [key: string]: string } = {
      'San Diego': 'America/Los_Angeles', 'Los Angeles': 'America/Los_Angeles',
      'San Francisco': 'America/Los_Angeles', 'Seattle': 'America/Los_Angeles',
      'Portland': 'America/Los_Angeles', 'Las Vegas': 'America/Los_Angeles',
      'Phoenix': 'America/Phoenix', 'Denver': 'America/Denver',
      'Salt Lake City': 'America/Denver', 'Chicago': 'America/Chicago',
      'Dallas': 'America/Chicago', 'Houston': 'America/Chicago',
      'Austin': 'America/Chicago', 'Minneapolis': 'America/Chicago',
      'New Orleans': 'America/Chicago', 'New York': 'America/New_York',
      'Boston': 'America/New_York', 'Washington': 'America/New_York',
      'Miami': 'America/New_York', 'Atlanta': 'America/New_York',
      'Philadelphia': 'America/New_York', 'Vancouver': 'America/Vancouver',
      'Calgary': 'America/Edmonton', 'Toronto': 'America/Toronto',
      'Montreal': 'America/Montreal', 'Ottawa': 'America/Toronto',
      'London': 'Europe/London', 'Paris': 'Europe/Paris',
      'Tokyo': 'Asia/Tokyo', 'Sydney': 'Australia/Sydney',
      // ... Add more if needed, simplistic lookup for now
      'Mexico City': 'America/Mexico_City',
      'Cancun': 'America/Cancun',
      'Dubai': 'Asia/Dubai',
      'Singapore': 'Asia/Singapore',
    };
    return timezones[city] || 'America/Los_Angeles';
  };

  const getTimezoneAbbr = (city: string) => {
    const abbrs: { [key: string]: string } = {
      'New York': 'ET', 'London': 'GMT', 'Paris': 'CET', 'Tokyo': 'JST',
      'Los Angeles': 'PT', 'San Francisco': 'PT',
    };
    return abbrs[city] || 'LT';
  };

  const today = moment().format('YYYY-MM-DD');
  const departureTimezone = getTimezone(flightTrip.from);
  const destinationTimezone = getTimezone(flightTrip.to);

  const nowInDepartureCity = moment.tz(departureTimezone);
  const flightDateTime = moment.tz(
    `${currentTrip.departDate} ${flightTrip.departTime}`,
    'YYYY-MM-DD HH:mm',
    departureTimezone
  );

  const hoursUntilFlight = flightDateTime.diff(nowInDepartureCity, 'hours');
  const minutesUntilFlight = flightDateTime.diff(nowInDepartureCity, 'minutes');

  const arrivalDateTime = moment.tz(
    `${flightTrip.arriveDate} ${flightTrip.arriveTime}`,
    'YYYY-MM-DD HH:mm',
    destinationTimezone
  );
  const nowInDestination = moment.tz(destinationTimezone);
  const minutesSinceLanding = nowInDestination.diff(arrivalDateTime, 'minutes');

  // Recalculate diffs more precisely
  const totalMinutesUntilFlight = flightDateTime.diff(moment(), 'minutes');
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
  console.log('=== UPCOMING CARDS DEBUG ===');
  console.log('Total cards after filtering:', allCards.length);
  console.log('Current phase:', currentPhase);
  console.log('Relevant timezone:', relevantTimezone);
  console.log('Now in relevant city:', nowInRelevantCity.format('YYYY-MM-DD HH:mm'));

  let upcomingCards: any[] = [];

  if (currentPhase === 'travel') {
    // Special handling for travel phase - show actionable cards (not info cards)
    upcomingCards = allCards
      .filter((card: any) => !card.isInfo && card.title !== 'Your Flight')
      .slice(0, 3);
    console.log('Travel phase: showing', upcomingCards.length, 'actionable travel cards');
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
      // We keep them for 1 hour so the user sees "Sleep ok" for a bit into the sleep, etc.
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

  console.log('Final upcoming cards count:', upcomingCards.length);
  console.log('========================\n');

  const toggleCard = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  const getCardStyle = (card: any) => {
    const title = card.title.toLowerCase();

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

    // Sunlight / Light (but not "avoid")
    if ((title.includes("sunlight") || title.includes("light") || title.includes("sun")) && !title.includes("avoid")) {
      return { bg: '#FFF7C5', text: '#000000', label: '#F6CB60' };
    }

    // Stay Awake
    if (title.includes("stay awake") || title.includes("awake") || title.includes("start your day")) {
      return { bg: '#FFF7C5', text: '#000000', label: '#F6CB60' };
    }

    // Stay Hydrated
    if (title.includes("hydrate") || title.includes("hydration")) {
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
    if (t.includes('hydrate') || t.includes('hydration')) {
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
    timezoneInfo = ` ${flightTrip.from} time (${getTimezoneAbbr(flightTrip.from)})`;
  } else if (currentPhase === 'travel') {
    timezoneInfo = ` ${flightTrip.to} time (${getTimezoneAbbr(flightTrip.to)})`;
  } else if (currentPhase === 'adjust') {
    timezoneInfo = ` ${flightTrip.to} time (${getTimezoneAbbr(flightTrip.to)})`;
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
    <ScrollView style={styles.container}>
      {/* Top info panel */}
      <View style={styles.topPanel}>
        <Text style={styles.topPanelDate}>Today: {moment().format('MMM D, YYYY')}</Text>
        {statusText && <Text style={styles.topPanelStatus}>{statusText}</Text>}
        <Text style={styles.topPanelFlight}>{timeUntilFlightText}</Text>
      </View>

      {/* Flight info card - ONLY show if flight is today or in progress */}
      {showFlightCard && (
        <View style={styles.flightCard}>
          <View style={styles.flightInfo}>
            <Text style={styles.flightTitle}>Your Flight</Text>
            <Text style={styles.flightTime}>Departs {formatTo12Hour(flightTrip.departTime)}</Text>
            <Text style={styles.flightRoute}>{flightTrip.from} {'>'} {flightTrip.to}{connectionText}</Text>
          </View>
          <Icon name="send" size={24} color="#000000" />
        </View>
      )}

      {/* Coming up label */}
      <Text style={styles.comingUpLabel}>Coming up...</Text>

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
        <View style={styles.noActionsCard}>
          <Text style={styles.noActionsText}>No actions in the next 4 hours</Text>
          <Text style={styles.noActionsSubtext}>Check back later or view your full plan</Text>
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
});
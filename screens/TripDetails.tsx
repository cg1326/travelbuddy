import React, { useState } from 'react';
import moment from 'moment';
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
} from 'react-native';
import { usePlans } from '../context/PlanContext';
import { Modal } from 'react-native';

// ───────────────────────────────────────────────
// Interfaces
// ───────────────────────────────────────────────
interface Card {
  id: string;
  title: string;
  time: string;
  icon: string;
  why: string;
  how: string;
  dateTime?: string;
  isInfo?: boolean;
  isDailyRoutine?: boolean;
}



interface Phase {
  name: string;
  dateRange: string;
  cards: Card[];
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
  strategy?: 'stay_home' | 'adjust';
  suppressPreparePhase?: boolean;
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
  segments: any[];
  connections: any[];
  arrivalRestStatus?: 'exhausted' | 'ok';
}

// Helper to determine if we should prompt for exhaustion
const isWithinArrivalWindow = (trip: Trip): boolean => {
  if (!trip) return false;
  // Valid if within 18 hours after landing, or 1 hour before (for early birds/testing)
  const landingTime = moment(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm');
  const now = moment();
  const diffHours = now.diff(landingTime, 'hours', true); // Use float for precision
  return diffHours >= -1 && diffHours < 18;
};

// ───────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────
export default function TripDetail({ route, navigation }: any) {
  const { plan: initialPlan, initialTripIndex, initialPhase } = route.params;
  const { plans, updatePlan, cardStatuses, updateCardStatus, batchUpdateCardStatuses } = usePlans(); // Use global state

  // Get live plan from context to ensure updates (like exhaustion status) reflect immediately
  const plan = plans.find(p => p.id === initialPlan.id) || initialPlan;

  const [currentTripIndex, setCurrentTripIndex] = useState(initialTripIndex || 0);
  const [activePhase, setActivePhase] = useState<'prepare' | 'travel' | 'adjust'>(initialPhase || 'travel');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showExhaustionModal, setShowExhaustionModal] = useState(false);

  // Check for Arrival Check-in (only if landed and within window)
  React.useEffect(() => {
    if (activePhase === 'adjust') {
      const currentTrip = plan.trips[currentTripIndex];
      // Only prompt if status is not set AND we are within the valid window
      if (currentTrip && currentTrip.arrivalRestStatus === undefined && isWithinArrivalWindow(currentTrip)) {
        setShowExhaustionModal(true);
      }
    }
  }, [activePhase, currentTripIndex, plan]);

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

  // OLD: Local state removed

  const handleSkip = (cardId: string) => {
    updateCardStatus(plan.id, cardId, 'skipped');
  };

  const handleDone = (cardId: string) => {
    updateCardStatus(plan.id, cardId, 'done');
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={28} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.planName}>Error loading plan</Text>
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
      return CARD_THEMES.Hydrated;

    // Flight segment cards - CHECK THIS FIRST before "light" check  
    if (t.includes("flight from"))
      return CARD_THEMES.Navy;

    // Sunlight / Light (but not "avoid")
    if ((t.includes("sunlight") || t.includes("light") || t.includes("sun")) &&
      !t.includes("avoid"))
      return CARD_THEMES.Sunlight;

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
      return 'package';  // Food box icon
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
        : `Preparation Phase – ${currentPhase.dateRange}`;
    }
    if (activePhase === 'travel') {
      if (tripPlan.strategy === 'stay_home') {
        // Return a broader range if merged
        // Removed - just use standard Travel Day label
      }
      const isSingleDate = !currentPhase.dateRange.includes('-');
      return `Travel ${isSingleDate ? 'Day' : 'Days'} – ${currentPhase.dateRange}`;
    }
    // Adjust
    return tripPlan.strategy === 'stay_home'
      ? `Trip Schedule – ${currentPhase.dateRange}`
      : `Adjustment Phase – ${currentPhase.dateRange}`;
  };

  // FIX #2: Filter cards based on whether showing arrival day or daily routine
  const getVisibleCards = () => {
    let cards = [];

    if (activePhase !== 'adjust') {
      cards = currentPhase.cards;

      // MERGE LOGIC: If strategy is 'stay_home' and we are looking at 'travel' phase,
      // append the 'adjust' phase cards to the end of the list.
      if (tripPlan.strategy === 'stay_home' && activePhase === 'travel') {
        // Sort travel cards first
        const travelCards = [...cards].sort((a, b) => {
          if (!a.dateTime || !b.dateTime) return 0;
          return moment(a.dateTime).diff(moment(b.dateTime));
        });

        // Get adjust cards (using the same logic as the else block below ideally, but simplified)
        // We can just grab raw cards, but we might want to filter headers?
        // Let's grab raw for now, assuming generateAdjustCards does good work.
        // Actually, let's filter out the "Arrival Day" header if it's redundant with "Travel Day".
        const adjustCards = tripPlan.phases.adjust.cards.filter(c =>
          !c.title.includes('Arrival Day') // Avoid double headers if possible
        ).sort((a, b) => {
          if (!a.dateTime || !b.dateTime) return 0;
          return moment(a.dateTime).diff(moment(b.dateTime));
        });

        return [...travelCards, ...adjustCards];
      }

      return cards.sort((a, b) => {
        if (!a.dateTime || !b.dateTime) return 0;
        return moment(a.dateTime).diff(moment(b.dateTime));
      });
    } else {
      const arrivalDate = moment(trip.arriveDate);
      const adjustCards = currentPhase.cards;

      // 1. You've Arrived Card
      const arrivalCard = adjustCards.find(c =>
        (c.title.toLowerCase().includes("you've arrived") || c.title.toLowerCase().includes("arrived")) &&
        !c.title.includes('Arrival Day') // Exclude header if it matches "arrived"
      );

      const arrivalTime = arrivalCard && arrivalCard.dateTime ? moment(arrivalCard.dateTime) : null;

      // 2. Arrival Day Cards (excluding the arrival card found above)
      const arrivalDayCards = adjustCards.filter(c => {
        if (arrivalCard && c.id === arrivalCard.id) return false;

        // Exclude headers
        if (c.title.includes('Departure Day') ||
          c.title.includes('Arrival Day') ||
          c.title.includes('In Flight')) {
          return false;
        }

        // Exclude daily routine related cards
        if (c.isDailyRoutine) return false;
        if (c.title.includes('Daily Routine') && c.isInfo) return false;

        // Check date - must be on arrival day
        if (c.dateTime) {
          const cardTime = moment(c.dateTime);

          // REMOVED: Strict date check preventing cards from showing if they spill into next day in local time
          // if (!cardTime.isSame(arrivalDate, 'day')) return false;

          // NEW: Filter out cards strictly before arrival time
          // (e.g. don't show "No Caffeine after 2 PM" if we arrived at 3 PM)
          if (arrivalTime && cardTime.isBefore(arrivalTime)) {
            return false;
          }

          return true;
        }
        return false;
      }).sort((a, b) => {
        // SORTING: Chronological only
        // Removed Priority hoisting to allow natural timeline flow (e.g. Meal at 9 PM before Sleep at 10:30 PM)
        if (!a.dateTime || !b.dateTime) return 0;
        return moment(a.dateTime).diff(moment(b.dateTime));
      });

      // 3. Daily Routine Separator
      const separatorCard = adjustCards.find(c => c.title.includes('Daily Routine') && c.isInfo);

      // 4. Daily Routine Cards (The adjust cards from wake time to bedtime)
      const routineCards = adjustCards.filter(c => {
        if (separatorCard && c.id === separatorCard.id) return false;

        // Exclude headers
        if (c.title.includes('Departure Day') ||
          c.title.includes('Arrival Day') ||
          c.title.includes('In Flight')) {
          return false;
        }

        // Include isDailyRoutine cards
        if (c.isDailyRoutine) return true;

        return false;
      }).sort((a, b) => {
        // Sort by time/dateTime
        if (!a.dateTime || !b.dateTime) return 0;
        return moment(a.dateTime).diff(moment(b.dateTime));
      });

      // Assemble final list
      const result = [];
      if (arrivalCard) result.push(arrivalCard);
      result.push(...arrivalDayCards);
      if (separatorCard) result.push(separatorCard);
      result.push(...routineCards);

      return result;
    }
  };


  const visibleCards = getVisibleCards();


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
    <View style={styles.container}>
      {/* ────── Header bar ────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={28} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.subtitle}>{moment(trip.departDate).format('MMM D, YYYY')} Departure</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddTrip', {
            screen: 'AddTrips',
            params: {
              mode: 'edit',
              existingPlan: plan,
              planName: plan.name,
              existingPlanId: plan.id
            }
          })}
        >
          <Icon name="edit-2" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* ────── Trip Navigation Arrows ────── */}
      {plan.trips.length > 1 && (
        <View style={styles.tripNavigation}>
          <TouchableOpacity
            style={[styles.navButton, currentTripIndex === 0 && styles.navButtonDisabled]}
            onPress={goToPreviousTrip}
            disabled={currentTripIndex === 0}>
            <Icon name="arrow-left" size={24} color="#0D4C4A" />
          </TouchableOpacity>

          <View style={styles.tripInfo}>
            <Text style={styles.tripTitle}>{trip.from} {'>'} {trip.to}</Text>
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
      )}

      {/* ────── Phase Tabs (Prepare / Travel / Adjust) ────── */}
      <View style={styles.phaseTabs}>
        {['prepare', 'travel', 'adjust']
          .filter(phaseKey => {
            // For Stay Home trips, hide 'prepare' tab to simplify structure (User feedback)
            if (tripPlan.strategy === 'stay_home' && phaseKey === 'prepare') return false;

            // Hide 'prepare' tab if it overlaps with previous trip's adjust phase
            if (tripPlan.suppressPreparePhase && phaseKey === 'prepare') return false;

            // NEW: For Stay Home trips, ALSO hide 'adjust' tab, because we will merge it into 'travel'
            if (tripPlan.strategy === 'stay_home' && phaseKey === 'adjust') return false;

            return true;
          })
          .map((phaseKey) => {
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

            return (
              <TouchableOpacity
                key={phaseKey}
                style={[styles.phaseTab, activePhase === phaseKey && styles.phaseTabActive]}
                onPress={() => {
                  // For Stay Home trips with only one tab, don't allow switching
                  if (tripPlan.strategy === 'stay_home') return;
                  setActivePhase(phaseKey as any);
                }}
                disabled={tripPlan.strategy === 'stay_home'}>
                <Text
                  style={[
                    styles.phaseTabText,
                    activePhase === phaseKey && styles.phaseTabTextActive,
                  ]}>
                  {label}
                </Text>
                <Text
                  style={[
                    styles.phaseTabDate,
                    activePhase === phaseKey && styles.phaseTabDateActive,
                  ]}>
                  {tripPlan.phases[phaseKey as keyof typeof tripPlan.phases].dateRange}
                </Text>
              </TouchableOpacity>
            )
          })}
      </View>

      {/* ────── Reset Button (for Prepare/Adjust) ────── */}
      {activePhase !== 'travel' && hasAnyStatusChanges && (
        <View style={styles.resetButtonContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
            <Text style={styles.resetButtonText}>
              Reset All Cards ({statusCounts.done} done, {statusCounts.skipped} skipped)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ────── Sticky Section Header (navy bar) ────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{getPhaseHeaderText()}</Text>
      </View>

      {/* ────── Cards Section ────── */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* ────── Reset Button (for Travel Day - after flight card) ────── */}
        {activePhase === 'travel' && hasAnyStatusChanges && (
          <View style={styles.resetButtonContainer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleResetAll}>
              <Text style={styles.resetButtonText}>
                Reset All Cards ({statusCounts.done} done, {statusCounts.skipped} skipped)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Render cards — only one navy header per day */}
        {visibleCards.map((card: Card) => {
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
                        numberOfLines={card.title.includes('→') ? 1 : 2}
                        adjustsFontSizeToFit={card.title.includes('→')}
                        minimumFontScale={0.95}
                      >
                        {card.title}
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
                      WHY THIS HELPS:
                    </Text>
                    <Text style={[styles.cardExpandedText, { color: theme.textColor } as TextStyle]}>
                      {card.why}
                    </Text>

                    <Text style={[styles.cardExpandedLabel, { color: theme.labelColor } as TextStyle]}>
                      {(card.title.toLowerCase().includes('melatonin') || card.title.toLowerCase().includes('magnesium'))
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

                {/* Actions - only show if active */}
                {!card.isInfo && status === 'active' && (
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Exhaustion Check-in Modal */}
      <Modal
        visible={showExhaustionModal}
        transparent={true}
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <Text style={{ fontFamily: 'Jua', fontSize: 24, color: '#0D4C4A', marginBottom: 12, textAlign: 'center' }}>
              Welcome to {plan.trips[currentTripIndex].to}!
            </Text>
            <Text style={{ fontFamily: 'Jua', fontSize: 16, color: '#64748B', marginBottom: 24, textAlign: 'center' }}>
              How are you feeling after your journey? This helps us tailor your recovery plan.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#FFE4D6', // Pastel Peach
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 16,
                marginBottom: 12,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start', // Left align to align icons
                gap: 16, // Increase gap slightly
              }}
              onPress={() => handleUpdateRestStatus('exhausted')}
            >
              <Icon name="battery-charging" size={24} color="#9A3412" />
              <Text style={{ fontFamily: 'Jua', fontSize: 16, color: '#7C2D12', flex: 1 }}>I'm feeling drained and tired</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#D1FAE5', // Pastel Teal
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 16,
                width: '100%',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start', // Left align to align icons
                marginBottom: 16,
                gap: 16,
              }}
              onPress={() => handleUpdateRestStatus('ok')}
            >
              <Icon name="check-circle" size={24} color="#0F766E" />
              <Text style={{ fontFamily: 'Jua', fontSize: 16, color: '#0F766E', flex: 1 }}>I feel reasonably rested</Text>
            </TouchableOpacity>

            {/* "Ask Me Later" Button */}
            <TouchableOpacity
              style={{ padding: 12, alignItems: 'center' }}
              onPress={() => setShowExhaustionModal(false)}
            >
              <Text style={{ fontFamily: 'Jua', fontSize: 14, color: '#94A3B8' }}>Ask me later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: { flex: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  editButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#5EDAD9', borderRadius: 20 },
  navButtonDisabled: { backgroundColor: '#E5E7EB' },
  tripInfo: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  tripTitle: { fontFamily: 'Jua', fontSize: 18, color: '#1E293B' },
  tripSubtitle: { fontFamily: 'Jua', fontSize: 14, color: '#64748B' },

  phaseTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', gap: 8 },
  phaseTab: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  phaseTabActive: { backgroundColor: '#C7F5E8' },
  phaseTabText: { fontFamily: 'Jua', fontSize: 14, color: '#64748B' },
  phaseTabTextActive: { color: '#0D4C4A' },
  phaseTabDate: { fontFamily: 'Jua', fontSize: 12, color: '#94A3B8' },
  phaseTabDateActive: { color: '#0D4C4A' },

  scrollView: { backgroundColor: '#F8FAFC' },
  sectionHeader: {
    backgroundColor: '#1E3A5F', // Navy banner
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionHeaderText: { fontFamily: 'Jua', color: '#FFFFFF', fontSize: 16 },

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

});



import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { usePlans } from '../context/PlanContext';
import { generateJetLagPlan, getDefaultUserSettings, calculateStayDuration, Trip } from '../utils/jetLagAlgorithm';
import { checkForConnectionConflicts } from '../utils/conflictDetection';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Feather';
import ConflictModal from '../components/ConflictModal';

// Local interfaces removed in favor of importing from jetLagAlgorithm
// (or if necessary, keep them matching, but we should use the imported one to avoid issues)

export default function ReviewPlan({ route, navigation }: any) {
  const { planName, trips: initialTrips } = route.params;
  const { addPlan, updatePlan } = usePlans();

  // Local state for trips to handling modifications (preferences)
  const [localTrips, setLocalTrips] = useState<Trip[]>(initialTrips);
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Helper to update a trip's preference
  const updateTripPreference = (tripId: string, preference: 'stay_home' | 'adjust') => {
    setLocalTrips(prevTrips =>
      prevTrips.map(t =>
        t.id === tripId ? { ...t, adjustmentPreference: preference } : t
      )
    );
  };

  const calculateDateRange = (trips: Trip[]): string => {
    if (trips.length === 0) return '';

    const firstTrip = trips[0];
    const lastTrip = trips[trips.length - 1];

    const startDate = moment(firstTrip.departDate);
    const endDate = moment(lastTrip.arriveDate);

    if (startDate.isSame(endDate, 'month')) {
      return `${startDate.format('MMM D')} - ${endDate.format('D, YYYY')}`;
    } else if (startDate.isSame(endDate, 'year')) {
      return `${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}`;
    } else {
      return `${startDate.format('MMM D, YYYY')} - ${endDate.format('MMM D, YYYY')}`;
    }
  };

  const handleSavePlan = async () => {
    console.log('🔍 handleSavePlan called');
    console.log('🔍 localTrips:', localTrips.map(t => `${t.from}→${t.to} (depart: ${t.departDate} ${t.departTime}, arrive: ${t.arriveDate} ${t.arriveTime})`));

    // Check for connection conflicts before saving
    const conflictInfo = checkForConnectionConflicts(localTrips);
    console.log('🔍 conflictInfo:', conflictInfo);

    if (conflictInfo.hasConflict) {
      console.log('⚠️ Connection conflict detected:', conflictInfo.message);
      setShowConflictModal(true);
      return;
    }

    console.log('✅ No conflicts detected, proceeding with save');
    // No conflicts, proceed with save
    await performSave();
  };

  const performSave = async () => {
    try {
      const { mode, existingPlanId } = route.params;

      console.log('🔍 ReviewPlan handleSavePlan');
      console.log('Mode:', mode);
      console.log('Existing Plan ID:', existingPlanId);

      let savedPlan;
      if (mode === 'edit' && existingPlanId) {
        // UPDATE existing plan
        console.log('✏️ Updating existing plan');
        console.log('✏️ Updating existing plan');
        savedPlan = updatePlan(existingPlanId, planName, localTrips);
      } else {
        // CREATE new plan
        console.log('➕ Creating new plan');
        savedPlan = addPlan(planName, localTrips);
      }

      if (savedPlan) {
        // Calculate relevant phase and trip
        const today = moment();
        let targetTripIndex = 0;
        let targetPhase = 'prepare';

        // Iterate through trips to find the current active one
        for (let i = 0; i < savedPlan.trips.length; i++) {
          const trip = savedPlan.trips[i];
          const depart = moment(trip.departDate);
          // Use last segment arrival if available, else trip arrival
          const arriveStr = (trip.segments && trip.segments.length > 0)
            ? trip.segments[trip.segments.length - 1].arriveDate
            : trip.arriveDate;
          const arrive = moment(arriveStr);

          // Period logic
          if (today.isBefore(depart, 'day')) {
            // Future trip. Use this trip, Prepare phase.
            targetTripIndex = i;
            targetPhase = 'prepare';
            break; // Found the next upcoming trip
          } else if (today.isSameOrAfter(depart, 'day') && today.isSameOrBefore(arrive, 'day')) {
            // Currently traveling
            targetTripIndex = i;
            targetPhase = 'travel';
            break;
          } else {
            // After arrival. It's 'adjust' phase. 
            // We continue loop to see if there is a NEXT trip that is upcoming.
            // But if this is the last trip, or we are in the adjust window, we settle here.
            // User asked: "if after adjust phase, go to adjust phase".
            targetTripIndex = i;
            targetPhase = 'adjust';
            // Don't break yet, check if next trip is actually active/start soon?
            // Simple logic for now: if we are in the adjust window (say 4 days), stay here.
            // Otherwise see if next trip starts.
            // For simplicity per user request: "if adjust phase is over... landing page would still be adjust phase".
            // So we basically keep overwriting targetTripIndex as we go forward in time.
          }
        }

        navigation.reset({
          index: 1,
          routes: [
            { name: 'MainTabs', params: { screen: 'Plans' } }, // Go to tabs first
            {
              name: 'TripDetail',
              params: {
                plan: savedPlan,
                initialTripIndex: targetTripIndex,
                initialPhase: targetPhase
              }
            }
          ],
        });
      } else {
        // Fallback if save failed to return plan
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs', params: { screen: 'Plans' } }],
        });
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert('Error', 'Failed to save plan');
    }
  };

  const handleCancelConflict = () => {
    setShowConflictModal(false);
  };

  const handleUpdateAnyway = async () => {
    setShowConflictModal(false);
    await performSave();
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Review Your Plan</Text>
        <Text style={styles.subtitle}>"{planName}"</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trips in this plan:</Text>
          {localTrips.map((trip: Trip, index: number) => {
            // Calculate stay duration to determine if we show the option
            const nextTrip = localTrips[index + 1];
            const stayDuration = calculateStayDuration(trip, nextTrip);
            const isShortTrip = stayDuration < 3;

            // Detect if this is a round trip (A→B→A) vs a layover (A→B→C)
            // Only show preference for round trips, not layovers
            const isRoundTrip = nextTrip && trip.to === nextTrip.from && trip.from === nextTrip.to;
            const shouldShowPreference = isShortTrip && isRoundTrip;

            return (
              <View key={trip.id} style={styles.tripCard}>
                <Text style={styles.tripNumber}>Trip {index + 1}</Text>
                <Text style={styles.tripRoute}>
                  {trip.from} {'>'} {trip.to}
                </Text>
                <Text style={styles.tripDetail}>
                  Departs: {moment(trip.departDate).format('MMM D, YYYY')} at {moment(trip.departTime, 'HH:mm').format('h:mm A')}
                </Text>
                <Text style={styles.tripDetail}>
                  Arrives: {moment(trip.arriveDate).format('MMM D, YYYY')} at {moment(trip.arriveTime, 'HH:mm').format('h:mm A')}
                </Text>
                {trip.hasConnections && trip.segments && (
                  <Text style={styles.tripDetail}>
                    {trip.segments.length} segment(s) with layovers
                  </Text>
                )}

                {/* Conditional Adjustment Preference for Short Round Trips */}
                {shouldShowPreference && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Icon name="clock" size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: '#64748B', fontFamily: 'Jua' }}>
                        Short Trip detected ({Math.round(stayDuration)} days). Strategy:
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: (trip.adjustmentPreference === 'stay_home' || !trip.adjustmentPreference) ? '#E0F2FE' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: (trip.adjustmentPreference === 'stay_home' || !trip.adjustmentPreference) ? '#0EA5E9' : '#E2E8F0',
                          alignItems: 'center'
                        }}
                        onPress={() => updateTripPreference(trip.id, 'stay_home')}
                      >
                        <Text style={{
                          fontFamily: 'Jua',
                          fontSize: 13,
                          color: (trip.adjustmentPreference === 'stay_home' || !trip.adjustmentPreference) ? '#0284C7' : '#64748B'
                        }}>
                          Stay on Origin Time
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: trip.adjustmentPreference === 'adjust' ? '#F0FDF4' : '#F8FAFC',
                          borderWidth: 1,
                          borderColor: trip.adjustmentPreference === 'adjust' ? '#22C55E' : '#E2E8F0',
                          alignItems: 'center'
                        }}
                        onPress={() => updateTripPreference(trip.id, 'adjust')}
                      >
                        <Text style={{
                          fontFamily: 'Jua',
                          fontSize: 13,
                          color: trip.adjustmentPreference === 'adjust' ? '#16A34A' : '#64748B'
                        }}>
                          Adjust Fully
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your personalized plan will be generated based on:
          </Text>
          <Text style={styles.infoItem}>• Flight times and layovers</Text>
          <Text style={styles.infoItem}>• Timezone differences</Text>
          <Text style={styles.infoItem}>• Travel direction (east vs west)</Text>
          <Text style={styles.infoItem}>• Your sleep preferences</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSavePlan}>
          <Text style={styles.saveButtonText}>
            {route.params?.mode === 'edit' ? 'Update Plan' : 'Save Plan'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Edit</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      <ConflictModal
        visible={showConflictModal}
        onCancel={handleCancelConflict}
        onUpdateAnyway={handleUpdateAnyway}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 28,
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#64748B',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 12,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tripNumber: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  tripRoute: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 8,
  },
  tripDetail: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoItem: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 18,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  backButtonText: {
    fontFamily: 'Jua',
    color: '#64748B',
    fontSize: 16,
  },
  spacer: {
    height: 40,
  },
});
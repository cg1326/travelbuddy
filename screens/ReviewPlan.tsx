import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { usePlans } from '../context/PlanContext';
import { generateJetLagPlan, getDefaultUserSettings } from '../utils/jetLagAlgorithm';
import moment from 'moment';

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
  connections: any[];
}

export default function ReviewPlan({ route, navigation }: any) {
  const { planName, trips } = route.params;
  const { addPlan, updatePlan } = usePlans();

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
    try {
      const { mode, existingPlanId } = route.params;

      console.log('🔍 ReviewPlan handleSavePlan');
      console.log('Mode:', mode);
      console.log('Existing Plan ID:', existingPlanId);

      if (mode === 'edit' && existingPlanId) {
        // UPDATE existing plan
        console.log('✏️ Updating existing plan');
        updatePlan(existingPlanId, planName, trips);
      } else {
        // CREATE new plan
        console.log('➕ Creating new plan');
        addPlan(planName, trips);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Plans' } }],
      });
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert('Error', 'Failed to save plan');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Review Your Plan</Text>
      <Text style={styles.subtitle}>"{planName}"</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trips in this plan:</Text>
        {trips.map((trip: Trip, index: number) => (
          <View key={trip.id} style={styles.tripCard}>
            <Text style={styles.tripNumber}>Trip {index + 1}</Text>
            <Text style={styles.tripRoute}>
              {trip.from} → {trip.to}
            </Text>
            <Text style={styles.tripDetail}>
              Departs: {trip.departDate} at {trip.departTime}
            </Text>
            <Text style={styles.tripDetail}>
              Arrives: {trip.arriveDate} at {trip.arriveTime}
            </Text>
            {trip.hasConnections && trip.segments && (
              <Text style={styles.tripDetail}>
                {trip.segments.length} segment(s) with layovers
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Your personalized jet lag plan will be generated based on:
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
        <Text style={styles.backButtonText}>← Back to Edit</Text>
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
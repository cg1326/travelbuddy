import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import moment from 'moment';


interface Plan {
  id: string;
  name: string;
  dateRange: string;
  active: boolean;
  tripPlans: any[];
}

export default function PlansScreen({ navigation }: any) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPastPlans, setShowPastPlans] = useState(false);

  const loadPlans = async () => {
    try {
      const plansJson = await AsyncStorage.getItem('plans');
      if (plansJson) {
        const loadedPlans = JSON.parse(plansJson);
        console.log('Loaded plans:', loadedPlans); // Debug log
        setPlans(loadedPlans);
      } else {
        setPlans([]);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load plans');
    }
  };

  const categorizePlans = () => {
    const today = moment().format('YYYY-MM-DD');

    const upcoming = plans.filter(plan => {
      if (!plan.tripPlans || plan.tripPlans.length === 0) return false;
      // Assuming tripPlans have trips with arriveDate
      // You may need to adjust this based on your data structure
      const lastTrip = plan.tripPlans[plan.tripPlans.length - 1];
      const trips = lastTrip.trips || [];
      if (trips.length === 0) return false;
      const finalTrip = trips[trips.length - 1];
      return moment(finalTrip.arriveDate).isSameOrAfter(today, 'day');
    });

    const past = plans.filter(plan => {
      if (!plan.tripPlans || plan.tripPlans.length === 0) return false;
      const lastTrip = plan.tripPlans[plan.tripPlans.length - 1];
      const trips = lastTrip.trips || [];
      if (trips.length === 0) return false;
      const finalTrip = trips[trips.length - 1];
      return moment(finalTrip.arriveDate).isBefore(today, 'day');
    });

    return { upcoming, past };
  };

  // At the top of PlansScreen component, replace the useFocusEffect with:
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPlans();
    });

    return unsubscribe;
  }, [navigation]);

  const handleDeletePlan = async (planId: string) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedPlans = plans.filter(p => p.id !== planId);
              await AsyncStorage.setItem('plans', JSON.stringify(updatedPlans));
              setPlans(updatedPlans);
            } catch (error) {
              console.error('Error deleting plan:', error);
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  const handleOpenPlan = (plan: Plan) => {
    navigation.navigate('TripDetail', { plan });
  };

  const { upcoming, past } = categorizePlans();

  return (
    <View style={styles.container}>
      {/* FIXED HEADER - stays at top when scrolling */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Plans</Text>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No plans yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first jet lag optimization plan
            </Text>
          </View>
        ) : (
          <>
            {/* Upcoming Plans Section */}
            {upcoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming Plans ({upcoming.length})</Text>
                {upcoming.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.planCard}
                    onPress={() => handleOpenPlan(plan)}
                  >
                    <View style={styles.planCardContent}>
                      <View style={styles.planCardHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        {plan.active && (
                          <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planDateRange}>{plan.dateRange}</Text>
                      <Text style={styles.planTrips}>
                        {plan.tripPlans?.length || 0} trip{plan.tripPlans?.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan.id);
                      }}
                    >
                      <Icon name="x" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Past Plans Section */}
            {past.length > 0 && (
              <>
                <TouchableOpacity
                  style={styles.pastPlansToggle}
                  onPress={() => setShowPastPlans(!showPastPlans)}
                >
                  <Text style={styles.pastPlansToggleText}>
                    Past Plans ({past.length})
                  </Text>
                  <Icon
                    name={showPastPlans ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>

                {showPastPlans && past.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planCard, styles.pastPlanCard]}
                    onPress={() => handleOpenPlan(plan)}
                  >
                    <View style={styles.planCardContent}>
                      <View style={styles.planCardHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                      </View>
                      <Text style={styles.planDateRange}>{plan.dateRange}</Text>
                      <Text style={styles.planTrips}>
                        {plan.tripPlans?.length || 0} trip{plan.tripPlans?.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan.id);
                      }}
                    >
                      <Icon name="x" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPlanName')}
      >
        <Text style={styles.addButtonText}>+ Create New Plan</Text>
      </TouchableOpacity>

      {/* Debug button - remove after testing */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={async () => {
          const plansJson = await AsyncStorage.getItem('plans');
          console.log('Raw plans data:', plansJson);
          Alert.alert('Debug', `Plans in storage: ${plansJson ? JSON.parse(plansJson).length : 0}`);
        }}
      >
        <Text style={styles.debugButtonText}>Debug: Check Storage</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#F8FAFC',
    paddingTop: 76,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 28,
    color: '#1E293B',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#64748B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  planCardContent: {
    flex: 1,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: '#C7F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontFamily: 'Jua',
    fontSize: 12,
    color: '#0D4C4A',
  },
  planDateRange: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  planTrips: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#1F4259',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 18,
  },
  debugButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 100, // Above tab bar
  },
  debugButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 20,
  },

  sectionTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 12,
    marginTop: 8,
  },
  pastPlansToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pastPlansToggleText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#64748B',
  },
  pastPlanCard: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },

});
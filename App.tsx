import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { PlanProvider, usePlans } from './context/PlanContext';
import AddPlanName from './screens/AddPlanName';
import AddTrips from './screens/AddTrips';
import ReviewPlan from './screens/ReviewPlan';
import TodayView from './screens/TodayView';
import ProfileSettings from './screens/ProfileSettings';
import TripDetail from './screens/TripDetails';
import moment from 'moment';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import Icon from 'react-native-vector-icons/Feather';
import { startPersistentNotificationUpdater } from './utils/notificationScheduler';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();



function TodayScreen({ navigation }: any) {
  return <TodayView navigation={navigation} />;
}

function PlansScreen({ navigation }: any) {
  const { plans, isLoading, deletePlan, getActivePlan } = usePlans();
  const activePlan = getActivePlan();
  const [showPastPlans, setShowPastPlans] = React.useState(false);

  const categorizePlans = () => {
    const today = moment().format('YYYY-MM-DD');

    const upcoming = plans.filter(plan => {
      if (!plan.trips || plan.trips.length === 0) return false;
      const lastTrip = plan.trips[plan.trips.length - 1];
      // Keep plan active until 1 day after arrival to include the shortened adjustment phase
      const planEndDate = moment(lastTrip.arriveDate).add(1, 'days');
      return planEndDate.isSameOrAfter(today, 'day');
    }).sort((a, b) => {
      // Sort active plan to top
      const isActiveA = activePlan?.id === a.id;
      const isActiveB = activePlan?.id === b.id;
      if (isActiveA && !isActiveB) return -1;
      if (!isActiveA && isActiveB) return 1;
      return 0;
    });

    const past = plans.filter(plan => {
      if (!plan.trips || plan.trips.length === 0) return false;
      const lastTrip = plan.trips[plan.trips.length - 1];
      // Move to past only after adjustment phase (arrival + 1 day) is complete
      const planEndDate = moment(lastTrip.arriveDate).add(1, 'days');
      return planEndDate.isBefore(today, 'day');
    });

    return { upcoming, past };
  };

  const { upcoming, past } = categorizePlans();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.plansTitle}>Your Plans</Text>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <Text style={styles.emptyText}>No plans yet. Create your first one!</Text>
        ) : (
          <>
            {/* Upcoming Plans Section */}
            {upcoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming Plans ({upcoming.length})</Text>
                {upcoming.map(plan => {
                  const isActive = activePlan?.id === plan.id;
                  const firstTrip = plan.trips && plan.trips.length > 0 ? plan.trips[0] : null;
                  const departDate = firstTrip?.departDate || '';

                  return (
                    <View key={plan.id} style={{ marginBottom: 12 }}>
                      <TouchableOpacity
                        style={[
                          styles.planCard,
                          isActive && styles.planCardActive
                        ]}
                        onPress={() => {
                          navigation.navigate('TripDetail', { plan: plan });
                        }}
                      >
                        <View style={styles.planCardContent}>
                          <View style={styles.planCardLeft}>
                            <Text style={styles.planCardTitle}>{plan.name}</Text>
                            <Text style={styles.planCardSubtitle}>
                              {plan.trips?.length || 0} trip{(plan.trips?.length || 0) !== 1 ? 's' : ''}
                            </Text>
                            {departDate ? (
                              <Text style={styles.planCardDate}>
                                Departs {moment(departDate).format('MMM D')}
                              </Text>
                            ) : null}
                            {isActive && (
                              <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>Active</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                navigation.navigate('AddPlanName', {
                                  mode: 'edit',
                                  existingPlan: plan
                                });
                              }}
                            >
                              <Icon name="edit-2" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                deletePlan(plan.id);
                              }}
                              style={styles.planDeleteButton}
                            >
                              <Icon name="x" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
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

                {showPastPlans && past.map(plan => {
                  const firstTrip = plan.trips && plan.trips.length > 0 ? plan.trips[0] : null;
                  const departDate = firstTrip?.departDate || '';

                  return (
                    <View key={plan.id} style={{ marginBottom: 12 }}>
                      <TouchableOpacity
                        style={[styles.planCard, styles.pastPlanCard]}
                        onPress={() => {
                          navigation.navigate('TripDetail', { plan: plan });
                        }}
                      >
                        <View style={styles.planCardContent}>
                          <View style={styles.planCardLeft}>
                            <Text style={styles.planCardTitle}>{plan.name}</Text>
                            <Text style={styles.planCardSubtitle}>
                              {plan.trips?.length || 0} trip{(plan.trips?.length || 0) !== 1 ? 's' : ''}
                            </Text>
                            {departDate ? (
                              <Text style={styles.planCardDate}>
                                Departed {moment(departDate).format('MMM D')}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                navigation.navigate('AddPlanName', {
                                  mode: 'edit',
                                  existingPlan: plan
                                });
                              }}
                            >
                              <Icon name="edit-2" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                deletePlan(plan.id);
                              }}
                              style={styles.planDeleteButton}
                            >
                              <Icon name="x" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.createPlanButton}
        onPress={() => navigation.navigate('AddPlanName')}
      >
        <Text style={styles.createPlanButtonText}>+ Create New Plan</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileScreen() {
  return <ProfileSettings />;
}

function NotificationUpdater() {
  const { plans } = usePlans();

  useEffect(() => {
    startPersistentNotificationUpdater(plans);
  }, [plans]);

  return null;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 90,
        },
        tabBarActiveTintColor: '#5EDAD9',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: 'Jua',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="home" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="calendar" size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="user" size={26} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Handle notification taps
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        // Navigate to Today tab when notification is tapped
        if (navigationRef.current) {
          navigationRef.current.navigate('MainTabs', { screen: 'Today' });
        }
      }
    });

    // Handle background notification taps (when app is in background)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        // Background notification tap will open app to Today tab
        // This is handled by the initial route when app opens
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <PlanProvider>
      <NotificationUpdater />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddPlanName"
            component={AddPlanName}
            options={{
              title: 'Create Plan',
              headerBackTitle: 'Back',
              headerBackVisible: true,
              headerTitleStyle: {
                fontFamily: 'Jua',
                fontSize: 18,
              },
              headerBackTitleStyle: {
                fontFamily: 'Jua',
              },
            }}
          />
          <Stack.Screen
            name="AddTrips"
            component={AddTrips}
            options={{
              title: 'Add Trips',
              headerBackTitle: 'Back',
              headerBackVisible: true,
              headerTitleStyle: {
                fontFamily: 'Jua',
                fontSize: 18,
              },
              headerBackTitleStyle: {
                fontFamily: 'Jua',
              },
            }}
          />
          <Stack.Screen
            name="ReviewPlan"
            component={ReviewPlan}
            options={{
              title: 'Review Plan',
              headerBackTitle: 'Back',
              headerBackVisible: true,
              headerTitleStyle: {
                fontFamily: 'Jua',
                fontSize: 18,
              },
              headerBackTitleStyle: {
                fontFamily: 'Jua',
              },
            }}
          />
          <Stack.Screen
            name="TripDetail"
            component={TripDetail}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PlanProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingTop: 76,
  },
  plansTitle: {
    fontFamily: 'Jua',
    fontSize: 28,
    color: '#1E293B',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 24,
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 40,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  planCardActive: {
    backgroundColor: '#C7F5E8',
    borderWidth: 2,
    borderColor: '#5EDAD9',
  },
  planCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planCardLeft: {
    flex: 1,
  },
  planCardTitle: {
    fontFamily: 'Jua',
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 4,
  },
  planCardSubtitle: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  planCardDate: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
  },
  activeBadge: {
    backgroundColor: '#5EDAD9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  activeBadgeText: {
    fontFamily: 'Jua',
    fontSize: 12,
    color: '#0D4C4A',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5EDAD9',
    borderRadius: 20,
  },
  planDeleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPlanButton: {
    backgroundColor: '#1F4259',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createPlanButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
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
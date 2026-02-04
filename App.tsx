import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, SafeAreaView, StatusBar, ImageBackground } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlanProvider, usePlans } from './context/PlanContext';
import AddPlanName from './screens/AddPlanName';
import AddTrips from './screens/AddTrips';
import ReviewPlan from './screens/ReviewPlan';
import TodayView from './screens/TodayView';
import ProfileSettings from './screens/ProfileSettings';
import TripDetail from './screens/TripDetails';
import IntroCards from './screens/IntroCards'; // <--- NEW IMPORT
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- NEW IMPORT
import moment from 'moment';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import Icon from 'react-native-vector-icons/Feather';
import { startPersistentNotificationUpdater } from './utils/notificationScheduler';
import { Analytics } from './utils/Analytics';


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
      // Keep plan active until 2 days after arrival to include the shortened adjustment phase
      const planEndDate = moment(lastTrip.arriveDate).add(2, 'days');
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
      // Move to past only after adjustment phase (arrival + 2 days) is complete
      const planEndDate = moment(lastTrip.arriveDate).add(2, 'days');
      return planEndDate.isBefore(today, 'day');
    });

    return { upcoming, past };
  };

  const { upcoming, past } = categorizePlans();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.plansTitle}>Your Plans</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={plans.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : {}}
        showsVerticalScrollIndicator={false}
      >
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
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.planCardTitle}>{plan.name}</Text>
                              {isActive && (
                                <View style={styles.activeBadge}>
                                  <Text style={styles.activeBadgeText}>Active</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.planCardSubtitle}>
                              {plan.trips?.length || 0} trip{(plan.trips?.length || 0) !== 1 ? 's' : ''}
                            </Text>
                            {departDate ? (
                              <Text style={styles.planCardDate}>
                                Departs {moment(departDate).format('MMM D')}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
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
                              <Icon name="edit" size={20} color="#00DDD9" />
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
            {
              past.length > 0 && (
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
                      <View key={plan.id} style={{ marginBottom: 4 }}>
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
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
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
                                <Icon name="edit" size={20} color="#00DDD9" />
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
              )
            }
          </>
        )
        }
      </ScrollView >

      <TouchableOpacity
        style={styles.createPlanButton}
        onPress={() => navigation.navigate('AddPlanName')}
      >
        <Text style={styles.createPlanButtonText}>+ Create New Plan</Text>
      </TouchableOpacity>
    </View >
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


function SplashScreen() {
  return (
    <>
      <StatusBar hidden />
      <ImageBackground
        source={require('./assets/launchmodal.png')}
        style={styles.splashContainer}
        resizeMode="cover"
      />
    </>
  );
}

function MainApp() {
  const { isLoading, plans } = usePlans();
  const plansRef = useRef(plans);
  plansRef.current = plans; // Keep ref updated

  const [isSplashMinTimeElapsed, setSplashMinTimeElapsed] = React.useState(false);
  const [isSplashMaxTimeElapsed, setSplashMaxTimeElapsed] = React.useState(false);
  const [hasSeenIntro, setHasSeenIntro] = React.useState<boolean | null>(null);
  const navigationRef = useRef<any>(null);

  // <--- NEW: CHECK INTRO STATUS
  useEffect(() => {
    checkIntroStatus();
  }, []);

  const checkIntroStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('@travelbuddy_has_seen_intro');
      setHasSeenIntro(value === 'true');
    } catch (e) {
      console.error('Error checking intro status', e);
      setHasSeenIntro(false);
    }
  };

  const handleFinishIntro = async () => {
    try {
      await AsyncStorage.setItem('@travelbuddy_has_seen_intro', 'true');
      setHasSeenIntro(true);
      // Log Onboarding Complete
      Analytics.logOnboardingComplete(0);
    } catch (e) {
      console.error('Error saving intro status', e);
    }
  };

  useEffect(() => {
    const minTimer = setTimeout(() => {
      setSplashMinTimeElapsed(true);
    }, 2000);

    const maxTimer = setTimeout(() => {
      setSplashMaxTimeElapsed(true);
    }, 2500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    // Handle notification taps (Foreground)
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        handleNotificationNavigation(detail.notification);
      }
    });

    // Handle background notification taps (Cold Start or Background)
    notifee.getInitialNotification().then(initialNotification => {
      if (initialNotification?.notification?.data) {
        console.log('🚀 App opened via Notification:', initialNotification.notification.data);
        // We need to wait for plans to load before navigating.
        // We can store the pending notification in a ref/state and handle it once isLoading is false.
        setPendingNotification(initialNotification.notification);
      }
    });

    // Handle background event (e.g. user taps notification while app is in background but suspended)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification) {
        // This usually just brings app to foreground, and getInitialNotification or onForeground might pick it up?
        // Actually, onBackgroundEvent is for headless tasks.
        // For UI interaction, getInitialNotification covers the "tap to open" case.
        // However, listener setup is required.
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Effect to process pending notification once plans are loaded
  const [pendingNotification, setPendingNotification] = React.useState<any>(null);
  useEffect(() => {
    if (!isLoading && plans.length > 0 && pendingNotification && navigationRef.current) {
      handleNotificationNavigation(pendingNotification);
      setPendingNotification(null); // Clear after handling
    }
  }, [isLoading, plans, pendingNotification]);

  const handleNotificationNavigation = (notification: any) => {
    if (!navigationRef.current) {
      console.warn('Navigation ref not ready, skipping notification navigation');
      return;
    }

    const { planName, phase } = notification.data || {};
    console.log('[App] Notification Tapped. Data:', notification.data);

    if (planName) {
      // Use ref to avoid stale closure in listener
      const currentPlans = plansRef.current;
      const targetPlan = currentPlans.find(p => p.name === planName);
      console.log('[App] Target Plan Found?', targetPlan ? 'YES' : 'NO');

      if (targetPlan) {
        navigationRef.current.navigate('TripDetail', {
          plan: targetPlan,
          initialPhase: phase || 'today' // Use specific phase if provided, else default
        });
      } else {
        navigationRef.current.navigate('MainTabs', { screen: 'Today' });
      }
    } else {
      navigationRef.current.navigate('MainTabs', { screen: 'Today' });
    }
  };

  // Show splash if:
  // 1. Min time (2s) hasn't passed yet
  // OR
  // 2. Data is still loading AND Max time (3s) hasn't passed yet
  // This ensures at least 2s of splash, and at most 3s of splash (even if slow data)
  const showSplash = !isSplashMinTimeElapsed || (isLoading && !isSplashMaxTimeElapsed);


  if (showSplash || hasSeenIntro === null) {
    return <SplashScreen />;
  }

  return (
    <>
      <NotificationUpdater />
      <NavigationContainer
        ref={navigationRef}
        onStateChange={(state) => {
          const currentRouteName = state?.routes[state.index].name;
          if (currentRouteName) {
            Analytics.logScreenView(currentRouteName);
          }
        }}
      >
        <Stack.Navigator initialRouteName={!hasSeenIntro ? "IntroCards" : "MainTabs"}>
          {/* ... */}
          <Stack.Screen
            name="IntroCards"
            options={{ headerShown: false }}
          >
            {(props) => <IntroCards {...props} onFinish={handleFinishIntro} />}
          </Stack.Screen>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddPlanName"
            component={AddPlanName}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddTrips"
            component={AddTrips}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ReviewPlan"
            component={ReviewPlan}
            options={{ headerShown: false }}
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
    </>
  );
}

export default function App() {
  return (
    <PlanProvider>
      <MainApp />
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
    color: '#000000', // Black
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
    marginBottom: 4, // Reduced spacing further
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardActive: {
    backgroundColor: '#C7F5E8',
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
    color: '#000000', // Black
    marginBottom: 4,
    marginRight: 8,
  },
  planCardSubtitle: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#000000', // Black
    marginBottom: 2,
  },
  planCardDate: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#000000', // Black
  },
  activeBadge: {
    backgroundColor: '#5EDAD9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    // alignSelf handled by parent flex row
    marginBottom: 4,
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
    backgroundColor: 'transparent', // No background
    // borderRadius: 20,
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
  splashContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
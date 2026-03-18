import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
  Image,
  Dimensions,
  Modal,
  Animated,
  Easing,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePlans } from '../context/PlanContext';
import { useTheme } from '../context/ThemeContext';
import {
  getNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
  scheduleNotificationsForPlan,
  startPersistentNotificationUpdater,
  stopPersistentNotification
} from '../utils/notificationScheduler';
import PreferenceProfile from './PreferenceProfile';
import PostTripFeedback from './PostTripFeedback';
import { PREFERENCE_STORAGE_KEYS } from '../utils/preferenceEngine'; // TEMPORARY TEST

export default function ProfileSettings() {
  const { userSettings, updateUserSettings, plans } = usePlans();
  const { colors, isDark, timeBasedNightMode, setNightMode } = useTheme();

  // Helper function to convert 24-hour to 12-hour format
  const format12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const [bedtime, setBedtime] = useState(userSettings.normalBedtime);
  const [wakeTime, setWakeTime] = useState(userSettings.normalWakeTime);
  const [useMelatonin, setUseMelatonin] = useState(userSettings.useMelatonin);
  const [useMagnesium, setUseMagnesium] = useState(userSettings.useMagnesium);

  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [selectedBedtime, setSelectedBedtime] = useState(new Date());
  const [selectedWakeTime, setSelectedWakeTime] = useState(new Date());

  // About Us Modal State
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Preference Profile Modal State
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);



  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    enabled: true,
  });

  // Load notification settings on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await getNotificationSettings();
      setNotifSettings(settings);
    }
    loadSettings();
  }, []);

  // Animation ref
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  // Shake animation on first visit
  useEffect(() => {
    const runShakeAnimation = async () => {
      try {
        const hasShaken = await AsyncStorage.getItem('profile_icon_shaken');
        if (!hasShaken) {
          // Delay slightly so user sees it
          setTimeout(() => {
            Animated.sequence([
              Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
              Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            ]).start();
            AsyncStorage.setItem('profile_icon_shaken', 'true');
          }, 500);
        }
      } catch (e) {
        console.error("Failed to run animation logic", e);
      }
    };
    runShakeAnimation();
  }, []);

  const spin = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg']
  });

  // Initialize time pickers
  useEffect(() => {
    const [bedHour, bedMin] = bedtime.split(':').map(Number);
    const bedDate = new Date();
    bedDate.setHours(bedHour, bedMin);
    setSelectedBedtime(bedDate);

    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(wakeHour, wakeMin);
    setSelectedWakeTime(wakeDate);
  }, [bedtime, wakeTime]);

  const onBedtimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') setShowBedtimePicker(false);
    if (time) {
      setSelectedBedtime(time);
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      const newBedtime = `${hours}:${minutes}`;
      setBedtime(newBedtime);

      // Auto-save immediately
      updateUserSettings({
        normalBedtime: newBedtime,
        normalWakeTime: wakeTime,
        useMelatonin,
        useMagnesium,
      });
    }
  };

  const onWakeTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') setShowWakeTimePicker(false);
    if (time) {
      setSelectedWakeTime(time);
      const hours = String(time.getHours()).padStart(2, '0');
      const minutes = String(time.getMinutes()).padStart(2, '0');
      const newWakeTime = `${hours}:${minutes}`;
      setWakeTime(newWakeTime);

      // Auto-save immediately
      updateUserSettings({
        normalBedtime: bedtime,
        normalWakeTime: newWakeTime,
        useMelatonin,
        useMagnesium,
      });
    }
  };

  // Update notification setting
  const updateNotifSetting = async (enabled: boolean) => {
    const updated = { enabled };
    setNotifSettings(updated);
    await saveNotificationSettings(updated);

    if (enabled) {
      // Start the persistent notification updater
      await startPersistentNotificationUpdater(plans);
    } else {
      await stopPersistentNotification();
    }
  };

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Your Profile</Text>
        <TouchableOpacity onPress={() => setShowAboutModal(true)}>
          <Animated.Image
            source={require('../assets/images/planeicon.png')}
            style={{
              width: 40,
              height: 40,
              resizeMode: 'contain',
              transform: [{ rotate: spin }]
            }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>



        {/* Sleep Schedule Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sleep Schedule</Text>

          <Text style={[styles.label, { color: colors.subtext }]}>Normal Bedtime</Text>
          <View style={[styles.timeDisplay, { borderColor: colors.border }]}>
            <Text style={[styles.timeText, { color: colors.text }]}>{format12Hour(bedtime)}</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBedtimePicker(!showBedtimePicker)}
            >
              <Text style={styles.selectButtonText}>
                {showBedtimePicker ? "Done" : "Select"}
              </Text>
            </TouchableOpacity>
          </View>
          {showBedtimePicker && (
            <DateTimePicker
              value={selectedBedtime}
              mode="time"
              display="spinner"
              onChange={onBedtimeChange}
              textColor={isDark ? "white" : "black"}
              themeVariant={isDark ? "dark" : "light"}
            />
          )}

          <Text style={[styles.label, { color: colors.subtext }]}>Normal Wake Time</Text>
          <View style={[styles.timeDisplay, { borderColor: colors.border }]}>
            <Text style={[styles.timeText, { color: colors.text }]}>{format12Hour(wakeTime)}</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowWakeTimePicker(!showWakeTimePicker)}
            >
              <Text style={styles.selectButtonText}>
                {showWakeTimePicker ? "Done" : "Select"}
              </Text>
            </TouchableOpacity>
          </View>
          {showWakeTimePicker && (
            <DateTimePicker
              value={selectedWakeTime}
              mode="time"
              display="spinner"
              onChange={onWakeTimeChange}
              textColor={isDark ? "white" : "black"}
              themeVariant={isDark ? "dark" : "light"}
            />
          )}
        </View>

        {/* Supplements Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Supplements</Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Consult with a healthcare provider before taking supplements
            </Text>
          </View>




          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Melatonin</Text>
              <Text style={[styles.settingSubtext, { color: colors.subtext }]}>Include in recommendations</Text>
            </View>
            <Switch
              value={useMelatonin}
              onValueChange={(val) => {
                setUseMelatonin(val);
                updateUserSettings({
                  normalBedtime: bedtime,
                  normalWakeTime: wakeTime,
                  useMelatonin: val,
                  useMagnesium,
                });
              }}
              trackColor={{ false: '#D1D5DB', true: '#5EDAD9' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Magnesium</Text>
              <Text style={[styles.settingSubtext, { color: colors.subtext }]}>Include in recommendations</Text>
            </View>
            <Switch
              value={useMagnesium}
              onValueChange={(val) => {
                setUseMagnesium(val);
                updateUserSettings({
                  normalBedtime: bedtime,
                  normalWakeTime: wakeTime,
                  useMelatonin,
                  useMagnesium: val,
                });
              }}
              trackColor={{ false: '#D1D5DB', true: '#5EDAD9' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Notifications</Text>
              <Text style={[styles.settingSubtext, { color: colors.subtext }]}>
                Get reminders before each action
              </Text>
            </View>
            <Switch
              value={notifSettings.enabled}
              onValueChange={updateNotifSetting}
              trackColor={{ false: '#D1D5DB', true: '#5EDAD9' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Display Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Display</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Time-Based Night Mode</Text>
              <Text style={[styles.settingSubtext, { color: colors.subtext }]}>
                Darkens the app at night based on your destination's local time
              </Text>
            </View>
            <Switch
              value={timeBasedNightMode}
              onValueChange={(val) => {
                setNightMode(val);
              }}
              trackColor={{ false: '#D1D5DB', true: '#5EDAD9' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personalization</Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowPreferenceModal(true)}
          >
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>My Travel Style</Text>
              <Text style={[styles.settingSubtext, { color: colors.subtext }]}>
                View and manage how travel buddy adapts to you
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>

        {/* General Disclaimer */}
        <View style={[styles.disclaimerContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.disclaimerText, { color: colors.subtext }]}>
            This app provides general travel and lifestyle guidance and does not offer medical advice. Always consult a qualified healthcare professional regarding supplements, sleep concerns, or health-related questions.
          </Text>
        </View>

        {/* Attribution / Credits */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontFamily: 'Jua', fontSize: 12, color: '#94A3B8' }}>
            Flight data provided by AeroDataBox
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
      {/* Removed premature closing View tag */}

      {/* About Us Modal */}
      <Modal
        visible={showAboutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAboutModal(false)}
            >
              <Icon name="x" size={24} color="#1E293B" />
            </TouchableOpacity>

            <Image
              source={require('../assets/images/About Us.png')}
              style={styles.aboutImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>

      {/* Preference Profile Modal */}
      <Modal
        visible={showPreferenceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreferenceModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}>
            <TouchableOpacity onPress={() => setShowPreferenceModal(false)}>
              <Text style={{ fontSize: 16, fontFamily: 'Jua', color: colors.text }}>Done</Text>
            </TouchableOpacity>
          </View>
          <PreferenceProfile />
        </SafeAreaView>
      </Modal>



    </View >
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  header: {
    paddingTop: 76,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 28,
    color: '#1E293B',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: 'Jua',
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  timeText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#1E293B',
  },
  selectButton: {
    backgroundColor: '#5EDAD9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#0D4C4A',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#92400E',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 2,
  },
  settingSubtext: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#94A3B8',
  },
  spacer: {
    height: 40,
  },
  disclaimerText: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    marginTop: 8,
    lineHeight: 18,
    textAlign: 'left',
  },
  disclaimerContainer: {
    backgroundColor: '#F1F5F9', // Subtle gray
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    marginHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.8,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  aboutImage: {
    width: '100%',
    flex: 1, // Use flex instead of 100% height to properly respect margins/padding without overflow
    marginTop: 20,
  },
});
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePlans } from '../context/PlanContext';
import {
  getNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
  scheduleNotificationsForPlan,
  startPersistentNotificationUpdater,
  stopPersistentNotification
} from '../utils/notificationScheduler';

export default function ProfileSettings() {
  const { userSettings, updateUserSettings, plans } = usePlans();

  // Helper function to convert 24-hour to 12-hour format
  const format12Hour = (time24: string): string => {
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
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Profile</Text>
        <TouchableOpacity onPress={() => setShowAboutModal(true)}>
          <Image
            source={require('../assets/images/iconplane.png')}
            style={{ width: 40, height: 40, resizeMode: 'contain' }}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>



        {/* Sleep Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Schedule</Text>

          <Text style={styles.label}>Normal Bedtime</Text>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{format12Hour(bedtime)}</Text>
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
              textColor="black"
              themeVariant="light"
            />
          )}

          <Text style={styles.label}>Normal Wake Time</Text>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{format12Hour(wakeTime)}</Text>
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
              textColor="black"
              themeVariant="light"
            />
          )}
        </View>

        {/* Supplements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplements</Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Consult with a healthcare provider before taking supplements
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Melatonin</Text>
              <Text style={styles.settingSubtext}>Include in recommendations</Text>
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
              <Text style={styles.settingLabel}>Magnesium</Text>
              <Text style={styles.settingSubtext}>Include in recommendations</Text>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingSubtext}>
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

        {/* General Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
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
    </View >
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#F8FAFC',
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
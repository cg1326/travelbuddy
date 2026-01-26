import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Feather';

interface QuickDelayModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyDelay: (minutes: number) => void;
    scheduledArriveTime: moment.Moment;
}

export default function QuickDelayModal({
    visible,
    onClose,
    onApplyDelay,
    scheduledArriveTime,
}: QuickDelayModalProps) {
    const [showPicker, setShowPicker] = useState(false);
    // Default picker to scheduled time or current time? Scheduled makes most sense as base.
    const [tempDate, setTempDate] = useState<Date>(scheduledArriveTime.toDate());

    const handleQuickOption = (minutes: number) => {
        onApplyDelay(minutes);
        onClose();
    };

    const handleCustomTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }
        if (selectedDate) {
            setTempDate(selectedDate);
        }
    };

    const applyCustomTime = () => {
        // Force "Wall Clock" math. 
        // We want the difference between the face of the clock on the picker 
        // and the face of the clock on the scheduled arrival.

        // 1. Get Scheduled Time as simple string (in its home timezone)
        const originalStr = scheduledArriveTime.format('YYYY-MM-DD HH:mm');
        const originalWallClock = moment(originalStr, 'YYYY-MM-DD HH:mm'); // Local mode moment

        // 2. Get Picker Time as simple string (it's already local Date)
        const newTimeStr = moment(tempDate).format('YYYY-MM-DD HH:mm');
        const newWallClock = moment(newTimeStr, 'YYYY-MM-DD HH:mm'); // Local mode moment

        const diffMinutes = newWallClock.diff(originalWallClock, 'minutes');

        console.log('[QuickDelay] applyCustomTime debug:');
        console.log('  Original (Wall):', originalStr);
        console.log('  New (Wall):', newTimeStr);
        console.log('  Diff minutes:', diffMinutes);

        onApplyDelay(diffMinutes);
        onClose();
        setShowPicker(false);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Flight Delayed?</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="x" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Quickly adjust your arrival time. This will shift your entire schedule.
                    </Text>

                    <View style={styles.optionsGrid}>
                        <TouchableOpacity style={styles.optionButton} onPress={() => handleQuickOption(15)}>
                            <Text style={styles.optionText}>+15 min</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionButton} onPress={() => handleQuickOption(30)}>
                            <Text style={styles.optionText}>+30 min</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionButton} onPress={() => handleQuickOption(60)}>
                            <Text style={styles.optionText}>+1 hour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionButton} onPress={() => handleQuickOption(120)}>
                            <Text style={styles.optionText}>+2 hours</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.customButton}
                        onPress={() => {
                            setTempDate(scheduledArriveTime.toDate()); // Reset to current schedule on open
                            setShowPicker(true);
                        }}
                    >
                        <Text style={styles.customButtonText}>Set Custom Arrival Time</Text>
                        <Icon name="chevron-right" size={20} color="#1E293B" />
                    </TouchableOpacity>

                    {/* Inline picker for iOS, Modal for Android logic handled by conditional render/state if needed, 
                but here we just show/hide based on showPicker state which works for both if managed right.
                For iOS usually displayed inline or in a separate view.
            */}
                    {showPicker && (
                        <View style={styles.pickerContainer}>
                            {/* iOS Picker / Android Trigger */}
                            <DateTimePicker
                                value={tempDate}
                                mode="time" // Or datetime? Likely just time needed but if delay crosses midnight... datetime is safer.
                                // Actually, if delay is huge (days), we need date.
                                // "Quick Delay" usually assumes same day or next day connection.
                                // Let's use 'datetime' to be safe.
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleCustomTimeChange}
                                themeVariant="light" // Force light theme for consistency
                            />

                            {Platform.OS === 'ios' && (
                                <TouchableOpacity style={styles.applyButton} onPress={applyCustomTime}>
                                    <Text style={styles.applyButtonText}>Confirm New Time</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 340,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontFamily: 'Jua',
        fontSize: 22,
        color: '#1E293B',
    },
    subtitle: {
        fontFamily: 'Jua',
        fontSize: 14,
        color: '#64748B',
        marginBottom: 20,
        lineHeight: 20,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16,
    },
    optionButton: {
        flex: 1,
        minWidth: '40%',
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    optionText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#334155',
    },
    customButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    customButtonText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#1E293B',
    },
    pickerContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    applyButton: {
        marginTop: 12,
        backgroundColor: '#5EDAD9',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    applyButtonText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#0F766E',
    },
});

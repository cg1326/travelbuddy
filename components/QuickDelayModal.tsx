import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

interface TripSegment {
    from: string;
    to: string;
    departDate: string;
    departTime: string;
    arriveDate: string;
    arriveTime: string;
}

interface QuickDelayModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyDelay: (minutes: number, segmentIndex?: number, updateDeparture?: boolean) => void;
    scheduledArriveTime: moment.Moment;
    segments?: TripSegment[];
}

export default function QuickDelayModal({
    visible,
    onClose,
    onApplyDelay,
    scheduledArriveTime,
    segments,
}: QuickDelayModalProps) {
    const { colors, isDark } = useTheme();

    // FIX 1: Wall Clock Helper
    // Initialize picker with "Wall Clock" time of the destination, not absolute timestamp.
    const getWallClockDate = (m: moment.Moment) => {
        return new Date(
            m.year(),
            m.month(),
            m.date(),
            m.hour(),
            m.minute()
        );
    };

    const [showPicker, setShowPicker] = useState(false);
    // Initialize with Wall Clock time
    const [tempDate, setTempDate] = useState<Date>(getWallClockDate(scheduledArriveTime));
    const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

    const isMultiLeg = segments && segments.length > 1;
    const showSegmentSelection = isMultiLeg && selectedSegmentIndex === null;

    // FIX 2: Multi-Segment Helper
    // Get the "Scheduled Time" of the *currently selected segment* (or final if none)
    const getActiveScheduledTime = () => {
        if (selectedSegmentIndex !== null && segments && segments[selectedSegmentIndex]) {
            const seg = segments[selectedSegmentIndex];
            // Construct moment from segment strings (these are already local)
            return moment(`${seg.arriveDate} ${seg.arriveTime}`, 'YYYY-MM-DD HH:mm');
        }
        return scheduledArriveTime;
    };

    // Reset selection when modal closes
    React.useEffect(() => {
        if (!visible) {
            setSelectedSegmentIndex(null);
            setShowPicker(false);
            setTempDate(getWallClockDate(scheduledArriveTime));
        }
    }, [visible, scheduledArriveTime]);

    // Update picker baseline when a segment is selected
    React.useEffect(() => {
        if (selectedSegmentIndex !== null) {
            const activeTime = getActiveScheduledTime();
            setTempDate(getWallClockDate(activeTime));
        }
    }, [selectedSegmentIndex]);

    const handleQuickOption = (minutes: number) => {
        onApplyDelay(minutes, selectedSegmentIndex ?? undefined, true);
        onClose();
        setSelectedSegmentIndex(null);
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

        // 1. Get Scheduled Time of the TARGET SEGMENT
        const activeScheduledTime = getActiveScheduledTime();
        const originalStr = activeScheduledTime.format('YYYY-MM-DD HH:mm');
        const originalWallClock = moment(originalStr, 'YYYY-MM-DD HH:mm'); // Local mode moment

        // 2. Get Picker Time as simple string (it's already local Date)
        let newTimeStr = moment(tempDate).format('YYYY-MM-DD HH:mm');
        let newWallClock = moment(newTimeStr, 'YYYY-MM-DD HH:mm'); // Local mode moment

        // AUTOMATIC OVERNIGHT DETECTION
        // If the user selects a time that is "earlier" than the original scheduled time 
        // We need to decide if they mean "earlier today" or "wrapping to tomorrow (late delay)".
        if (newWallClock.isBefore(originalWallClock)) {
            const diffHours = originalWallClock.diff(newWallClock, 'hours', true);

            // Heuristic: If the time went back by more than 12 hours (e.g. 23:00 -> 01:00 is -22h), 
            // assume it's a date boundary crossing (Next Day).
            // If it's a small change (e.g. 12:30 -> 11:56 is -0.5h), assume it's just an early arrival (Same Day).
            if (diffHours > 12) {
                console.log('[QuickDelay] Large negative diff (>12h). Assuming next day.');
                newWallClock.add(1, 'day');
                newTimeStr = newWallClock.format('YYYY-MM-DD HH:mm');
            } else {
                console.log('[QuickDelay] Small negative diff. Keeping same day (early arrival).');
            }
        }


        const diffMinutes = newWallClock.diff(originalWallClock, 'minutes');

        console.log('[QuickDelay] applyCustomTime debug:');
        console.log('  Original (Wall):', originalStr);
        console.log('  New (Wall):', newTimeStr);
        console.log('  Diff minutes:', diffMinutes);

        onApplyDelay(diffMinutes, selectedSegmentIndex ?? undefined, false);
        onClose();
        setShowPicker(false);
        setSelectedSegmentIndex(null);
    };

    const handleClose = () => {
        onClose();
        setSelectedSegmentIndex(null);
        setShowPicker(false);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {selectedSegmentIndex !== null && isMultiLeg && (
                                <TouchableOpacity onPress={() => setSelectedSegmentIndex(null)} style={{ marginRight: 10 }}>
                                    <Icon name="arrow-left" size={24} color={colors.text} />
                                </TouchableOpacity>
                            )}
                            <Text style={[styles.title, { color: colors.text }]}>Flight Delayed?</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose}>
                            <Icon name="x" size={24} color={colors.subtext} />
                        </TouchableOpacity>
                    </View>


                    {showSegmentSelection ? (
                        <>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                Pick a flight to adjust:
                            </Text>

                            <ScrollView style={styles.segmentList} showsVerticalScrollIndicator={false}>
                                {segments!.map((segment, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.segmentButton, { backgroundColor: isDark ? colors.bg : '#F8FAFC', borderColor: colors.border }]}
                                        onPress={() => setSelectedSegmentIndex(index)}
                                    >
                                        <View style={[styles.segmentIcon, { backgroundColor: isDark ? '#115E59' : '#E0F7F6' }]}>
                                            <Icon name="send" size={18} color="#5EDAD9" />
                                        </View>
                                        <View style={styles.segmentInfo}>
                                            <Text style={[styles.segmentRoute, { color: colors.text }]}>
                                                {segment.from} {'>'} {segment.to}
                                            </Text>
                                            <Text style={[styles.segmentTime, { color: colors.subtext }]}>
                                                Departs: {moment(`${segment.departDate} ${segment.departTime}`, 'YYYY-MM-DD HH:mm').format('MMM D, h:mm A')}
                                            </Text>
                                        </View>
                                        <Icon name="chevron-right" size={20} color={colors.subtext} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.subtitle, { color: colors.subtext }]}>
                                {isMultiLeg
                                    ? `Adjust arrival time for ${segments![selectedSegmentIndex!].from} > ${segments![selectedSegmentIndex!].to}`
                                    : 'Quickly adjust your arrival time. This will shift your entire schedule.'}
                            </Text>

                            <View style={styles.optionsGrid}>
                                <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDark ? colors.bg : '#F1F5F9' }]} onPress={() => handleQuickOption(15)}>
                                    <Text style={[styles.optionText, { color: colors.text }]}>+15 min</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDark ? colors.bg : '#F1F5F9' }]} onPress={() => handleQuickOption(30)}>
                                    <Text style={[styles.optionText, { color: colors.text }]}>+30 min</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDark ? colors.bg : '#F1F5F9' }]} onPress={() => handleQuickOption(60)}>
                                    <Text style={[styles.optionText, { color: colors.text }]}>+1 hour</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDark ? colors.bg : '#F1F5F9' }]} onPress={() => handleQuickOption(120)}>
                                    <Text style={[styles.optionText, { color: colors.text }]}>+2 hours</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.customButton, { borderTopColor: colors.border }]}
                                onPress={() => {
                                    if (!showPicker) {
                                        // Reset to current scheduled time (of the active segment) when opening
                                        const activeTime = getActiveScheduledTime();
                                        setTempDate(getWallClockDate(activeTime));
                                    }
                                    setShowPicker(!showPicker);
                                }}
                            >
                                <Text style={[styles.customButtonText, { color: colors.text }]}>Set custom arrival time</Text>
                                <Icon name="chevron-right" size={20} color={colors.text} />
                            </TouchableOpacity>

                            {showPicker && (
                                <View style={styles.pickerContainer}>
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleCustomTimeChange}
                                        themeVariant={isDark ? "dark" : "light"}
                                    />

                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity style={styles.applyButton} onPress={applyCustomTime}>
                                            <Text style={styles.applyButtonText}>Confirm New Time</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
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
    segmentList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    segmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    segmentIcon: {
        backgroundColor: '#E0F7F6',
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    segmentInfo: {
        flex: 1,
    },
    segmentRoute: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#1E293B',
        marginBottom: 4,
    },
    segmentTime: {
        fontFamily: 'Jua',
        fontSize: 14,
        color: '#64748B',
    },
});

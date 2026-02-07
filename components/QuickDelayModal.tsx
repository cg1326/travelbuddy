import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Feather';

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
    onApplyDelay: (minutes: number, segmentIndex?: number) => void;
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
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(scheduledArriveTime.toDate());
    const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

    const isMultiLeg = segments && segments.length > 1;
    const showSegmentSelection = isMultiLeg && selectedSegmentIndex === null;

    const handleQuickOption = (minutes: number) => {
        onApplyDelay(minutes, selectedSegmentIndex ?? undefined);
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

        // 1. Get Scheduled Time as simple string (in its home timezone)
        const originalStr = scheduledArriveTime.format('YYYY-MM-DD HH:mm');
        const originalWallClock = moment(originalStr, 'YYYY-MM-DD HH:mm'); // Local mode moment

        // 2. Get Picker Time as simple string (it's already local Date)
        let newTimeStr = moment(tempDate).format('YYYY-MM-DD HH:mm');
        let newWallClock = moment(newTimeStr, 'YYYY-MM-DD HH:mm'); // Local mode moment

        // AUTOMATIC OVERNIGHT DETECTION
        // If the user selects a time that is "earlier" than the original scheduled time 
        // (e.g. Org: 2pm, Sel: 1am), we assume it means the NEXT day (1am tomorrow).
        // Since the picker defaults to the same date, a simple isBefore check works.
        if (newWallClock.isBefore(originalWallClock)) {
            console.log('[QuickDelay] Selected time is before original. Assuming next day.');
            newWallClock.add(1, 'day');
            newTimeStr = newWallClock.format('YYYY-MM-DD HH:mm');
        }


        const diffMinutes = newWallClock.diff(originalWallClock, 'minutes');

        console.log('[QuickDelay] applyCustomTime debug:');
        console.log('  Original (Wall):', originalStr);
        console.log('  New (Wall):', newTimeStr);
        console.log('  Diff minutes:', diffMinutes);

        onApplyDelay(diffMinutes, selectedSegmentIndex ?? undefined);
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


                    {showSegmentSelection ? (
                        <>
                            <Text style={styles.subtitle}>
                                Which flight is delayed?
                            </Text>

                            <ScrollView style={styles.segmentList} showsVerticalScrollIndicator={false}>
                                {segments!.map((segment, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.segmentButton}
                                        onPress={() => setSelectedSegmentIndex(index)}
                                    >
                                        <View style={styles.segmentIcon}>
                                            <Icon name="send" size={18} color="#5EDAD9" />
                                        </View>
                                        <View style={styles.segmentInfo}>
                                            <Text style={styles.segmentRoute}>
                                                {segment.from} → {segment.to}
                                            </Text>
                                            <Text style={styles.segmentTime}>
                                                Departs: {moment(`${segment.departDate} ${segment.departTime}`, 'YYYY-MM-DD HH:mm').format('MMM D, h:mm A')}
                                            </Text>
                                        </View>
                                        <Icon name="chevron-right" size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    ) : (
                        <>
                            <Text style={styles.subtitle}>
                                {isMultiLeg
                                    ? `Adjust arrival time for ${segments![selectedSegmentIndex!].from} → ${segments![selectedSegmentIndex!].to}`
                                    : 'Quickly adjust your arrival time. This will shift your entire schedule.'}
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
                                    if (!showPicker) {
                                        setTempDate(scheduledArriveTime.toDate());
                                    }
                                    setShowPicker(!showPicker);
                                }}
                            >
                                <Text style={styles.customButtonText}>Set custom arrival time</Text>
                                <Icon name="chevron-right" size={20} color="#1E293B" />
                            </TouchableOpacity>

                            {showPicker && (
                                <View style={styles.pickerContainer}>
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleCustomTimeChange}
                                        themeVariant="light"
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

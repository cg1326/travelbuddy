import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';

interface OnboardingModalProps {
    visible: boolean;
    onSave: (bedtime: string, wakeTime: string) => void;
    initialBedtime?: string;
    initialWakeTime?: string;
}

export default function OnboardingModal({ visible, onSave, initialBedtime = '23:00', initialWakeTime = '07:00' }: OnboardingModalProps) {
    const { colors, isDark } = useTheme();
    const [step, setStep] = useState<'bedtime' | 'waketime'>('bedtime');
    const [bedtime, setBedtime] = useState(new Date(`2000-01-01T${initialBedtime}:00`));
    const [wakeTime, setWakeTime] = useState(new Date(`2000-01-01T${initialWakeTime}:00`));

    React.useEffect(() => {
        console.log('OnboardingModal mounted. Visible:', visible, 'Step:', step);
    }, [visible, step]);

    const handleNext = () => {
        if (step === 'bedtime') {
            setStep('waketime');
        } else {
            onSave(
                moment(bedtime).format('HH:mm'),
                moment(wakeTime).format('HH:mm')
            );
        }
    };

    const handleBack = () => {
        if (step === 'waketime') {
            setStep('bedtime');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Sleep Schedule</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>
                        {step === 'bedtime'
                            ? 'To generate your plan, we need to know your normal sleep schedule.\n\nFirst, when do you usually go to sleep at home?'
                            : 'Great! And when do you usually wake up at home?'}
                    </Text>

                    {/* Combined Input Area - Conditional Rendering */}
                    <View style={styles.inputContainer}>
                        {step === 'bedtime' ? (
                            <DateTimePicker
                                value={bedtime}
                                mode="time"
                                display="spinner"
                                onChange={(event, date) => date && setBedtime(date)}
                                textColor={isDark ? "white" : "#000000"}
                                style={styles.timePicker}
                                themeVariant={isDark ? "dark" : "light"}
                            />
                        ) : (
                            <DateTimePicker
                                value={wakeTime}
                                mode="time"
                                display="spinner"
                                onChange={(event, date) => date && setWakeTime(date)}
                                textColor={isDark ? "white" : "#000000"}
                                style={styles.timePicker}
                                themeVariant={isDark ? "dark" : "light"}
                            />
                        )}
                    </View>

                    <View style={styles.buttonRow}>
                        {step === 'waketime' && (
                            <TouchableOpacity style={[styles.backButton, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} onPress={handleBack}>
                                <Text style={[styles.backButtonText, { color: isDark ? '#F1F5F9' : '#475569' }]}>Back</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.primaryButton, step === 'bedtime' && { width: '100%' }, isDark && { backgroundColor: '#38BDF8' }]} onPress={handleNext}>
                            <Text style={[styles.primaryButtonText, isDark && { color: '#0F172A' }]}>
                                {step === 'bedtime' ? 'Next' : 'Save & Continue'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    title: {
        fontFamily: 'Jua',
        fontSize: 24,
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 32, // Increased spacing
        alignItems: 'center',
    },
    timePicker: {
        height: 120,
        width: '100%',
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 12, // Reduced gap to give buttons more width
    },
    primaryButton: {
        backgroundColor: '#1F4259',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8, // Drastically reduced from 24 to 8 to prevent text wrap
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontFamily: 'Jua',
        color: '#FFFFFF',
        fontSize: 14,
    },
    backButton: {
        backgroundColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8, // Reduced to match
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        fontFamily: 'Jua',
        color: '#475569',
        fontSize: 16, // Reduced from 18 to 16 for consistency
    },
});

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { usePlans } from '../context/PlanContext';
import { useTheme } from '../context/ThemeContext';
import type { OutcomeRating } from '../types/models';

interface Props {
    planId: string;
    tripIndex: number;
    testPlanId?: string;
    isVisible: boolean;
    onClose: () => void;
}

export default function PostTripFeedback({ planId, tripIndex, testPlanId, isVisible, onClose }: Props) {
    const { submitOutcomeRating, plans } = usePlans();
    const { colors, isDark } = useTheme();
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;

    const handleSubmit = async () => {
        if (selectedDay === null) return;
        const rating: OutcomeRating = {
            planId: testPlanId || planId, // Use override ID if provided for testing
            tripIndex: tripIndex,
            adjustmentDays: selectedDay,
            timestamp: new Date().toISOString()
        };
        await submitOutcomeRating(rating);
        onClose();
    };

    return (
        <Modal visible={isVisible} animationType="slide" presentationStyle="formSheet">
            <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
                <View style={styles.container}>
                    <View style={styles.mainContent}>
                        <Text style={[styles.title, { color: colors.text }]}>Welcome back!</Text>
                        <Text style={[styles.subtitle, { color: colors.subtext }]}>By which day did you feel fully adjusted to the new timezone?</Text>

                        <View style={styles.buttonGrid}>
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <TouchableOpacity
                                    key={day}
                                    style={[
                                        styles.dayButton,
                                        { backgroundColor: isDark ? colors.surface : '#f9fafb', borderColor: isDark ? colors.border : '#e5e7eb' },
                                        selectedDay === day && styles.dayButtonSelected
                                    ]}
                                    onPress={() => setSelectedDay(day)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        { color: isDark ? colors.text : '#374151' },
                                        selectedDay === day && styles.dayTextSelected
                                    ]}>
                                        Day {day}{day === 7 ? '+' : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.submitButton, selectedDay === null && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={selectedDay === null}
                        >
                            <Text style={styles.submitText}>Submit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={[styles.cancelText, { color: colors.subtext }]}>Skip for now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1, padding: 24 },
    mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 28, fontFamily: 'Jua', marginBottom: 16, textAlign: 'center' },
    subtitle: { fontSize: 18, fontFamily: 'Jua', marginBottom: 40, textAlign: 'center', lineHeight: 24 },
    buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    dayButton: {
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: '28%',
        alignItems: 'center'
    },
    dayButtonSelected: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    dayText: { fontSize: 16, fontFamily: 'Jua' },
    dayTextSelected: { color: '#ffffff' },
    footer: { marginTop: 'auto', paddingBottom: 16 },
    submitButton: { backgroundColor: '#8B5CF6', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
    submitButtonDisabled: { opacity: 0.5 },
    submitText: { color: '#fff', fontSize: 18, fontFamily: 'Jua' },
    cancelButton: { padding: 8, alignItems: 'center' },
    cancelText: { fontSize: 16, fontFamily: 'Jua' }
});

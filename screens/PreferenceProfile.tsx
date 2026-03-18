import React from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { usePlans } from '../context/PlanContext';
import { useTheme } from '../context/ThemeContext';
import { clearRatingsForDirection } from '../utils/preferenceEngine';

export default function PreferenceProfile() {
    const { userSettings, updateUserSettings, plans } = usePlans();
    const { colors, isDark } = useTheme();

    const togglePersonalization = (value: boolean) => {
        updateUserSettings({ personalizationActive: value });
    };

    const resetEast = async () => {
        await clearRatingsForDirection('east', plans);
        updateUserSettings({ recoveryMultiplierEast: undefined });
    };

    const resetWest = async () => {
        await clearRatingsForDirection('west', plans);
        updateUserSettings({ recoveryMultiplierWest: undefined });
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
            <Text style={[styles.header, { color: colors.text }]}>My Travel Style</Text>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.row}>
                    <Text style={[styles.label, { color: colors.text }]}>Smart Preferences</Text>
                    <Switch
                        value={!!userSettings.personalizationActive}
                        onValueChange={togglePersonalization}
                        trackColor={{ false: '#D1D5DB', true: '#5EDAD9' }}
                        thumbColor="#FFFFFF"
                    />
                </View>
                <Text style={[styles.helpText, { color: colors.subtext }]}>
                    Learns how you adjust and tailors future plans for you.
                </Text>
            </View>

            {userSettings.personalizationActive && (
                <View style={styles.activePreferences}>
                    <Text style={[styles.subHeader, { color: colors.text }]}>Active Personalizations</Text>

                    {userSettings.recoveryMultiplierEast && (
                        <View style={[styles.prefCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <Text style={[styles.prefTitle, { color: colors.text }]}>Recovery Speed (Eastward)</Text>
                                    <Text style={styles.prefValue}>
                                        {userSettings.recoveryMultiplierEast < 1 ? 'Faster Adjustment' : userSettings.recoveryMultiplierEast === 1 ? 'Standard Adjustment' : 'Gentler Adjustment'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={resetEast} style={[styles.resetButton, { borderColor: colors.border }]}>
                                    <Text style={[styles.resetText, { color: colors.subtext }]}>✕ Reset</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {userSettings.recoveryMultiplierWest && (
                        <View style={[styles.prefCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <View style={styles.cardRow}>
                                <View>
                                    <Text style={[styles.prefTitle, { color: colors.text }]}>Recovery Speed (Westward)</Text>
                                    <Text style={styles.prefValue}>
                                        {userSettings.recoveryMultiplierWest < 1 ? 'Faster Adjustment' : userSettings.recoveryMultiplierWest === 1 ? 'Standard Adjustment' : 'Gentler Adjustment'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={resetWest} style={[styles.resetButton, { borderColor: colors.border }]}>
                                    <Text style={[styles.resetText, { color: colors.subtext }]}>✕ Reset</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {!userSettings.recoveryMultiplierEast && !userSettings.recoveryMultiplierWest && (
                        <Text style={[styles.emptyText, { color: colors.subtext }]}>Complete a trip to personalize your recovery speed.</Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { fontSize: 32, fontFamily: 'Jua', marginBottom: 20 },
    subHeader: { fontSize: 20, fontFamily: 'Jua', marginTop: 20, marginBottom: 12 },
    section: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 18, fontFamily: 'Jua' },
    helpText: { fontSize: 14, fontFamily: 'Jua', marginTop: 8 },
    activePreferences: { marginTop: 10 },
    prefCard: { padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
    prefTitle: { fontSize: 16, fontFamily: 'Jua' },
    prefValue: { fontSize: 18, fontFamily: 'Jua', color: '#10b981', marginTop: 4 },
    emptyText: { fontSize: 16, fontFamily: 'Jua', marginTop: 10 },
    resetButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    resetText: { fontSize: 13, fontFamily: 'Jua' },
});

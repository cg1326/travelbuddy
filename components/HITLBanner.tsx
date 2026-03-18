import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { usePlans } from '../context/PlanContext';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HITLBanner() {
    const { hitlQueue, dismissHITLSuggestion, refreshHITLQueue, userSettings, updateUserSettings } = usePlans();
    const { colors, isDark } = useTheme();
    const [showModal, setShowModal] = useState(false);

    if (!hitlQueue || hitlQueue.length === 0) return null;

    const suggestion = hitlQueue[0]; // Show the first one in the queue
    // Safety: ensure branding is lowercase even for stale data in the queue
    const activeSuggestion = {
        ...suggestion,
        promptText: suggestion.promptText.replace(/Travel Buddy/g, 'travel buddy')
    };

    const handleAccept = async () => {
        // Process the suggestion type
        const updates: any = { ...userSettings };
        if (activeSuggestion.type.startsWith('speed_east')) {
            updates.recoveryMultiplierEast = Number(activeSuggestion.targetValue);
            // Ensure personalization is marked active so we know they engaged with it
            updates.personalizationActive = true;
        } else if (activeSuggestion.type.startsWith('speed_west')) {
            updates.recoveryMultiplierWest = Number(activeSuggestion.targetValue);
            updates.personalizationActive = true;
        }
        // (Future Lever C and D updates will go here)

        // Save strictly to UserSettings
        await updateUserSettings(updates);

        // Dismiss this suggestion
        await dismissHITLSuggestion(activeSuggestion.id);
        await refreshHITLQueue();

        setShowModal(false);
    };

    const handleDismiss = async () => {
        // Dismiss and remove from queue
        await dismissHITLSuggestion(activeSuggestion.id);
        await refreshHITLQueue();
        setShowModal(false);
    };

    const handleLater = () => {
        setShowModal(false);
    };

    return (
        <>
            <TouchableOpacity
                style={styles.bannerContainer}
                onPress={() => setShowModal(true)}
            >
                <Icon name="zap" size={20} color="#FFFFFF" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.bannerTitle}>Smart Suggestion Available</Text>
                    <Text style={styles.bannerSubtext}>Tap to personalize your plans</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal visible={showModal} animationType="slide" presentationStyle="formSheet">
                <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: colors.bg }]}>
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Icon name="zap" size={32} color="#8B5CF6" />
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Personalize Your Plan</Text>
                        </View>

                        <Text style={[styles.promptText, { color: colors.subtext }]}>
                            {activeSuggestion.promptText}
                        </Text>

                        <View style={styles.buttonGroup}>
                            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
                                <Text style={styles.acceptText}>Yes, Update My Settings</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.dismissButton, { backgroundColor: isDark ? colors.surface : '#F3F4F6', borderColor: colors.border }]} onPress={handleDismiss}>
                                <Text style={[styles.dismissText, { color: colors.subtext }]}>No, Keep My Current Settings</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.laterButton} onPress={handleLater}>
                                <Text style={[styles.laterText, { color: colors.subtext }]}>Decide Later</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    bannerContainer: {
        backgroundColor: '#8B5CF6', // Purple theme for "Smart" AI features
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12, // Space between this and upcoming cards
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    icon: {
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    bannerTitle: {
        fontFamily: 'Jua',
        color: '#FFFFFF',
        fontSize: 16,
    },
    bannerSubtext: {
        fontFamily: 'Jua',
        color: '#EEDDFF',
        fontSize: 13,
        marginTop: 2,
    },
    modalSafeArea: {
        flex: 1,
    },
    modalContent: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontFamily: 'Jua',
        fontSize: 24,
        marginTop: 16,
    },
    promptText: {
        fontFamily: 'Jua',
        fontSize: 18,
        lineHeight: 28,
        textAlign: 'center',
        marginBottom: 40,
    },
    buttonGroup: {
        gap: 12,
    },
    acceptButton: {
        backgroundColor: '#8B5CF6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptText: {
        fontFamily: 'Jua',
        color: '#FFFFFF',
        fontSize: 18,
    },
    dismissButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    dismissText: {
        fontFamily: 'Jua',
        fontSize: 16,
    },
    laterButton: {
        padding: 16,
        alignItems: 'center',
    },
    laterText: {
        fontFamily: 'Jua',
        fontSize: 14,
    }
});

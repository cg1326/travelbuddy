import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

interface ConflictModalProps {
    visible: boolean;
    onCancel: () => void;
    onUpdateAnyway: () => void;
    title?: string;
    message?: string;
}

export default function ConflictModal({
    visible,
    onCancel,
    onUpdateAnyway,
    title = 'Connection Conflict',
    message = 'This delay causes your arrival to overlap with your next flight\'s departure.',
}: ConflictModalProps) {
    const { colors, isDark } = useTheme();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    <View style={[styles.iconContainer, isDark && { backgroundColor: '#451A03' }]}>
                        <Icon name="alert-triangle" size={32} color="#F59E0B" />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

                    <Text style={[styles.message, { color: colors.subtext }]}>
                        {message}
                    </Text>

                    <Text style={[styles.question, { color: colors.text }]}>
                        Do you want to proceed?
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} onPress={onCancel}>
                            <Text style={[styles.cancelButtonText, { color: colors.subtext }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.updateButton} onPress={onUpdateAnyway}>
                            <Text style={styles.updateButtonText}>Update Anyway</Text>
                        </TouchableOpacity>
                    </View>
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
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
    },
    iconContainer: {
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 50,
        marginBottom: 16,
    },
    title: {
        fontFamily: 'Jua',
        fontSize: 20,
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 4,
        lineHeight: 22,
    },
    question: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#64748B',
    },
    updateButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#EF4444', // Red for dangerous action/warning
        alignItems: 'center',
    },
    updateButtonText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#FFFFFF',
    },
});

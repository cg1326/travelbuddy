import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose, onSubmit }) => {
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState<string>('');

    const handleSubmit = () => {
        onSubmit(rating, comment);
        // Reset after close (or parent handles)
        setRating(0);
        setComment('');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.container}
                        >
                            <View style={styles.handle} />
                            <Text style={styles.title}>How is the plan working?</Text>

                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                        <Icon
                                            name={rating >= star ? "star" : "star-outline"}
                                            size={40}
                                            color={rating >= star ? "#FFD700" : "#E5E7EB"}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Any comments? (Optional)"
                                value={comment}
                                onChangeText={setComment}
                                multiline
                            />

                            <TouchableOpacity
                                style={[styles.submitButton, { opacity: rating > 0 ? 1 : 0.5 }]}
                                onPress={handleSubmit}
                                disabled={rating === 0}
                            >
                                <Text style={styles.submitText}>Submit Feedback</Text>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 300,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937', // Dark gray
        textAlign: 'center',
        marginBottom: 20,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        height: 80,
        textAlignVertical: 'top',
        marginBottom: 24,
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#1C5D74', // Brand teal
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

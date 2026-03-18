import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Linking, Animated, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Force Update Screen
 * Displays when the user's app version is below the minimum required version
 * Blocks all app functionality until user updates
 * Slides up smoothly after a brief delay
 */

// App Store ID from App Store Connect
const APP_STORE_ID = '6757408473';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;

export default function ForceUpdateScreen() {
    const slideAnim = useRef(new Animated.Value(1000)).current; // Start off-screen
    const [modalVisible, setModalVisible] = React.useState(false);

    useEffect(() => {
        // Show modal after brief delay, then slide up
        const timer = setTimeout(() => {
            setModalVisible(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        }, 500); // 500ms delay before sliding up

        return () => clearTimeout(timer);
    }, [slideAnim]);

    const handleUpdatePress = async () => {
        try {
            const canOpen = await Linking.canOpenURL(APP_STORE_URL);

            if (canOpen) {
                await Linking.openURL(APP_STORE_URL);
            } else {
                // Fallback for simulator or if URL can't be opened
                Alert.alert(
                    'Update Required',
                    'Please update the app from the App Store to continue using it.',
                    [{ text: 'OK' }]
                );
            }
        } catch (err) {
            console.error('[Force Update] Failed to open App Store:', err);
            Alert.alert(
                'Update Required',
                'Please visit the App Store and update to the latest version.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <Modal
            visible={modalVisible}
            transparent={true}
            animationType="none" // We handle animation ourselves
            onRequestClose={() => { }} // Prevent dismissal
        >
            <Animated.View
                style={[
                    { flex: 1 },
                    { transform: [{ translateY: slideAnim }] }
                ]}
            >
                <ImageBackground
                    source={require('../assets/images/Update.png')}
                    style={styles.container}
                    resizeMode="cover"
                >
                    {/* Update Button - matches Congrats page positioning */}
                    <TouchableOpacity
                        style={styles.updateButton}
                        onPress={handleUpdatePress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.updateButtonText}>Update App</Text>
                    </TouchableOpacity>
                </ImageBackground>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    updateButton: {
        position: 'absolute',
        bottom: 50,
        backgroundColor: '#CE654D',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
        width: '80%',
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 100,
    },
    updateButtonText: {
        fontFamily: 'Jua',
        fontSize: 18,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

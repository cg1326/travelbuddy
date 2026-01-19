import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    Image,
    TouchableOpacity,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { usePlans } from '../context/PlanContext';
import moment from 'moment-timezone';
import { CommonActions } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Using the "Clean" images (Xa) as base
const SLIDES = [
    {
        id: '0',
        image: require('../assets/images/Intro Card 1a.png'), // Map 0 -> 1a (Intro Start) per request logic if possible, or just 1a as first
        // Actually user said: "Intro Card 1a, 2a, 3a, 4a, 5a". 
        // Slide 0 usually is layout. Let's assume indices match User's description 1-5.
        // I will use 0-4 arrays.
        slideIndex: 1
    },
    { id: '1', image: require('../assets/images/Intro Card 2a.png'), slideIndex: 2 },
    { id: '2', image: require('../assets/images/Intro Card 3a.png'), slideIndex: 3 },
    { id: '3', image: require('../assets/images/Intro Card 4a.png'), slideIndex: 4 },
    { id: '4', image: require('../assets/images/Intro Card 5a.png'), slideIndex: 5, isLast: true },
];

export default function IntroCards({ navigation, onFinish }: { navigation: any, onFinish: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const { addPlan } = usePlans();
    const [isCreatingSample, setIsCreatingSample] = useState(false);

    // Navigation Logic
    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        }
    };

    const handleCreatePlan = () => {
        // Navigate to creating plan. 
        // do NOT call onFinish() here yet, so stack history is preserved.
        navigation.navigate('AddPlanName');
    };

    const handleSamplePlan = async () => {
        setIsCreatingSample(true);

        // SMART ORIGIN LOGIC
        const userTz = moment.tz.guess();
        let originCity = 'Los Angeles';
        let originCode = 'LAX';

        if (userTz.includes('New_York')) { originCity = 'New York'; originCode = 'JFK'; }
        else if (userTz.includes('Chicago')) { originCity = 'Chicago'; originCode = 'ORD'; }
        else if (userTz.includes('London')) { originCity = 'London'; originCode = 'LHR'; }
        else if (userTz.includes('Paris')) { originCity = 'Paris'; originCode = 'CDG'; }
        else if (userTz.includes('Tokyo')) { originCity = 'Tokyo'; originCode = 'HND'; }

        // SMART DESTINATION
        let destCity = 'London';
        let destCode = 'LHR';
        if (originCity === 'London' || originCity === 'Paris') { destCity = 'Tokyo'; destCode = 'HND'; }
        if (originCity === 'Tokyo') { destCity = 'Los Angeles'; destCode = 'LAX'; }
        if (originCity === 'New York') { destCity = 'Paris'; destCode = 'CDG'; }

        // DATES
        const departDate = moment().add(2, 'days').format('YYYY-MM-DD');
        const arriveDate = moment().add(3, 'days').format('YYYY-MM-DD');

        const sampleTrip = {
            id: `sample-${Date.now()}`,
            from: originCity,
            to: destCity,
            departDate: departDate,
            departTime: '18:00',
            arriveDate: arriveDate,
            arriveTime: '10:00',
            hasConnections: false,
            segments: [],
            connections: [] // In a real app we'd fill this, but this is a stub
        };

        await addPlan('Sample Trip', [sampleTrip]);

        // NOW we finish intro, as they have entered the "Main" app flow
        onFinish();

        // Reset to MainTabs with Today selected
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [
                    { name: 'MainTabs', params: { screen: 'Today' } },
                ],
            })
        );

        setIsCreatingSample(false);
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        return (
            <View style={styles.slide}>
                <Image source={item.image} style={styles.image} resizeMode="contain" />

                {/* Overlay Content */}
                {!item.isLast ? (
                    // Slides 1-4 (Indices 0-3)
                    <View style={styles.buttonContainer}>
                        {/* "Next" or "Get Started" logic? User asked for 'Next' and 'Get Started'. 
                 Usually 'Next' for intermediates, maybe 'Get Started' for 4?
                 Let's stick to 'Next' for 1-4 for now unless specific instructions.
              */}
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleNext}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Last Slide (5)
                    <View style={styles.buttonContainerLast}>
                        {/* Text Block */}
                        <View style={styles.textBlock}>
                            <Text style={styles.bodyText}>
                                Don't have a trip yet? Try a sample plan to see how it works.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleCreatePlan}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>+ Create New Plan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleSamplePlan}
                            disabled={isCreatingSample}
                            activeOpacity={0.6}
                        >
                            <Text style={styles.secondaryButtonText}>
                                {isCreatingSample ? 'Creating...' : 'View Sample Plan'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Pagination Logic to sync currentIndex
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={styles.container}>
            <StatusBar hidden />
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                keyExtractor={(item) => item.id}
                getItemLayout={(data, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
            />

            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            currentIndex === index ? styles.activeDot : styles.inactiveDot,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Clean white background for safe areas
    },
    slide: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: '#FFFFFF',
    },
    image: {
        width: width,
        height: '100%', // Fills height
        position: 'absolute',
        top: 0,
    },

    // Container for Slides 1-4 (Just button at bottom)
    buttonContainer: {
        position: 'absolute',
        bottom: 80,
        width: '100%',
        paddingHorizontal: 30,
        alignItems: 'center',
    },

    // Container for Last Slide (Text + Two Buttons)
    buttonContainerLast: {
        position: 'absolute',
        bottom: 60, // Slightly lower to fit more content
        width: '100%',
        paddingHorizontal: 30,
        alignItems: 'center',
        gap: 12, // Gap between elements
    },

    textBlock: {
        marginBottom: 8,
        paddingHorizontal: 10,
    },
    bodyText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#1F4259', // Dark Navy
        textAlign: 'center',
        lineHeight: 22,
    },

    primaryButton: {
        backgroundColor: '#1F4259', // Dark Navy
        borderRadius: 16,
        paddingVertical: 16,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        fontFamily: 'Jua',
        color: '#FFFFFF',
        fontSize: 18,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontFamily: 'Jua',
        color: '#1F4259',
        fontSize: 16,
        textDecorationLine: 'underline',
    },

    pagination: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        // Hide pagination on last slide to avoid clutter? Or keep it. 
        // Mockups often keep it.
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        backgroundColor: '#1F4259',
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    inactiveDot: {
        backgroundColor: '#CBD5E1',
    },
});

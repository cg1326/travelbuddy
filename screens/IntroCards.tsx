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

// INTRO CARD CONFIGURATION
const SLIDES = [
    {
        id: 'start',
        image: require('../assets/images/Intro Card 0a.png'),
        type: 'start'
    },
    { id: '0', image: require('../assets/images/Intro Card 1a.png'), type: 'step' },
    { id: '1', image: require('../assets/images/Intro Card 2a.png'), type: 'step' },
    { id: '2', image: require('../assets/images/Intro Card 3a.png'), type: 'step' },
    { id: '3', image: require('../assets/images/Intro Card 4a.png'), type: 'step' },
    {
        id: '4',
        image: require('../assets/images/Intro Card 5a.png'),
        type: 'end',
        isLast: true
    },
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
        navigation.navigate('AddPlanName');
    };

    const handleSamplePlan = async () => {
        setIsCreatingSample(true);

        // SMART ORIGIN LOGIC
        const userTz = moment.tz.guess();
        let originCity = 'Los Angeles';

        if (userTz.includes('New_York')) originCity = 'New York';
        else if (userTz.includes('Chicago')) originCity = 'Chicago';
        else if (userTz.includes('London')) originCity = 'London';
        else if (userTz.includes('Paris')) originCity = 'Paris';
        else if (userTz.includes('Tokyo')) originCity = 'Tokyo';

        // Smart Destination Logic
        let destCity = 'London';
        if (originCity === 'London' || originCity === 'Paris') destCity = 'Tokyo';
        if (originCity === 'Tokyo') destCity = 'Los Angeles';
        if (originCity === 'New York') destCity = 'Paris';

        // Dates
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
            connections: []
        };

        await addPlan('Sample Trip', [sampleTrip]);

        onFinish();

        // Reset Navigation
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

                {/* === SLIDE 0: INTRO START === */}
                {item.type === 'start' && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, styles.blueButton]} // BLUE #3C82F6
                            onPress={handleNext}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Get Started</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* === SLIDES 1-4: STEPS === */}
                {item.type === 'step' && (
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.primaryButton} // Default Navy
                            onPress={handleNext}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* === SLIDE 5: END === */}
                {item.type === 'end' && (
                    <View style={styles.buttonContainerLast}>
                        <TouchableOpacity
                            style={[styles.primaryButton, styles.orangeButton]} // ORANGE #FF8000
                            onPress={handleCreatePlan}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>+ Create New Plan</Text>
                        </TouchableOpacity>

                        <View style={styles.textBlock}>
                            <Text style={styles.bodyText}>
                                Don't have a trip yet? Try a sample plan to see how it works.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, styles.greyButton]} // GREY BUTTON #B7B5B5, Filled
                            onPress={handleSamplePlan}
                            disabled={isCreatingSample}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>
                                {isCreatingSample ? 'Creating...' : 'View Sample Plan'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Pagination Listener
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
        backgroundColor: '#FFFFFF',
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
        height: '100%',
        position: 'absolute',
        top: 0,
    },

    // Standard Container (Start + Steps)
    buttonContainer: {
        position: 'absolute',
        bottom: 80,
        width: '100%',
        paddingHorizontal: 30,
        alignItems: 'center',
    },

    // End Slide Container (Higher to fit more items)
    buttonContainerLast: {
        position: 'absolute',
        bottom: 60,
        width: '100%',
        paddingHorizontal: 30,
        alignItems: 'center',
        gap: 16,
    },

    textBlock: {
        marginBottom: 0,
        marginTop: 0,
        paddingHorizontal: 20,
    },
    bodyText: {
        fontFamily: 'Jua',
        fontSize: 16,
        color: '#1F4259',
        textAlign: 'center',
        lineHeight: 22,
    },

    primaryButton: {
        backgroundColor: '#1F4259', // Default Navy for "Next"
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

    // COLOR OVERRIDES
    blueButton: {
        backgroundColor: '#3C82F6',
    },
    orangeButton: {
        backgroundColor: '#FF8000',
    },
    greyButton: {
        backgroundColor: '#B7B5B5', // Grey Filled
    },

    pagination: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
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

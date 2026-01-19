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

const { width, height } = Dimensions.get('window');

const SLIDES = [
    { id: '0', image: require('../assets/images/Intro Card 0.png') },
    { id: '1', image: require('../assets/images/Intro Card 1.png') },
    { id: '2', image: require('../assets/images/Intro Card 2.png') },
    { id: '3', image: require('../assets/images/Intro Card 3.png') },
    { id: '4', image: require('../assets/images/Intro Card 4.png') },
    { id: '5', image: require('../assets/images/Intro Card 5a.png'), isLast: true },
];

export default function IntroCards({ navigation, onFinish }: { navigation: any, onFinish: () => void }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const { addPlan } = usePlans();
    const [isCreatingSample, setIsCreatingSample] = useState(false);

    const handleCreatePlan = () => {
        onFinish(); // Mark as seen
        navigation.navigate('AddPlanName');
    };

    const handleSamplePlan = async () => {
        setIsCreatingSample(true);

        // SMART ORIGIN LOGIC
        // Guess user's timezone to find a relevant departure city
        const userTz = moment.tz.guess(); // e.g., "America/New_York"
        let originCity = 'Los Angeles'; // Default
        let originTz = 'America/Los_Angeles';

        // Simple mapping for demo purposes
        if (userTz.includes('New_York')) originCity = 'New York';
        else if (userTz.includes('Chicago')) originCity = 'Chicago';
        else if (userTz.includes('London')) originCity = 'London';
        else if (userTz.includes('Paris')) originCity = 'Paris';
        else if (userTz.includes('Tokyo')) originCity = 'Tokyo';

        // SMART DESTINATION
        // Ensure destination is far enough away to be interesting
        let destCity = 'London';
        if (originCity === 'London' || originCity === 'Paris') destCity = 'Tokyo';
        if (originCity === 'Tokyo') destCity = 'Los Angeles';
        if (originCity === 'New York') destCity = 'Paris';

        // DATES: Depart in 2 days, Return in 10 days
        const departDate = moment().add(2, 'days').format('YYYY-MM-DD');
        const arriveDate = moment().add(3, 'days').format('YYYY-MM-DD'); // Overnight flight

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

        // Create the plan
        await addPlan('Sample Trip', [sampleTrip]);

        // Finish onboarding and go to Today view
        onFinish();
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'Today' } }],
        });

        setIsCreatingSample(false);
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        return (
            <View style={styles.slide}>
                <Image source={item.image} style={styles.image} resizeMode="cover" />

                {/* Overlay Buttons for Last Slide */}
                {item.isLast && (
                    <View style={styles.buttonContainer}>
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
                                {isCreatingSample ? 'Loading...' : 'View Sample Plan'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

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

            {/* Pagination Dots (Hide on last slide if you want, or keep) */}
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
    },
    image: {
        width: width,
        height: height,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 80, // Adjust based on the "safe area" in the design
        width: '100%',
        paddingHorizontal: 30,
        alignItems: 'center',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: '#1F4259', // Dark Navy from app theme
        borderRadius: 16,
        paddingVertical: 18,
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
        color: '#1F4259', // Matching Dark Navy text
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
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        backgroundColor: '#1F4259',
        width: 12, // Slightly larger active dot
        height: 12,
        borderRadius: 6,
    },
    inactiveDot: {
        backgroundColor: '#CBD5E1', // Slate 300
    },
});

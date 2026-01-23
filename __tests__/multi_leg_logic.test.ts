
import { generateJetLagPlan, Trip, UserSettings } from '../utils/jetLagAlgorithm';
import moment from 'moment-timezone';

const mockSettings: UserSettings = {
    normalBedtime: '23:00',
    normalWakeTime: '07:00',
    useMelatonin: false,
    useMagnesium: false,
};

describe('Multi-Leg and Arrival Logic', () => {
    it('should inherit circadian origin from previous "Stay Home" trip', () => {
        // Trip 1: NY -> London (Stay Home)
        // 2 days later: London -> Paris
        const trip1: Trip = {
            id: 't1',
            from: 'New York',
            to: 'London',
            departDate: '2025-06-01',
            departTime: '18:00',
            arriveDate: '2025-06-02',
            arriveTime: '06:00',
            hasConnections: false,
            connections: [],
            adjustmentPreference: 'stay_home' // Explicitly set to ensure it's Stay Home
        };

        const trip2: Trip = {
            id: 't2',
            from: 'London',
            to: 'Paris',
            departDate: '2025-06-03', // 1 day later
            departTime: '10:00',
            arriveDate: '2025-06-03',
            arriveTime: '12:00',
            hasConnections: false,
            connections: []
        };

        const allTrips = [trip1, trip2];

        // Generate plan for Trip 2
        const plan = generateJetLagPlan(trip2, allTrips, mockSettings);

        // London -> Paris is +1 hr. Normally strictly < 3h diff, so usually NO adjust phase or "Minimal".
        // But if using NY -> Paris, it's +6 hr. Should trigger adjustment cards.

        // Check for adjustment cards
        const adjustPhase = plan.phases.adjust;

        // If interpreted as London->Paris (+1h), we expect very few cards or specific "small diff" logic.
        // If interpreted as NY->Paris (+6h), we expect standard jet lag cards (light, etc).

        // Specifically, let's look for "Seek Morning Sunlight" or similar, which implies significant shift.
        // Or check the "why" text of the Arrival card.
        const arrivalCard = adjustPhase.cards.find(c => c.id === 'adjust-arrival');
        expect(arrivalCard).toBeDefined();

        // Verify we have advice. 
        // If it was just London->Paris, hoursDiff is 1. 
        // jetLagAlgorithm usually requires >= 3 hours for robust plan? 
        // Let's check if 'Seek Morning Sunlight' exists.
        const lightCard = adjustPhase.cards.find(c => c.title.includes('Sunlight'));

        // NY->Paris (+6h) SHOULD have light advice. London->Paris (+1h) might not.
        expect(lightCard).toBeDefined();
    });

    it('should add "Prioritize Rest" card on Arrival Day for Short Trip if timing allows', () => {
        // NY -> Chicago (1 hr diff). Short trip.
        // Arrive 10 AM. Bedtime 11 PM NY = 10 PM Chicago.
        // Current Time 10 AM. Bedtime 10 PM. Gap exists.

        const trip: Trip = {
            id: 't3',
            from: 'New York',
            to: 'Chicago',
            departDate: '2025-07-01',
            departTime: '08:00',
            arriveDate: '2025-07-01',
            arriveTime: '10:00',
            hasConnections: false,
            connections: [],
            adjustmentPreference: 'stay_home'
        };

        const plan = generateJetLagPlan(trip, [trip], mockSettings);
        const adjustPhase = plan.phases.adjust;

        // Expect "Prioritize Rest" card
        const restCard = adjustPhase.cards.find(c => c.title === 'Prioritize Rest');
        expect(restCard).toBeDefined();
        if (restCard) {
            expect(restCard.time).toBe('10:00 PM'); // 11 PM NY is 10 PM Chicago
        }
    });
});

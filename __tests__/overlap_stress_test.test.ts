
import { generateJetLagPlan, Trip, UserSettings } from '../utils/jetLagAlgorithm';
import moment from 'moment-timezone';

// Mock helpers
const userSettings: UserSettings = {
    normalBedtime: '23:00',
    normalWakeTime: '07:00',
    useMelatonin: false,
    useMagnesium: false,
};

describe('Overlap Stress Test', () => {

    test('Short Stay Home Return (NY -> London (2d) -> NY)', () => {
        // Trip 1: NY -> Lon. June 1-2. Stay 2 days (June 2-4). return June 4.
        const trip1: Trip = {
            id: 't1', from: 'New York', to: 'London',
            departDate: '2025-06-01', departTime: '18:00',
            arriveDate: '2025-06-02', arriveTime: '06:00',
            adjustmentPreference: 'stay_home', // Explicitly Stay Home
            hasConnections: false,
            connections: [],
            segments: []
        };
        const trip2: Trip = {
            id: 't2', from: 'London', to: 'New York',
            departDate: '2025-06-04', departTime: '10:00',
            arriveDate: '2025-06-04', arriveTime: '13:00',
            hasConnections: false,
            connections: [],
            segments: []
        };

        const allTrips = [trip1, trip2];

        // Generate plans
        const plan1 = generateJetLagPlan(trip1, allTrips, userSettings);
        const plan2 = generateJetLagPlan(trip2, allTrips, userSettings);

        // Analyze overlapping dates: June 2, 3, 4
        // Trip 1 Adjust: Start June 2. End June 3 (2 days duration).
        // Trip 2 Prepare: Start June 2 (2 days before June 4).

        // Check June 2 cards
        const t1AdjustCards = plan1.phases.adjust.cards.filter(c => c.dateTime?.startsWith('2025-06-02'));
        const t2PrepCards = plan2.phases.prepare?.cards?.filter(c => c.dateTime?.startsWith('2025-06-02') || (c.dateTime && moment(c.dateTime).isSame('2025-06-02', 'day'))) || [];

        console.log('\n=== SCENARIO 1: Short Stay Home Return ===');
        console.log('--- June 2 (Arrival Day T1 / Prep Day 1 T2) ---');
        console.log('T1 Adjust Cards:', t1AdjustCards.map(c => c.title));
        console.log('T2 Prep Cards:', t2PrepCards.map(c => c.title));

        // Check T2 Logic:
        // Trip 2 is London -> NY. But body is NY (Stay Home T1).
        // So effective origin is NY. Dest is NY. Diff is 0.
        // Prepare logic for diff=0 -> Suppressed.

        // Wait, plan2 might NOT have detected the previous trip "stay home" correctly if we don't calculate plan1 first or if generateJetLagPlan is isolated?
        // `generateJetLagPlan` calculates strategy for prev trip inside itself? 
        // Yes, see line 659: `const prevStrategy = determineAdjustmentStrategy(...)`.
        // So it should work independently.

        const hasSleepShifting = t2PrepCards.some(c => c.title.includes('Sleep') || c.title.includes('Light'));
        if (hasSleepShifting) {
            console.error('FAIL: Trip 2 Prepare has sleep shifting cards despite 0h diff!');
        } else {
            console.log('PASS: Trip 2 Prepare has NO sleep shifting cards.');
        }
    });

    test('Back-to-Back Adjust (NY -> London (Adjust) -> Tokyo)', () => {
        // Trip 1: NY -> London. June 1-2. Stay 4 days.
        // Adjusting to London.
        // Trip 2: London -> Tokyo. Depart June 6.
        const trip1: Trip = {
            id: 't1', from: 'New York', to: 'London',
            departDate: '2025-06-01', departTime: '18:00',
            arriveDate: '2025-06-02', arriveTime: '06:00',
            adjustmentPreference: 'adjust',
            hasConnections: false,
            connections: [],
            segments: []
        };
        const trip2: Trip = {
            id: 't2', from: 'London', to: 'Tokyo',
            departDate: '2025-06-06', departTime: '12:00',
            arriveDate: '2025-06-07', arriveTime: '08:00',
            hasConnections: false,
            connections: [],
            segments: []
        };

        const allTrips = [trip1, trip2];

        const plan1 = generateJetLagPlan(trip1, allTrips, userSettings);
        const plan2 = generateJetLagPlan(trip2, allTrips, userSettings);

        // Overlap: June 4, 5
        // T1 Adjust: Adjusting to London (Sleep Earlier).
        // T2 Prepare: London -> Tokyo (East). Prepare = Sleep Earlier.

        // Conflict? Both want Sleep Earlier?
        // London is +5 from NY. Tokyo is +9 from London (+14 from NY).
        // T1: Sleep Earlier (moving +5).
        // T2: Sleep Earlier (moving +9).
        // Alignment! Both push in same direction.

        console.log('\n=== SCENARIO 2: Forward Multi-Leg ===');
        const t1Cards = plan1.phases.adjust.cards.filter(c => c.dateTime?.includes('2025-06-04'));
        const t2Cards = plan2.phases.prepare?.cards?.filter(c => c.dateTime?.includes('2025-06-04')) || [];

        console.log('--- June 4 ---');
        console.log('T1 Adjust (To London):', t1Cards.map(c => c.title));
        console.log('T2 Prep (To Tokyo):', t2Cards.map(c => c.title));

        // We just want to see logs to verify "sanity".
    });

});

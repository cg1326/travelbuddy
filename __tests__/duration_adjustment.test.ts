
import { generateJetLagPlan, Trip, UserSettings } from '../utils/jetLagAlgorithm';

describe('Duration-Based Adjustment Strategies', () => {
    const userSettings: UserSettings = {
        normalBedtime: '23:00',
        normalWakeTime: '07:00',
        useMelatonin: false,
        useMagnesium: false,
    };

    const baseTrip: Trip = {
        id: 'trip1',
        from: 'Los Angeles', // -8 UTC
        to: 'London',      // +0 UTC (Diff 8h)
        departDate: '2025-06-01',
        departTime: '18:00',
        arriveDate: '2025-06-02',
        arriveTime: '12:00',
        hasConnections: false,
        connections: [],
        segments: [
            {
                from: 'Los Angeles',
                to: 'London',
                departDate: '2025-06-01',
                departTime: '18:00',
                arriveDate: '2025-06-02',
                arriveTime: '12:00', // Arrival
            }
        ]
    };

    it('should use Stay Home strategy for short trips (< 3 days)', () => {
        // Return trip departs 2 days later (June 4)
        // Arrival June 2. Depart June 4. Stay = 2 days.
        const returnTrip: Trip = {
            ...baseTrip,
            id: 'trip2',
            from: 'London',
            to: 'Los Angeles',
            departDate: '2025-06-04',
            departTime: '12:00',
        };

        const plan = generateJetLagPlan(baseTrip, [baseTrip, returnTrip], userSettings);

        // Check for Stay Home specific cards
        const adjustPhase = plan.phases.adjust;

        // Should have "Prioritize Rest" instead of "Maintain Home Schedule"
        const restCard = adjustPhase.cards.find(c => c.id === 'adjust-short-rest');
        expect(restCard).toBeDefined();
        expect(restCard?.title).toBe('Prioritize Rest');
        expect(restCard?.why).toContain('aligns with your natural sleep time');

        // Should have "Peak Energy Window"
        const energyCard = adjustPhase.cards.find(c => c.id === 'adjust-short-active');
        expect(energyCard).toBeDefined();
        expect(energyCard?.title).toBe('Peak Energy Window');

        // Check suppression of standard cards
        const sunCard = adjustPhase.cards.find(c => c.id === 'adjust-morning-light-daily');
        expect(sunCard).toBeUndefined();

        const caffeineLimitCard = adjustPhase.cards.find(c => c.id === 'adjust-caffeine-limit-daily');
        expect(caffeineLimitCard).toBeUndefined();

        // Check suppression of ARRIVAL cards
        const arrivalCaffeineLimit = adjustPhase.cards.find(c => c.id === 'adjust-arrival-no-caffeine');
        expect(arrivalCaffeineLimit).toBeUndefined();

        const arrivalDinner = adjustPhase.cards.find(c => c.id === 'adjust-arrival-dinner');
        expect(arrivalDinner).toBeUndefined();
    });

    it('should use Partial strategy for medium trips (3-5 days)', () => {
        // Return trip departs 4 days later (June 6)
        // Adjust phase start June 2. Depart June 6. Stay = 4 days.
        const returnTrip: Trip = {
            ...baseTrip,
            id: 'trip2',
            from: 'London',
            to: 'Los Angeles',
            departDate: '2025-06-06',
            departTime: '12:00',
        };

        const plan = generateJetLagPlan(baseTrip, [baseTrip, returnTrip], userSettings);

        // Should HAVE standard cards
        const adjustPhase = plan.phases.adjust;
        const sunCard = adjustPhase.cards.find(c => c.id === 'adjust-morning-light-daily');
        expect(sunCard).toBeDefined();

        // Verify reason text in ARRIVAL card (not sun card)
        const arrivalCard = adjustPhase.cards.find(c => c.id === 'adjust-arrival');
        expect(arrivalCard).toBeDefined();
        expect(arrivalCard?.why).toContain('shift your schedule');
        expect(arrivalCard?.why).toContain('energized');

        // Should NOT have Stay Home card
        const stayHomeCard = adjustPhase.cards.find(c => c.id === 'adjust-stay-home-daily-routine');
        expect(stayHomeCard).toBeUndefined();
    });

    it('should use Full strategy for long trips (6+ days)', () => {
        // Return trip departs 7 days later (June 9)
        const returnTrip: Trip = {
            ...baseTrip,
            id: 'trip2',
            from: 'London',
            to: 'Los Angeles',
            departDate: '2025-06-09',
            departTime: '12:00',
        };

        const plan = generateJetLagPlan(baseTrip, [baseTrip, returnTrip], userSettings);

        const adjustPhase = plan.phases.adjust;
        const sunCard = adjustPhase.cards.find(c => c.id === 'adjust-morning-light-daily');
        expect(sunCard).toBeDefined();

        // Check for specific Full Adjustment reason in Arrival card
        const arrivalCard = adjustPhase.cards.find(c => c.id === 'adjust-arrival');
        expect(arrivalCard).toBeDefined();
        expect(arrivalCard?.why).toContain('Full adjustment');
    });

    it('should default to Full strategy for one-way trips', () => {
        const plan = generateJetLagPlan(baseTrip, [baseTrip], userSettings);

        const adjustPhase = plan.phases.adjust;
        // Check for specific Full Adjustment reason in Arrival card
        const arrivalCard = adjustPhase.cards.find(c => c.id === 'adjust-arrival');
        expect(arrivalCard).toBeDefined();
        expect(arrivalCard?.why).toContain('Full adjustment');
    });

    it('should respect "stay_home" preference for medium trips', () => {
        const mediumTrip: Trip = {
            ...baseTrip,
            id: 'trip3',
            departDate: '2025-06-01',
            arriveDate: '2025-06-02',
            adjustmentPreference: 'stay_home'
        };
        const returnTrip: Trip = {
            ...baseTrip,
            id: 'trip4',
            departDate: '2025-06-05', // 3 days stay
        };

        const plan = generateJetLagPlan(mediumTrip, [mediumTrip, returnTrip], userSettings);
        const adjustPhase = plan.phases.adjust;

        // Should HAVE Stay Home cards even though it's 3 days
        const restCard = adjustPhase.cards.find(c => c.id === 'adjust-short-rest');
        expect(restCard).toBeDefined();

        // Should NOT have standard cards
        const sunCard = adjustPhase.cards.find(c => c.id === 'adjust-morning-light-daily');
        expect(sunCard).toBeUndefined();

        // Check reason
        const arrivalCard = adjustPhase.cards.find(c => c.id === 'adjust-arrival');
        expect(arrivalCard?.why).toContain('As requested');
    });

    it('should respect "adjust" preference for short trips', () => {
        const shortTrip: Trip = {
            ...baseTrip,
            id: 'trip5',
            departDate: '2025-06-01',
            arriveDate: '2025-06-02',
            adjustmentPreference: 'adjust'
        };
        const returnTrip: Trip = {
            ...baseTrip,
            id: 'trip6',
            departDate: '2025-06-03', // 1 day stay
        };

        const plan = generateJetLagPlan(shortTrip, [shortTrip, returnTrip], userSettings);
        const adjustPhase = plan.phases.adjust;

        // Should HAVE standard cards despite being 1 day
        const sunCard = adjustPhase.cards.find(c => c.id === 'adjust-morning-light-daily');
        expect(sunCard).toBeDefined();

        // Check reason
        const arrivalCard = adjustPhase.cards.find(c => c.id === 'adjust-arrival');
        expect(arrivalCard?.why).toContain('You chose to adjust');
    });
});

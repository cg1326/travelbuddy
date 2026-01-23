
import { generateJetLagPlan, Trip, UserSettings } from '../utils/jetLagAlgorithm';

const userSettings: UserSettings = {
    normalBedtime: '23:00',
    normalWakeTime: '07:00',
    useMelatonin: false,
    useMagnesium: false,
};

const shortTrip: Trip = {
    id: 'trip_short',
    from: 'New York',
    to: 'London',
    departDate: '2025-06-01',
    departTime: '18:00',
    arriveDate: '2025-06-02',
    arriveTime: '06:00',
    hasConnections: false,
    connections: [],
    segments: [
        {
            from: 'New York',
            to: 'London',
            departDate: '2025-06-01',
            departTime: '18:00',
            arriveDate: '2025-06-02',
            arriveTime: '06:00',
        }
    ]
};

const returnTrip: Trip = {
    ...shortTrip,
    id: 'trip_return',
    from: 'London',
    to: 'New York',
    departDate: '2025-06-06', // 4 Days later
    departTime: '12:00',
};

const plan = generateJetLagPlan(shortTrip, [shortTrip, returnTrip], userSettings);

console.log('=== ADJUSTMENT PHASE CARDS (Short Trip Strategy) ===');
plan.phases.adjust.cards.forEach(card => {
    console.log(`[${card.time}] ${card.title}`);
    console.log(`   Why: ${card.why}`);
    console.log(`   How: ${card.how}`);
    console.log('------------------------------------------------');
});

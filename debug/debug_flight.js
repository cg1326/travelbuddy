
const moment = require('moment-timezone');
const { calculateJetLagPlan } = require('./utils/jetLagAlgorithm');

// Mock Data for SFO -> PEK
// Date: Jan 23, 2026. 12:00 PM SFO Departure.
// SFO is UTC-8. PEK is UTC+8. Diff 16 hours.
// Flight Duration: ~13 hours.

const trip = {
    id: 'test-trip',
    from: 'San Francisco',
    to: 'Beijing',
    departDate: '2026-01-23',
    departTime: '12:00',
    arriveDate: '2026-01-24', // Arrival next day
    arriveTime: '16:00', // 4 PM next day
    hasConnections: false,
    segments: [
        {
            from: 'San Francisco',
            to: 'Beijing',
            departDate: '2026-01-23',
            departTime: '12:00',
            arriveDate: '2026-01-24',
            arriveTime: '16:00'
        }
    ],
    connections: [],
    adjustmentPreference: 'stay_home'
};

const userSettings = {
    normalBedtime: '23:00',
    normalWakeTime: '07:00',
    useMelatonin: false,
    useMagnesium: false
};

// Mock All Trips (just this one)
const allTrips = [trip];

console.log("Running calculation...");
const plan = calculateJetLagPlan(trip, [], 0, userSettings, 'San Francisco', []);

console.log("Strategy:", plan.strategy);
console.log("Percentage:", plan.strategy === 'stay_home' ? 0 : 100);

console.log("Flight Cards:");
const travelPhase = plan.phases.travel;
if (travelPhase && travelPhase.cards) {
    travelPhase.cards.forEach(c => {
        console.log(`- [${c.id}] ${c.title}: ${c.why} (Color: ${c.color})`);
    });
} else {
    console.log("No travel cards found.");
}


const { calculateJetLagPlan } = require('./utils/jetLagAlgorithm');
const moment = require('moment-timezone');

// Mock Data
const trip = {
    id: 'test-trip-sea-yvr',
    from: 'Seattle',
    fromTz: 'America/Los_Angeles',
    to: 'Vancouver',
    toTz: 'America/Vancouver',
    departDate: '2026-02-12',
    departTime: '19:11', // 7:11 PM
    arriveDate: '2026-02-12',
    arriveTime: '21:11', // 9:11 PM
    segments: [
        {
            from: 'Seattle',
            fromTz: 'America/Los_Angeles',
            to: 'Vancouver',
            toTz: 'America/Vancouver',
            departDate: '2026-02-12',
            departTime: '19:11',
            arriveDate: '2026-02-12',
            arriveTime: '21:11',
            flightNumber: 'AS123'
        }
    ]
};

const userSettings = {
    normalBedtime: '22:00',
    normalWakeTime: '06:00',
    chronotype: 'intermediate'
};

const plan = calculateJetLagPlan(
    [trip],
    userSettings,
    'Seattle', // Origin
    'America/Los_Angeles' // Origin Tz
);

const tripPlan = plan[0];
console.log('Strategy:', tripPlan.strategy);
console.log('Direction:', tripPlan.direction);
console.log('Hours Diff:', tripPlan.phases.travel.cards.find(c => c.why && c.why.includes('hours'))?.why || 'N/A');

console.log('\n--- TRAVEL CARDS ---');
tripPlan.phases.travel.cards.forEach(c => console.log(`[${c.id}] ${c.title}`));

console.log('\n--- ADJUST CARDS ---');
tripPlan.phases.adjust.cards.forEach(c => console.log(`[${c.id}] ${c.title}`));

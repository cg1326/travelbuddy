import { generateJetLagPlan, getCityTimezone } from './utils/jetLagAlgorithm';
import { Trip, UserSettings } from './types/models';
import moment from 'moment-timezone';

const trip: Trip = {
    id: 'debug-trip',
    from: 'Seattle',
    fromTz: 'America/Los_Angeles',
    to: 'Vancouver',
    toTz: 'America/Vancouver',
    departDate: '2026-02-12',
    departTime: '19:11',
    arriveDate: '2026-02-12',
    arriveTime: '21:11',
    hasConnections: false,
    connections: [],
    adjustmentPreference: 'stay_home', // mimicking short trip default
    segments: [
        {
            from: 'Seattle',
            fromTz: 'America/Los_Angeles',
            to: 'Vancouver',
            toTz: 'America/Vancouver',
            departDate: '2026-02-12',
            departTime: '19:11',
            arriveDate: '2026-02-12',
            arriveTime: '21:11'
        }
    ]
};

const userSettings: UserSettings = {
    normalBedtime: '22:00',
    normalWakeTime: '06:00',
    useMelatonin: true,
    useMagnesium: true
};


const fromTz = getCityTimezone('Seattle') || 'America/Los_Angeles';
console.log('Seattle Tz:', fromTz);

const toTz = getCityTimezone('Vancouver') || 'America/Vancouver';
console.log('Vancouver Tz:', toTz);

const plan = generateJetLagPlan(trip, [trip], userSettings);

console.log('--- Adjust Phase Cards ---');
plan.phases.adjust.cards.forEach(c => {
    console.log(`[${c.id}] ${c.title}`);
});

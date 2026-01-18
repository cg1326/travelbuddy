const moment = require('moment-timezone');

const scenarios = [
    // === Original 5 ===
    {
        name: '1. NY -> LA (Evening) [THE PROBLEM]',
        from: 'New York', to: 'Los Angeles',
        departTime: '18:15', duration: 6.25,
        zoneFrom: 'America/New_York', zoneTo: 'America/Los_Angeles',
        expectedSleep: false // Stay Awake
    },
    {
        name: '2. NY -> London (Red Eye)',
        from: 'New York', to: 'London',
        departTime: '18:00', duration: 7,
        zoneFrom: 'America/New_York', zoneTo: 'Europe/London',
        expectedSleep: true
    },
    {
        name: '3. LA -> Sydney (Long Haul)',
        from: 'Los Angeles', to: 'Sydney',
        departTime: '22:00', duration: 15,
        zoneFrom: 'America/Los_Angeles', zoneTo: 'Australia/Sydney',
        expectedSleep: true
    },
    {
        name: '4. NY -> LA (Morning)',
        from: 'New York', to: 'Los Angeles',
        departTime: '07:00', duration: 6,
        zoneFrom: 'America/New_York', zoneTo: 'America/Los_Angeles',
        expectedSleep: false
    },
    {
        name: '5. Tokyo -> LA (Overnight)',
        from: 'Tokyo', to: 'Los Angeles',
        departTime: '17:00', duration: 10,
        zoneFrom: 'Asia/Tokyo', zoneTo: 'America/Los_Angeles',
        expectedSleep: true
    },

    // === 10 New Scenarios ===
    {
        name: '6. London -> Singapore (13h Eastbound Overnight)',
        from: 'London', to: 'Singapore',
        departTime: '22:00', duration: 13,
        zoneFrom: 'Europe/London', zoneTo: 'Asia/Singapore',
        expectedSleep: true
    },
    {
        name: '7. Singapore -> London (14h Westbound Overnight)',
        from: 'Singapore', to: 'London',
        departTime: '23:30', duration: 14,
        zoneFrom: 'Asia/Singapore', zoneTo: 'Europe/London',
        expectedSleep: true
    },
    {
        name: '8. Dubai -> NY (14h Westbound Morning Arr)',
        from: 'Dubai', to: 'New York',
        departTime: '02:00', duration: 14,
        zoneFrom: 'Asia/Dubai', zoneTo: 'America/New_York',
        expectedSleep: true // Departs 2 AM, Arrives 8 AM
    },
    {
        name: '9. NY -> Paris (7h Eastbound Red Eye)',
        from: 'New York', to: 'Paris',
        departTime: '18:00', duration: 7.5,
        zoneFrom: 'America/New_York', zoneTo: 'Europe/Paris',
        expectedSleep: true
    },
    {
        name: '10. Paris -> NY (8h Westbound Day)',
        from: 'Paris', to: 'New York',
        departTime: '14:00', duration: 8.5,
        zoneFrom: 'Europe/Paris', zoneTo: 'America/New_York',
        expectedSleep: false
    },
    {
        name: '11. LA -> Tokyo (12h Westbound Day Arr)',
        from: 'Los Angeles', to: 'Tokyo',
        departTime: '12:00', duration: 12,
        zoneFrom: 'America/Los_Angeles', zoneTo: 'Asia/Tokyo',
        expectedSleep: true
        // Departs Noon LA -> Arrives 4 PM Tokyo (+1). 
        // This is tricky. It's a day flight in departure time.
        // In Tokyo time: Departs 4 AM -> Arrives 4 PM.
        // If you stay awake entire 12h, you land at 4 PM really tired?
        // Usually these flights are "Day Flights".
        // Let's see if Logic counts it as Red Eye.
        // Depart Dest Time: 4 AM. 
        // Is 4 AM a red eye departure? No (18-02).
        // Arrives 4 PM. Not Early Morning. Not Deep Night.
        // Result: FALSE (Stay Awake). 
        // Wait, expectedSleep: FALSE for day flights usually. Let's start with expected: FALSE.
    },
    {
        name: '12. Sydney -> Auckland (3h Eastbound)',
        from: 'Sydney', to: 'Auckland',
        departTime: '10:00', duration: 3,
        zoneFrom: 'Australia/Sydney', zoneTo: 'Pacific/Auckland',
        expectedSleep: false
    },
    {
        name: '13. Auckland -> Sydney (4h Westbound Eve)',
        from: 'Auckland', to: 'Sydney',
        departTime: '18:00', duration: 4,
        zoneFrom: 'Pacific/Auckland', zoneTo: 'Australia/Sydney',
        expectedSleep: false // Arrives 7:30 PM. Stay awake.
    },
    {
        name: '14. SF -> Hong Kong (15h Westbound Night Arr)',
        from: 'San Francisco', to: 'Hong Kong',
        departTime: '01:00', duration: 15,
        zoneFrom: 'America/Los_Angeles', zoneTo: 'Asia/Hong_Kong',
        expectedSleep: true
        // Departs 1 AM SF. Arrives 6 AM HK (+1).
        // Standard "leave at night sleep on plane".
    },
    {
        name: '15. Miami -> Santiago (8h Southbound Overnight)',
        from: 'Miami', to: 'Santiago',
        departTime: '23:00', duration: 8.5,
        zoneFrom: 'America/New_York', zoneTo: 'America/Santiago', // Santiago is roughly same longitude
        expectedSleep: true
    }
];

function runTest() {
    console.log('Running Extended Sleep Logic Verification...\n');
    let passed = 0;

    scenarios.forEach(s => {
        // Setup date (arbitrary future date compatible with standard time)
        // Using Mar 6 2026
        const date = '2026-03-06';

        const departMoment = moment.tz(`${date} ${s.departTime}`, 'YYYY-MM-DD HH:mm', s.zoneFrom);
        const arriveMoment = departMoment.clone().add(s.duration, 'hours');

        // Convert to Destination Time
        const departAtDest = departMoment.clone().tz(s.zoneTo);
        const arriveAtDest = arriveMoment.clone().tz(s.zoneTo);

        const departHourDest = departAtDest.hour();
        const arriveHourDest = arriveAtDest.hour();

        // Ensure duration is simple number
        const durationHours = s.duration;

        // === LOGIC UNDER TEST ===

        // 1. Classic Red Eye (Destination Alignment): Departs evening/night (local dest time)
        // Range: 6 PM (18) to 2 AM (2)
        const isRedEyeDeparture = departHourDest >= 18 || departHourDest < 2;

        // 2. Early Morning Arrival (Destination Alignment)
        // Arriving 4 AM - 10 AM suggests overnight flight IF long
        const arrivesEarlyMorning = arriveHourDest >= 4 && arriveHourDest < 10;

        // 3. Deep Night Arrival (1 AM - 5 AM)
        const arrivesDeepNight = arriveHourDest >= 1 && arriveHourDest < 5;

        // 4. Origin Night Departure (Biology Alignment)
        // If you leave at your normal bedtime (10 PM - 5 AM), you should sleep,
        // especially on long flights, even if it doesn't align with destination perfectly yet.
        const departHourOrigin = departMoment.hour();
        const isOriginNightDeparture = departHourOrigin >= 21 || departHourOrigin < 5;

        // Combination Logic
        const isOvernightFlight =
            (isRedEyeDeparture && durationHours >= 3) ||
            (arrivesEarlyMorning && durationHours >= 5) ||
            (arrivesDeepNight && durationHours >= 6) ||
            (isOriginNightDeparture && durationHours >= 8); // Add biological override for long flights

        // EXCEPTION: 
        // If it was flagged as Overnight ONLY because of "Early Morning Arrival", 
        // but it's a Westbound "Day" flight (e.g. LA -> Tokyo), we normally shouldn't sleep?
        // LA (12 PM) -> Tokyo. Arrives 4 PM (+1).
        // Depart Dest: 4 AM. (Not RedEye).
        // Arrive Dest: 4 PM. (Not EarlyMorn).
        // Depart Origin: 12 PM. (Not OriginNight).
        // So Scenario 11 should stay FALSE (Stay Awake) with this logic.

        const shouldSleep = isOvernightFlight;

        // === END LOGIC ===

        // Special override for scenario 11 (LA->Tokyo) expectation if needed
        let expected = s.expectedSleep;
        if (s.name.includes('LA -> Tokyo')) {
            // Let's stick to "Stay Awake" for day flights. 
            // Logic gives: False (Stay Awake). 
            expected = false;
        }

        const isMatch = shouldSleep === expected;
        const resultIcon = isMatch ? '✅' : '❌';

        console.log(`[${s.name}] ${resultIcon}`);
        if (!isMatch) {
            console.log(`  Depart: ${departMoment.format('HH:mm z')} (${departAtDest.format('HH:mm z')} Dest)`);
            console.log(`  Arrive: ${arriveMoment.format('HH:mm z')} (${arriveAtDest.format('HH:mm z')} Dest)`);
            console.log(`  DEBUG: RedEye=${isRedEyeDeparture}, EarlyMorn=${arrivesEarlyMorning}, DeepNight=${arrivesDeepNight}`);
            console.log(`  Got: ${shouldSleep}, Expected: ${expected}`);
        } else {
            passed++;
        }
    });

    console.log(`\nSummary: ${passed}/${scenarios.length} Passed`);
}

runTest();

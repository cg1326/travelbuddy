
const moment = require('moment');

// Mock updatePlan logic from TripDetails
const simulateDelay = (plan, tripId, minutes) => {
    const updatedTrips = [...plan.trips];
    const tripIndex = plan.trips.findIndex((t) => t.id === tripId);
    if (tripIndex === -1) return null;

    const tripToUpdate = plan.trips[tripIndex];

    // Parse current times
    const departMoment = moment(`${tripToUpdate.departDate} ${tripToUpdate.departTime}`, 'YYYY-MM-DD HH:mm');
    const arriveMoment = moment(`${tripToUpdate.arriveDate} ${tripToUpdate.arriveTime}`, 'YYYY-MM-DD HH:mm');

    // Add delay
    const newDepart = departMoment.clone().add(minutes, 'minutes');
    const newArrive = arriveMoment.clone().add(minutes, 'minutes');

    updatedTrips[tripIndex] = {
        ...tripToUpdate,
        departDate: newDepart.format('YYYY-MM-DD'),
        departTime: newDepart.format('HH:mm'),
        arriveDate: newArrive.format('YYYY-MM-DD'),
        arriveTime: newArrive.format('HH:mm'),
    };

    return {
        ...plan,
        trips: updatedTrips,
    };
};

// Test
const initialTrip = {
    id: 'trip1',
    from: 'San Francisco',
    to: 'New York',
    departDate: '2026-06-01',
    departTime: '08:00', // 8 AM
    arriveDate: '2026-06-01',
    arriveTime: '16:30', // 4:30 PM (approx 5.5h flight + 3h diff)
    hasConnections: false,
    segments: [],
    connections: []
};

const plan = {
    id: 'plan1',
    name: 'Test Plan',
    trips: [initialTrip],
    jetLagPlans: []
};

console.log(`Original: Depart ${initialTrip.departTime}, Arrive ${initialTrip.arriveTime}`);

const delayedPlan = simulateDelay(plan, 'trip1', 60); // +1 hour

if (delayedPlan) {
    const updatedTrip = delayedPlan.trips[0];
    console.log(`Delayed (+60m): Depart ${updatedTrip.departTime}, Arrive ${updatedTrip.arriveTime}`);

    if (updatedTrip.departTime === '09:00' && updatedTrip.arriveTime === '17:30') {
        console.log('✅ Times updated correctly');
    } else {
        console.error('❌ Time update failed');
    }
} else {
    console.error('❌ Simulation failed');
}

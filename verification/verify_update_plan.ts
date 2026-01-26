
// Verification script for updatePlan logic regarding data preservation

interface Trip {
    id: string;
    from: string;
    to: string;
    departTime?: string;
    arriveTime?: string;
    arrivalRestStatus?: string;
    arrivalRestRecordedAt?: string;
}

interface Plan {
    id: string;
    name: string;
    trips: Trip[];
}

// Mocking the update logic from PlanContext.tsx
function updatePlanLogic(
    currentPlan: Plan,
    newTrips: Trip[]
): Plan {

    const updatedTrips = newTrips.map((newTrip) => {
        // Find matching existing trip by ID to preserve status data
        const existingTrip = currentPlan.trips.find(t => t.id === newTrip.id);

        // Only preserve status if the route hasn't changed significantly (same from/to)
        // If destination changes (Test Case 6), user likely needs to re-evaluate exhaustion
        if (existingTrip && existingTrip.from === newTrip.from && existingTrip.to === newTrip.to) {
            return {
                ...newTrip,
                arrivalRestStatus: existingTrip.arrivalRestStatus,
                arrivalRestRecordedAt: existingTrip.arrivalRestRecordedAt
            };
        }
        return newTrip;
    });

    return {
        ...currentPlan,
        trips: updatedTrips
    };
}

// TEST CASES

function runTests() {
    console.log('Running Verification Tests for updatePlan logic...\n');

    // Setup initial plan with exhaustion recorded
    const initialPlan: Plan = {
        id: 'plan_1',
        name: 'Test Plan',
        trips: [
            {
                id: 'trip_1',
                from: 'NYC',
                to: 'London',
                arrivalRestStatus: 'Exhausted', // User recorded this
                arrivalRestRecordedAt: '2025-01-25T10:00:00Z'
            }
        ]
    };

    // TEST CASE 5: Edit Time (Same Route)
    console.log('Test Case 5: Edit Time (Same Route) - Should PRESERVE status');
    const newTripsSameRoute: Trip[] = [
        {
            id: 'trip_1',
            from: 'NYC',
            to: 'London', // Same route
            departTime: 'New Time'
        }
    ];

    const updatedPlanSameRoute = updatePlanLogic(initialPlan, newTripsSameRoute);
    const updatedTripSameRoute = updatedPlanSameRoute.trips[0];

    if (updatedTripSameRoute.arrivalRestStatus === 'Exhausted') {
        console.log('✅ PASS: Arrival rest status preserved.');
    } else {
        console.error('❌ FAIL: Arrival rest status lost!', updatedTripSameRoute);
    }
    console.log('--------------------------------------------------');


    // TEST CASE 6: Change Route
    console.log('Test Case 6: Change Route (Different Destination) - Should RESET status');
    const newTripsDifferentRoute: Trip[] = [
        {
            id: 'trip_1',
            from: 'NYC',
            to: 'Paris', // Changed destination
            departTime: 'New Time'
        }
    ];

    const updatedPlanDifferentRoute = updatePlanLogic(initialPlan, newTripsDifferentRoute);
    const updatedTripDifferentRoute = updatedPlanDifferentRoute.trips[0];

    if (updatedTripDifferentRoute.arrivalRestStatus === undefined) {
        console.log('✅ PASS: Arrival rest status reset.');
    } else {
        console.error('❌ FAIL: Arrival rest status should be reset but is:', updatedTripDifferentRoute.arrivalRestStatus);
    }
    console.log('--------------------------------------------------');

}

runTests();

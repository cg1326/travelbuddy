import moment from 'moment-timezone';
import { Trip } from './jetLagAlgorithm';
import { getCityTimezone } from './jetLagAlgorithm';

export interface ConflictInfo {
    hasConflict: boolean;
    conflictType?: 'forward' | 'backward';
    tripIndex?: number;
    message?: string;
}

/**
 * Check if trips have connection conflicts (arrival/departure overlaps)
 * @param trips Array of trips to validate
 * @returns ConflictInfo object with conflict details
 */
export function checkForConnectionConflicts(trips: Trip[]): ConflictInfo {
    if (!trips || trips.length < 2) {
        return { hasConflict: false };
    }

    for (let i = 0; i < trips.length; i++) {
        const currentTrip = trips[i];

        // Get current trip's landing time
        const currentLastSegment = currentTrip.segments && currentTrip.segments.length > 0
            ? currentTrip.segments[currentTrip.segments.length - 1]
            : null;

        const currentLandingMoment = currentLastSegment
            ? moment.tz(
                `${currentLastSegment.arriveDate} ${currentLastSegment.arriveTime}`,
                'YYYY-MM-DD HH:mm',
                getCityTimezone(currentLastSegment.to)
            )
            : moment.tz(
                `${currentTrip.arriveDate} ${currentTrip.arriveTime}`,
                'YYYY-MM-DD HH:mm',
                getCityTimezone(currentTrip.to)
            );

        // Forward check: Does current trip land after next trip departs?
        if (i < trips.length - 1) {
            const nextTrip = trips[i + 1];
            const nextTripDepartMoment = moment.tz(
                `${nextTrip.departDate} ${nextTrip.departTime}`,
                'YYYY-MM-DD HH:mm',
                getCityTimezone(nextTrip.from)
            );

            if (currentLandingMoment.isAfter(nextTripDepartMoment)) {
                return {
                    hasConflict: true,
                    conflictType: 'forward',
                    tripIndex: i,
                    message: `Trip ${i + 1} (${currentTrip.from} → ${currentTrip.to}) arrives after Trip ${i + 2} (${nextTrip.from} → ${nextTrip.to}) departs.`
                };
            }
        }

        // Backward check: Does current trip depart before previous trip arrives?
        if (i > 0) {
            const prevTrip = trips[i - 1];
            const prevLastSegment = prevTrip.segments && prevTrip.segments.length > 0
                ? prevTrip.segments[prevTrip.segments.length - 1]
                : null;

            const prevLandingMoment = prevLastSegment
                ? moment.tz(
                    `${prevLastSegment.arriveDate} ${prevLastSegment.arriveTime}`,
                    'YYYY-MM-DD HH:mm',
                    getCityTimezone(prevLastSegment.to)
                )
                : moment.tz(
                    `${prevTrip.arriveDate} ${prevTrip.arriveTime}`,
                    'YYYY-MM-DD HH:mm',
                    getCityTimezone(prevTrip.to)
                );

            const currentDepartMoment = moment.tz(
                `${currentTrip.departDate} ${currentTrip.departTime}`,
                'YYYY-MM-DD HH:mm',
                getCityTimezone(currentTrip.from)
            );

            if (currentDepartMoment.isBefore(prevLandingMoment)) {
                return {
                    hasConflict: true,
                    conflictType: 'backward',
                    tripIndex: i,
                    message: `Trip ${i + 1} (${currentTrip.from} → ${currentTrip.to}) departs before Trip ${i} (${prevTrip.from} → ${prevTrip.to}) arrives.`
                };
            }
        }
    }

    return { hasConflict: false };
}

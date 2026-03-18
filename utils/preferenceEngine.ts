import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { calculateTimezoneDiff } from './jetLagAlgorithm';
import type { OutcomeRating, HITLSuggestion, HITLSuggestionType, Plan, UserSettings, PlanEditEvent } from '../types/models';

export const PREFERENCE_STORAGE_KEYS = {
    EDIT_EVENTS: '@travelbuddy_edit_events',
    COMMITTED_SKIPS: '@travelbuddy_committed_skips',
    OUTCOME_RATINGS: '@travelbuddy_outcome_ratings',
    HITL_QUEUE: '@travelbuddy_hitl_queue',
};

export async function getEditEvents(): Promise<PlanEditEvent[]> {
    try {
        const raw = await AsyncStorage.getItem(PREFERENCE_STORAGE_KEYS.EDIT_EVENTS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function recordEditEvent(event: PlanEditEvent, userSettings: UserSettings) {
    try {
        const events = await getEditEvents();
        events.push(event);
        // Only keep the most recent 20 edit events to keep storage small
        const recentEvents = events.slice(-20);
        await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.EDIT_EVENTS, JSON.stringify(recentEvents));

        // Evaluate for routine shifts
        if (event.preferenceCategory === 'routine') {
            await evaluateRoutineShifts(recentEvents, userSettings);
        }
    } catch (e) {
        console.error('Failed to record edit event', e);
    }
}

export async function getHITLQueue(): Promise<HITLSuggestion[]> {
    try {
        const raw = await AsyncStorage.getItem(PREFERENCE_STORAGE_KEYS.HITL_QUEUE);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export async function addHITLSuggestion(suggestion: HITLSuggestion) {
    try {
        const queue = await getHITLQueue();

        // Replacement Logic: If a suggestion of the same type already exists, replace it.
        // This ensures the user sees the latest calculated average rather than being blocked by an old suggestion.
        const existingIndex = queue.findIndex(s => s.type === suggestion.type);

        if (existingIndex !== -1) {
            console.log(`[HITL Engine] Replacing existing suggestion of type ${suggestion.type}`);
            queue[existingIndex] = suggestion;
        } else {
            queue.push(suggestion);
        }

        await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.HITL_QUEUE, JSON.stringify(queue));
    } catch (e) {
        console.error('Failed to add HITL suggestion', e);
    }
}

export async function dismissHITLSuggestion(id: string) {
    try {
        const queue = await getHITLQueue();
        const updated = queue.filter(s => s.id !== id);
        await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.HITL_QUEUE, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to dismiss HITL suggestion', e);
    }
}

/**
 * Removes any HITL suggestions that are already reflected in the user's current settings.
 * This prevents the banner from showing redundant popups.
 */
export async function pruneHITLQueue(userSettings: UserSettings) {
    try {
        const queue = await getHITLQueue();
        const filtered = queue.filter(s => {
            if (s.type === 'speed_east') {
                return Number(s.targetValue) !== userSettings.recoveryMultiplierEast;
            }
            if (s.type === 'speed_west') {
                return Number(s.targetValue) !== userSettings.recoveryMultiplierWest;
            }
            return true;
        });

        if (filtered.length !== queue.length) {
            console.log(`[HITL] Pruned ${queue.length - filtered.length} redundant suggestions from queue`);
            await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.HITL_QUEUE, JSON.stringify(filtered));
        }
    } catch (e) {
        console.error('Failed to prune HITL queue', e);
    }
}

export async function getOutcomeRatings(): Promise<OutcomeRating[]> {
    try {
        const raw = await AsyncStorage.getItem(PREFERENCE_STORAGE_KEYS.OUTCOME_RATINGS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Clears stored outcome ratings and HITL suggestions for a specific travel direction.
 * Called when the user resets a personalization from the Travel Style screen.
 */
export async function clearRatingsForDirection(direction: 'east' | 'west', plans: Plan[]) {
    try {
        // 1. Filter out ratings that belong to this direction
        const ratings = await getOutcomeRatings();
        const kept = ratings.filter(r => {
            const plan = plans.find(p => p.id === r.planId ||
                (r.planId.startsWith('test-plan-') && p === plans[plans.length - 1]));
            if (!plan || !plan.trips.length) return false;
            // Trip identification: preserve multi-trip logic
            const tripIdx = (r.tripIndex !== undefined) ? r.tripIndex : plan.trips.length - 1;
            const trip = plan.trips[tripIdx];
            if (!trip) return false;

            const tzDiff = calculateTimezoneDiff(trip.from, trip.to, trip.departDate, trip.fromTz, trip.toTz);
            const ratingDir = tzDiff > 0 ? 'east' : 'west';
            return ratingDir !== direction; // keep ratings for the OTHER direction
        });
        await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.OUTCOME_RATINGS, JSON.stringify(kept));

        // 2. Clear HITL queue entries for this direction
        const queue = await getHITLQueue();
        const filteredQueue = queue.filter(s => !s.type.includes(direction));
        await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.HITL_QUEUE, JSON.stringify(filteredQueue));

        console.log(`[HITL] Reset ${direction} direction: removed ${ratings.length - kept.length} ratings, ${queue.length - filteredQueue.length} queue items`);
    } catch (e) {
        console.error('Failed to clear ratings for direction', e);
    }
}

export async function submitOutcomeRating(rating: OutcomeRating, plans: Plan[], userSettings: UserSettings) {
    try {
        const ratings = await getOutcomeRatings();
        // Update if exists for planId AND tripIndex, else push
        const existingIdx = ratings.findIndex(r => r.planId === rating.planId && r.tripIndex === rating.tripIndex);
        if (existingIdx >= 0) {
            ratings[existingIdx] = rating;
        } else {
            ratings.push(rating);
        }
        await AsyncStorage.setItem(PREFERENCE_STORAGE_KEYS.OUTCOME_RATINGS, JSON.stringify(ratings));

        await evaluateRecoverySpeeds(ratings, plans, userSettings);
    } catch (e) {
        console.error('Failed to submit outcome rating', e);
    }
}

export async function evaluateRecoverySpeeds(ratings: OutcomeRating[], plans: Plan[], userSettings: UserSettings) {
    // Lever A: evaluate recovery speeds per direction
    // Separate into East and West buckets
    const eastRatings: { tzDiffArgs: number, days: number }[] = [];
    const westRatings: { tzDiffArgs: number, days: number }[] = [];

    console.log(`[HITL Engine] Evaluating ${ratings.length} total ratings...`);

    for (const rating of ratings) {
        let plan = plans.find(p => p.id === rating.planId);

        // --- TEMPORARY TEST OVERRIDE ---
        // If this is a fake test plan ID, just use the most recent plan to get a valid tzDiff
        if (!plan && rating.planId.startsWith('test-plan-')) {
            plan = plans[plans.length - 1];
        }
        // -------------------------------

        if (!plan || !plan.trips.length) {
            console.log(`[HITL Engine] Skipping rating for planId=${rating.planId} - plan not found`);
            continue;
        }

        // Use the specific trip being rated. Default to last trip for legacy ratings.
        const tripIdx = (rating.tripIndex !== undefined) ? rating.tripIndex : plan.trips.length - 1;
        const trip = plan.trips[tripIdx];

        if (!trip) {
            console.log(`[HITL Engine] Skipping rating - trip not found at index ${tripIdx}`);
            continue;
        }

        const tzDiffHours = calculateTimezoneDiff(
            trip.from, trip.to, trip.departDate, trip.fromTz, trip.toTz
        );

        console.log(`[HITL Engine] Rating: planId=${rating.planId} days=${rating.adjustmentDays} tzDiff=${tzDiffHours} direction=${tzDiffHours > 0 ? 'east' : 'west'}`);

        if (Math.abs(tzDiffHours) < 1) {
            console.log(`[HITL Engine] Skipping - tzDiff too small`);
            continue;
        }

        if (tzDiffHours > 0) {
            eastRatings.push({ tzDiffArgs: Math.abs(tzDiffHours), days: rating.adjustmentDays });
        } else {
            westRatings.push({ tzDiffArgs: Math.abs(tzDiffHours), days: rating.adjustmentDays });
        }
    }

    console.log(`[HITL Engine] --- Bucket Totals ---`);
    // LIMIT HISTORY: Only use the most recent 5 ratings per direction.
    // This ensures the engine responds to the user's current recovery patterns 
    // and isn't "polluted" by old data from months/years ago.
    const recentEast = eastRatings.slice(-5);
    const recentWest = westRatings.slice(-5);

    console.log(`[HITL Engine] East: ${recentEast.length} recent ratings (total ${eastRatings.length})`);
    console.log(`[HITL Engine] West: ${recentWest.length} recent ratings (total ${westRatings.length})`);

    // Evaluate East
    if (recentEast.length >= 2) {
        const suggestion = calculateRecoverySuggestion(recentEast, 'east', userSettings.recoveryMultiplierEast);
        if (suggestion) {
            console.log(`[HITL Engine] Queueing East suggestion: ${suggestion.id}`);
            await addHITLSuggestion(suggestion);
        } else {
            console.log(`[HITL Engine] East: No change needed (average is normal or matches existing setting)`);
        }
    } else {
        console.log(`[HITL Engine] East: Waiting for 2 ratings (have ${recentEast.length})`);
    }

    // Evaluate West
    if (recentWest.length >= 2) {
        const suggestion = calculateRecoverySuggestion(recentWest, 'west', userSettings.recoveryMultiplierWest);
        if (suggestion) {
            console.log(`[HITL Engine] Queueing West suggestion: ${suggestion.id}`);
            await addHITLSuggestion(suggestion);
        } else {
            console.log(`[HITL Engine] West: No change needed (average is normal or matches existing setting)`);
        }
    } else {
        console.log(`[HITL Engine] West: Waiting for 2 ratings (have ${recentWest.length})`);
    }
}

function calculateRecoverySuggestion(ratings: { tzDiffArgs: number, days: number }[], direction: 'east' | 'west', currentMultiplier?: number): HITLSuggestion | null {
    // Average the reported multiplier
    let totalMultiplier = 0;
    for (const r of ratings) {
        const baseline = Math.max(3, Math.ceil(r.tzDiffArgs / 2));
        // Capped response: no less than 2, no more than tzDiff*0.8, up to 7 max
        const safeReported = Math.min(Math.max(2, r.days), Math.max(Math.ceil(r.tzDiffArgs * 0.8), 2), 7);
        const multiplier = safeReported / baseline;
        console.log(`[HITL Calc] ${direction}: days=${r.days} tzDiff=${r.tzDiffArgs} baseline=${baseline} safeReported=${safeReported} multiplier=${multiplier.toFixed(2)}`);
        totalMultiplier += multiplier;
    }
    const avgMultiplier = totalMultiplier / ratings.length;
    console.log(`[HITL Calc] ${direction} avgMultiplier=${avgMultiplier.toFixed(2)} (threshold: fast<=0.85, slow>=1.25)`);

    if (avgMultiplier <= 0.85) { // Faster
        const target = Math.round(avgMultiplier * 10) / 10;
        if (currentMultiplier === target) return null; // No change needed

        return {
            id: `speed_${direction}_fast`,
            type: `speed_${direction}` as HITLSuggestionType,
            promptText: `You recover faster than average when flying ${direction === 'east' ? 'East' : 'West'}! Want travel buddy to shorten your adjust phases on future trips?`,
            targetValue: target,
            timestamp: new Date().toISOString()
        };
    } else if (avgMultiplier >= 1.25) { // Slower
        const target = Math.round(avgMultiplier * 10) / 10;
        if (currentMultiplier === target) return null; // No change needed

        return {
            id: `speed_${direction}_slow`,
            type: `speed_${direction}` as HITLSuggestionType,
            promptText: `You tend to need a little more time to recover when flying ${direction === 'east' ? 'East' : 'West'}. Want travel buddy to extend your adjust phases on future trips?`,
            targetValue: target,
            timestamp: new Date().toISOString()
        };
    } else if (currentMultiplier !== undefined && currentMultiplier !== 1.0) {
        // Convergence Logic: Average has returned to Normal, but user has an active personalization
        return {
            id: `speed_${direction}_reset`,
            type: `speed_${direction}` as HITLSuggestionType,
            promptText: `Your recent trips show you're adjusting normally again when flying ${direction === 'east' ? 'East' : 'West'}. Reset to the standard adjustment speed?`,
            targetValue: 1.0,
            timestamp: new Date().toISOString()
        };
    }

    return null;
}

export async function evaluateRoutineShifts(events: PlanEditEvent[], userSettings: UserSettings) {
    // Lever D: Routine Shifting
    // Analyze edits specifically to 'Sleep' or 'Wake' cards to see if user is consistently moving them

    const routineEdits = events.filter(e => e.preferenceCategory === 'routine' && e.cardType);
    if (routineEdits.length < 3) return; // Need at least 3 data points

    // Separate by card type (Sleep, Wake)
    const sleepEdits = routineEdits.filter(e => e.cardType === 'Sleep');
    const wakeEdits = routineEdits.filter(e => e.cardType === 'Wake');

    if (sleepEdits.length >= 3) {
        await suggestShift(sleepEdits, 'Sleep', userSettings.normalBedtime);
    }

    if (wakeEdits.length >= 3) {
        await suggestShift(wakeEdits, 'Wake', userSettings.normalWakeTime);
    }
}

async function suggestShift(edits: PlanEditEvent[], type: 'Sleep' | 'Wake', currentSetting: string) {
    // Calculate average offset
    let totalOffsetMinutes = 0;
    for (const edit of edits) {
        const orig = moment(edit.originalValue, 'HH:mm');
        const mod = moment(edit.modifiedValue, 'HH:mm');
        let diff = mod.diff(orig, 'minutes');

        // Handle midnight crossing
        if (diff > 720) diff -= 1440;
        if (diff < -720) diff += 1440;

        totalOffsetMinutes += diff;
    }

    const avgOffset = totalOffsetMinutes / edits.length;

    // Threshold: consistent shift of average 45+ minutes
    if (Math.abs(avgOffset) >= 45) {
        const roundedOffset = Math.round(avgOffset / 15) * 15; // Round to nearest 15 mins
        const currentMom = moment(currentSetting, 'HH:mm');
        const targetMom = currentMom.clone().add(roundedOffset, 'minutes');
        const targetValue = targetMom.format('HH:mm');

        if (targetValue === currentSetting) return;

        const direction = avgOffset > 0 ? 'later' : 'earlier';
        const typeLabel = type === 'Sleep' ? 'bedtime' : 'wake time';

        await addHITLSuggestion({
            id: `shift_${type.toLowerCase()}`,
            type: 'shift_routine',
            promptText: `You consistently move your ${typeLabel} ${Math.abs(roundedOffset)} mins ${direction}. Update your normal ${typeLabel} to ${targetMom.format('h:mm A')} for future plans?`,
            targetValue: targetValue,
            timestamp: new Date().toISOString()
        });
    }
}

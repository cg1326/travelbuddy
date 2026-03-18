/**
 * Shared type definitions for TravelBuddy app
 * Single source of truth for all data models
 */

export interface Connection {
    city: string;
    duration: string;
}

export interface FlightSegment {
    from: string;
    to: string;
    fromTz?: string;
    toTz?: string;
    departDate: string;
    departTime: string;
    arriveDate: string;
    arriveTime: string;
}

export interface Trip {
    id: string;
    from: string;
    to: string;
    fromTz?: string;
    toTz?: string;
    departDate: string;
    departTime: string;
    arriveDate: string;
    arriveTime: string;
    hasConnections: boolean;
    segments?: FlightSegment[];
    connections: Connection[];
    adjustmentPreference?: 'stay_home' | 'adjust';
    arrivalRestStatus?: 'exhausted' | 'ok';
    arrivalRestRecordedAt?: string;
}

export interface Card {
    id: string;
    title: string;
    time: string;
    icon: string;
    color: string;
    why: string;
    how: string;
    dateTime?: string;
    endDateTime?: string;
    isInfo?: boolean;
    isDailyRoutine?: boolean;
}

export interface Phase {
    name: string;
    dateRange: string;
    startDate?: string;
    endDate?: string;
    cards: Card[];
    durationDays?: number;
}

export interface JetLagPlan {
    tripId: string;
    from: string;
    to: string;
    departDate: string;
    phases: {
        prepare: Phase;
        travel: Phase;
        adjust: Phase;
    };
    strategy?: 'stay_home' | 'adjust';
    suppressPreparePhase?: boolean;
    suppressAdjustPhase?: boolean;
}

export interface UserSettings {
    normalBedtime: string;
    normalWakeTime: string;
    useMelatonin: boolean;
    useMagnesium: boolean;
    personalizationActive?: boolean;
    recoveryMultiplierEast?: number;
    recoveryMultiplierWest?: number;
    suppressedCardTypes?: string[];
    cardTimeOffsetHours?: number;
}

export type HITLSuggestionType = 'speed_east' | 'speed_west' | 'suppress_card' | 'shift_routine' | 'card_time_offset';

export interface HITLSuggestion {
    id: string;
    type: HITLSuggestionType;
    promptText: string;
    targetValue: string | number;
    timestamp: string;
}

export interface OutcomeRating {
    planId: string;
    tripIndex: number;
    adjustmentDays: number;
    timestamp: string;
}

export interface PlanEditEvent {
    id: string;
    planId: string;
    timestamp: string;
    field: string;
    originalValue: string;
    modifiedValue: string;
    preferenceCategory: 'accommodation' | 'activity' | 'pace' | 'routine';
    cardHour?: number;
    cardType?: string;
}

export interface PreferenceItem {
    label: string;
    category: 'accommodation' | 'activity' | 'pace';
    confidence: number;
    userVote?: 'up' | 'down';
    lastUpdated: string;
}

export interface UserPreferenceProfile {
    isActive: boolean;
    editEventCount: number;
    preferences: PreferenceItem[];
    lastUpdated: string;
}

export interface Plan {
    id: string;
    name: string;
    trips: Trip[];
    createdAt: string;
    jetLagPlans: JetLagPlan[];
    algorithmVersion?: string;  // For smart regeneration
}

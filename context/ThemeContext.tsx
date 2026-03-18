import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment-timezone';
import { usePlans } from './PlanContext';

// ─── Storage key ─────────────────────────────────────────────────────────────
const NIGHT_MODE_KEY = '@travelbuddy_time_based_night_mode';

export async function saveNightModeSetting(enabled: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(NIGHT_MODE_KEY, enabled ? 'true' : 'false');
    } catch (e) {
        console.warn('[ThemeContext] Failed to save night mode setting', e);
    }
}

// ─── Colors ──────────────────────────────────────────────────────────────────
export interface ThemeColors {
    bg: string;
    surface: string;
    text: string;
    subtext: string;
    border: string;
}

const LIGHT_COLORS: ThemeColors = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    subtext: '#64748B',
    border: '#E2E8F0',
};

const DARK_COLORS: ThemeColors = {
    bg: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    subtext: '#94A3B8',
    border: '#334155',
};

// ─── Context ──────────────────────────────────────────────────────────────────
interface ThemeContextValue {
    isDark: boolean;
    colors: ThemeColors;
    /** Whether the user has manually enabled night mode. */
    timeBasedNightMode: boolean;
    /** Instantly toggle night mode on/off and persist the setting. */
    setNightMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    isDark: false,
    colors: LIGHT_COLORS,
    timeBasedNightMode: false,
    setNightMode: () => { },
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme(); // 'dark' | 'light' | null
    const [nightModeOn, setNightModeOn] = useState(false);

    // Synchronously flip state and persist (fire-and-forget save)
    const setNightMode = useCallback((enabled: boolean) => {
        setNightModeOn(enabled);
        saveNightModeSetting(enabled);
    }, []);

    // Load persisted setting on mount
    useEffect(() => {
        AsyncStorage.getItem(NIGHT_MODE_KEY)
            .then(val => { if (val === 'true') setNightModeOn(true); })
            .catch(() => { });
    }, []);

    // Pull plans to find the active trip's destination timezone
    const { plans } = usePlans();

    // Determine current destination timezone (or fallback to local)
    const getDestinationTimezone = useCallback(() => {
        if (!plans || plans.length === 0) return moment.tz.guess();

        // Find the most recently active or upcoming trip across ALL plans
        // (not just plans[0] which may be an older plan)
        let bestTrip: any = null;
        let bestArrival = moment(0); // epoch

        for (const plan of plans) {
            if (!plan.trips || plan.trips.length === 0) continue;
            for (const t of plan.trips) {
                const arriveMoment = moment(`${t.arriveDate} ${t.arriveTime}`, 'YYYY-MM-DD HH:mm');
                const windowEnd = arriveMoment.clone().add(7, 'days');
                // Prefer the trip whose arrival window covers now, or failing that the most recent one
                if (moment().isBefore(windowEnd) && arriveMoment.isAfter(bestArrival)) {
                    bestArrival = arriveMoment;
                    bestTrip = t;
                }
            }
        }

        // Fallback: use the last trip of the first plan
        if (!bestTrip) {
            const fallback = plans[0];
            bestTrip = fallback?.trips?.[fallback.trips.length - 1];
        }

        if (!bestTrip) return moment.tz.guess();

        if (bestTrip.segments && bestTrip.segments.length > 0) {
            return bestTrip.segments[bestTrip.segments.length - 1].toTz || moment.tz.guess();
        }
        return bestTrip.toTz || moment.tz.guess();
    }, [plans]);

    const [isDark, setIsDark] = useState(systemScheme === 'dark');

    // Run the time calculation on a timer if time-based mode is on
    useEffect(() => {
        if (!nightModeOn) {
            setIsDark(systemScheme === 'dark');
            return;
        }

        const evaluateDarkMode = () => {
            const destTz = getDestinationTimezone();
            const currentHourInDest = parseInt(moment.tz(destTz).format('H'), 10);
            // Dark mode between 9 PM (21:00) and 7 AM (07:00)
            const shouldBeDark = currentHourInDest >= 21 || currentHourInDest < 7;
            setIsDark(shouldBeDark);
        };

        // Evaluate immediately
        evaluateDarkMode();

        // Check every minute if the hour ticked over
        const interval = setInterval(evaluateDarkMode, 60000);
        return () => clearInterval(interval);
    }, [nightModeOn, systemScheme, getDestinationTimezone]);

    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

    return (
        <ThemeContext.Provider value={{ isDark, colors, timeBasedNightMode: nightModeOn, setNightMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}

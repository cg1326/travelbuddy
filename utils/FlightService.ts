import { Platform } from 'react-native';

export interface FlightResult {
    flightNumber: string;
    airline: string;
    departure: {
        airport: string;
        iata: string;
        time: string; // ISO
        timezone: string;
    };
    arrival: {
        airport: string;
        iata: string;
        time: string; // ISO
        timezone: string;
    };
    status: string;
}

// TODO: Replace with your actual Firebase Project ID
const PROJECT_ID = "travel-buddy-jet-lag-app";
const REGION = "us-central1";

// For Android Emulator, use 10.0.2.2. For iOS, use localhost.
const LOCAL_FUNCTIONS_URL = Platform.OS === 'android'
    ? `http://10.0.2.2:5001/${PROJECT_ID}/${REGION}/lookupFlight`
    : `http://localhost:5001/${PROJECT_ID}/${REGION}/lookupFlight`;

const PROD_FUNCTIONS_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/lookupFlight`;

// Set this to true if you are running 'firebase emulators:start' locally
const USE_EMULATOR = false;

export const lookupFlight = async (flightNumber: string, date?: string): Promise<FlightResult> => {
    const url = USE_EMULATOR ? LOCAL_FUNCTIONS_URL : PROD_FUNCTIONS_URL;

    try {
        // Clean input
        const cleanFlight = flightNumber.trim().toUpperCase();

        // Build URL with query params
        const query = `?flight=${encodeURIComponent(cleanFlight)}&date=${encodeURIComponent(date || '')}`;
        const fullUrl = `${url}${query}`;

        console.log("Looking up flight:", fullUrl);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch flight details");
        }

        return data as FlightResult;

    } catch (error) {
        console.log("Flight Lookup Error:", error); // Log quietly to avoid Red Box
        throw error;
    }
};

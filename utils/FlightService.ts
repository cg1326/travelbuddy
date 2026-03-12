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

const PROJECT_ID = "travel-buddy-jet-lag-app";
const REGION = "us-central1";

// For Android Emulator, use 10.0.2.2. For iOS, use localhost.
const LOCAL_FUNCTIONS_URL = Platform.OS === 'android'
    ? `http://10.0.2.2:5001/${PROJECT_ID}/${REGION}/lookupFlight`
    : `http://localhost:5001/${PROJECT_ID}/${REGION}/lookupFlight`;

const PROD_FUNCTIONS_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/lookupFlight`;

// Set this to true if you are running 'firebase emulators:start' locally
const USE_EMULATOR = false;
// Set this to true to save API credits during development
const USE_MOCK_DATA = false;

export const lookupFlight = async (flightNumber: string, date?: string): Promise<FlightResult> => {
    // 1. Mock Mode Check (Saves Credits)
    if (USE_MOCK_DATA) {
        console.log("⚠️ Using MOCK data for flight lookup");
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    flightNumber: flightNumber.toUpperCase(),
                    airline: "Mock Airlines",
                    departure: {
                        airport: "New York (JFK)",
                        iata: "JFK",
                        time: date ? `${date}T08:00:00` : new Date().toISOString(),
                        timezone: "America/New_York"
                    },
                    arrival: {
                        airport: "London (LHR)",
                        iata: "LHR",
                        time: date ? `${date}T20:00:00` : new Date().toISOString(),
                        timezone: "Europe/London"
                    },
                    status: "Scheduled"
                });
            }, 1000); // Simulate network delay
        });
    }

    const url = USE_EMULATOR ? LOCAL_FUNCTIONS_URL : PROD_FUNCTIONS_URL;

    try {
        // Clean input
        const cleanFlight = flightNumber.trim().toUpperCase();

        // Build URL with query params
        const query = `?flight=${encodeURIComponent(cleanFlight)}&date=${encodeURIComponent(date || '')}`;
        const fullUrl = `${url}${query}`;

        // console.log("Looking up flight:", fullUrl);

        const fetchPromise = fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => {
                reject(new Error("Request timed out after 15 seconds. Please try again later."));
            }, 15000);
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch flight details");
        }

        return data as FlightResult;

    } catch (error) {
        // console.log("Flight Lookup Error:", error); 
        throw error;
    }
};

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Animated,
  Keyboard,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import Icon from 'react-native-vector-icons/Feather';


import { LEGACY_CITY_TIMEZONES, airportMappings, getCityTimezone, findCityUniversal, findCityByIATA } from '../utils/jetLagAlgorithm';
import { usePlans } from '../context/PlanContext';

// Valid cities from jetLagAlgorithm.ts (Legacy list for autocomplete/fuzzy match)
const VALID_CITIES = Object.keys(LEGACY_CITY_TIMEZONES);

// Fuzzy match city name
function findClosestCity(input: string): string | null {
  if (!input || input.trim().length < 2) return null;

  const normalized = input.trim().toLowerCase();
  const upperInput = input.trim().toUpperCase();

  // 1. Check Airport Codes match (Legacy IATA)
  // Check if IATA maps to something in our list
  if (airportMappings[upperInput]) {
    // Return the city name if valid
    return airportMappings[upperInput];
  }

  // 2. Check Universal IATA (New)
  // If input is 3 chars, try looking it up in global DB
  if (input.trim().length === 3) {
    const universalIATA = findCityByIATA(input.trim());
    if (universalIATA) {
      // Must verify the returned city actually exists in our Timezone DB
      const validatedCity = findCityUniversal(universalIATA);
      if (validatedCity) {
        return validatedCity.city;
      } else {
        // IATA code recognized, but city has no timezone data
        // Return null to show error rather than falling through to fuzzy matching
        // (prevents "BDA" -> "Bermuda" -> null -> fuzzy match "Lima")
        return null;
      }
    }
  }

  // 3. Exact match in Legacy List
  const exactMatch = VALID_CITIES.find(city => city.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // 3. Exact unique match in Library (Universal Support)
  // If not in legacy, check the library!
  const universal = findCityUniversal(input.trim());
  if (universal) {
    // Return the city name found in DB to correct capitalization
    return universal.city;
  }

  // 4. Starts with match (Legacy)
  const startsWithMatch = VALID_CITIES.find(city =>
    city.toLowerCase().startsWith(normalized)
  );
  if (startsWithMatch) return startsWithMatch;

  // 5. Contains match (Legacy)
  const containsMatch = VALID_CITIES.find(city =>
    city.toLowerCase().includes(normalized)
  );
  if (containsMatch) return containsMatch;

  // 6. Levenshtein distance for typos (Legacy - only for core cities to avoid massive search)
  const distances = VALID_CITIES.map(city => ({
    city,
    distance: levenshteinDistance(normalized, city.toLowerCase())
  }));

  const closest = distances.sort((a, b) => a.distance - b.distance)[0];

  // Only suggest if distance is reasonable (max 3 edits for reasonable match)
  if (closest.distance <= 3) {
    return closest.city;
  }

  return null;
}

// Calculate Levenshtein distance (edit distance between strings)
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Validate a single trip
function validateTrip(trip: {
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  connections: any[];
}): { valid: boolean; errors: string[]; suggestions: { field: string; suggested: string }[] } {
  const errors: string[] = [];
  const suggestions: { field: string; suggested: string }[] = [];

  // Validate departure city
  const fromMatch = findClosestCity(trip.from);
  if (!fromMatch) {
    errors.push(`Departure city "${trip.from}" is not recognized. Please use a supported city.`);
  } else if (fromMatch !== trip.from) {
    suggestions.push({ field: 'from', suggested: fromMatch });
  }

  // Validate arrival city
  const toMatch = findClosestCity(trip.to);
  if (!toMatch) {
    errors.push(`Arrival city "${trip.to}" is not recognized. Please use a supported city.`);
  } else if (toMatch !== trip.to) {
    suggestions.push({ field: 'to', suggested: toMatch });
  }

  // Validate dates and times
  if (!trip.departDate || !trip.departTime) {
    errors.push('Departure date and time are required.');
  }

  if (!trip.arriveDate || !trip.arriveTime) {
    errors.push('Arrival date and time are required.');
  }

  // Validate arrival is after departure
  if (trip.departDate && trip.departTime && trip.arriveDate && trip.arriveTime) {
    const departMoment = moment(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm');
    const arriveMoment = moment(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm');

    if (!departMoment.isValid()) {
      errors.push('Invalid departure date or time format.');
    }

    if (!arriveMoment.isValid()) {
      errors.push('Invalid arrival date or time format.');
    }

    if (departMoment.isValid() && arriveMoment.isValid()) {
      // Allow arrival "before" departure in local time if traversing timezones (e.g. PEK -> SFO)
      // We could use timezone aware check here, but for now let's just warn or allow.
      // Since we don't have easy async access to timezone here without looking up city,
      // and finding closest city is sync but timezone lookup might be robust...
      // Let's just REMOVE the blocking check for now, or make it smarter?
      // Smarter: Check if To/From are different. If same city, then arrival must be after.
      // If different cities, allow it.

      const isSameCity = trip.from.trim().toLowerCase() === trip.to.trim().toLowerCase();
      if (isSameCity && arriveMoment.isSameOrBefore(departMoment)) {
        errors.push('Arrival time must be after departure time.');
      }
    }
  }

  // Validate connection cities
  trip.connections.forEach((conn, index) => {
    const connMatch = findClosestCity(conn.city);
    if (!connMatch) {
      errors.push(`Connection ${index + 1} city "${conn.city}" is not recognized.`);
    } else if (connMatch !== conn.city) {
      suggestions.push({ field: `connection-${index}`, suggested: connMatch });
    }
  });

  return { valid: errors.length === 0, errors, suggestions };
}

// Check for overlapping trips
function checkOverlappingTrips(
  newTrip: { departDate: string; departTime: string; arriveDate: string; arriveTime: string },
  existingTrips: Trip[],
  ignoreTripId?: string | null
): string | null {
  const newStart = moment(`${newTrip.departDate} ${newTrip.departTime}`, 'YYYY-MM-DD HH:mm');
  const newEnd = moment(`${newTrip.arriveDate} ${newTrip.arriveTime}`, 'YYYY-MM-DD HH:mm');

  if (!newStart.isValid() || !newEnd.isValid()) return null;

  for (const trip of existingTrips) {
    if (ignoreTripId && trip.id === ignoreTripId) continue;

    const existingStart = moment(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm');
    const existingEnd = moment(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm');

    // Check for overlap: (StartA < EndB) and (StartB < EndA)
    // Using isBefore/isAfter for moments.
    // Overlap if newStart is before existingEnd AND existingStart is before newEnd
    if (newStart.isBefore(existingEnd) && existingStart.isBefore(newEnd)) {
      const formattedStart = moment(trip.departDate).format('MM/DD/YYYY');
      const formattedEnd = moment(trip.arriveDate).format('MM/DD/YYYY');
      return `Conflict with existing trip to ${trip.to} (${formattedStart} - ${formattedEnd})`;
    }
  }
  return null;
}

interface FlightSegment {
  from: string;
  to: string;
  fromTz?: string;
  toTz?: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
}

interface Trip {
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
  segments: FlightSegment[];
  connections: any[];
  arrivalRestStatus?: 'exhausted' | 'ok';
  arrivalRestRecordedAt?: string;
}

export default function AddTrips({ route, navigation }: any) {
  const { planName, mode, existingPlanId } = route.params || {};
  const isEditMode = mode === 'edit';
  const { plans } = usePlans(); // Import from context

  // Fetch existing plan from context if editing
  const existingPlan = isEditMode && existingPlanId
    ? plans.find(p => p.id === existingPlanId)
    : null;



  // Mode selection
  const [inputMode, setInputMode] = useState<'simple' | 'detailed'>('simple');

  // Current segment being built
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromTz, setFromTz] = useState<string | undefined>(undefined);
  const [toTz, setToTz] = useState<string | undefined>(undefined);
  const [departDate, setDepartDate] = useState('');
  const [departTime, setDepartTime] = useState('');
  const [arriveDate, setArriveDate] = useState('');
  const [arriveTime, setArriveTime] = useState('');

  // Helper for strict UTC validation
  const validateFlightRealism = (
    dDate: string,
    dTime: string,
    aDate: string,
    aTime: string,
    origin: string,
    dest: string
  ) => {
    if (dDate && dTime && aDate && aTime) {
      const departTz = getCityTimezone(origin);
      const arriveTz = getCityTimezone(dest);

      const departMoment = moment.tz(`${dDate} ${dTime}`, 'YYYY-MM-DD HH:mm', departTz);
      const arriveMoment = moment.tz(`${aDate} ${aTime}`, 'YYYY-MM-DD HH:mm', arriveTz);

      if (arriveMoment.isBefore(departMoment)) {
        setDateTimeError('Impossible flight times (Arrival is before Departure)');
      } else {
        setDateTimeError('');
      }
    } else {
      setDateTimeError('');
    }
  };

  // Effect: Check for short trips (simple mode only for now, or check segments)
  useEffect(() => {
    // Only for direct flights in simple mode or when finishing detailed trip
    if (departDate && arriveDate && departTime && arriveTime) {
      // Logic: For this MVP, let's just use simple duration check
      // Ideally we check total trip duration including return, but here we only know THIS ONE WAY leg.
      // Wait, "Stay Home" strategy depends on Stay Duration at destination (time until NEXT flight).
      // Here we are just adding ONE trip leg (e.g. NY->London).
      // If the user hasn't added the return leg yet, we don't know the stay duration!

      // Pivot: Maybe specific strategy preference isn't best set PER TRIP leg, but we can offer it if the user knows.
      // Or, better: Just store "preference=stay_home" on the trip, and let algorithm decide if it APPLIES.

      // Let's settle on: If duration >= 3 days, default is Adjust. If < 3 days we offer choice?
      // Actually, since we don't know return trip yet, we can't auto-calculate stay duration accurately here.
      // BUT, we can ask the user "Is this a short trip (<3 days)?" NO, that's annoying.

      // Alternative: Just Add the toggle "Preferred Strategy" to ALL trips?
      // Or only show it if the user is editing?

      // Let's stick to the prompt: "toggle... that appears for short trips".
      // Since we can't know stay duration yet, maybe we just add the return flight THEN detect?
      // But we need to save the preference on THIS trip object.

      // Compromise: Show the option "Adjustment Goal" for ALL trips, defaulting to "Auto-Recommend".
      // Options: "Auto (Recommended)", "Stay on Home Time", "Full Adjustment".
      // That might be too complex.

      // Let's just default to hidden. The algorithm handles the defaults perfectly.
      // We only need to override if the user WANTS to "Stay Home" on a medium trip? Or "Adjust" on a short trip.
      // Maybe we show the toggle if duration < 4 days?

      const start = moment(departDate);
      const end = moment(arriveDate);
      // Rough check if flight itself is short? No.

      // OK, let's just set the state.
      // We'll show the UI element always for now, or maybe expandable?
    }
  }, [departDate, arriveDate]);

  // Date/time pickers
  const [showDepartDatePicker, setShowDepartDatePicker] = useState(false);
  const [showDepartTimePicker, setShowDepartTimePicker] = useState(false);
  const [showArriveDatePicker, setShowArriveDatePicker] = useState(false);
  const [showArriveTimePicker, setShowArriveTimePicker] = useState(false);
  const [selectedDepartDate, setSelectedDepartDate] = useState(new Date());
  const [selectedDepartTime, setSelectedDepartTime] = useState(new Date());
  const [selectedArriveDate, setSelectedArriveDate] = useState(new Date());
  const [selectedArriveTime, setSelectedArriveTime] = useState(new Date());

  // Trip building
  const [currentTripSegments, setCurrentTripSegments] = useState<FlightSegment[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>(
    isEditMode && existingPlan?.trips ? existingPlan.trips.map((t: any) => ({ ...t, segments: t.segments || [] })) : []
  );

  // Add these new states:
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);

  // Error states for inline validation
  const [fromError, setFromError] = useState('');
  const [toError, setToError] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');
  const [segmentSequenceError, setSegmentSequenceError] = useState('');

  // --- Flight Import State ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFlightNum, setImportFlightNum] = useState('');
  const [importDate, setImportDate] = useState(new Date());
  const [showImportDatePicker, setShowImportDatePicker] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [flightErrorMsg, setFlightErrorMsg] = useState<string | null>(null);
  const [flightOptions, setFlightOptions] = useState<any[]>([]);
  const [showFlightSelection, setShowFlightSelection] = useState(false);

  // Animation for Error Overlay
  const errorOpacity = React.useRef(new Animated.Value(0)).current;
  const errorSlideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [displayedError, setDisplayedError] = useState<string | null>(null);

  useEffect(() => {
    if (flightErrorMsg) {
      setDisplayedError(flightErrorMsg);
      Animated.parallel([
        Animated.timing(errorOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(errorSlideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(errorOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(errorSlideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start(() => setDisplayedError(null));
    }
  }, [flightErrorMsg]);


  // Helper: Map IATA code to user's preferred city name
  const mapIATAToCity = (iataCode: string, fullAirportName?: string): string => {
    // 1. Check Legacy Mapping (includes vacation destinations)
    const cityName = airportMappings[iataCode];
    if (cityName) {
      return cityName;
    }

    // 2. Universal IATA (Fallback)
    const universalCity = findCityByIATA(iataCode);
    if (universalCity) {
      const validated = findCityUniversal(universalCity);
      if (validated) return validated.city;
    }

    // 3. Smart Parse: Extract (City) from "City Name (IATA)"
    // e.g. "San Sebastian (EAS)" -> "San Sebastian"
    if (fullAirportName) {
      // Regex to capture text before the last parenthesized code
      // Match "City (CODE)" -> Group 1 is "City"
      const match = fullAirportName.match(/^(.*)\s+\([A-Z]{3}\)$/);
      if (match && match[1]) {
        const potentialCity = match[1].trim();
        // Verify this city exists in Library
        const universal = findCityUniversal(potentialCity);
        if (universal) {
          return potentialCity;
        }
      }
    }

    // Fallback to IATA code if no mapping found
    return iataCode;
  };

  // Helper function to process a specific flight (used when user selects from multiple options)
  const handleImportFlightWithData = (flightData: any) => {
    try {
      // Autofill the form with mapped city names
      setFrom(mapIATAToCity(flightData.departure.iata, flightData.departure.airport));
      setTo(mapIATAToCity(flightData.arrival.iata, flightData.arrival.airport));

      // Helper to parse ISO time strings
      // IMPORTANT: The API returns times in LOCAL airport time (e.g., "2026-02-18T00:30:00" = 12:30 AM Abu Dhabi time)
      // We want to preserve these exact values without ANY timezone conversion
      const parseDateTime = (isoString: string) => {
        if (!isoString) return null;
        console.log('DEBUG: Parsing time string:', isoString);
        // Extract date and time directly from the string without timezone parsing
        // Format: "2026-02-17T15:00:00" or "2026-02-17 15:00:00" -> date: "2026-02-17", time: "15:00"
        const match = isoString.match(/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2})/);
        if (!match) {
          console.log('DEBUG: Regex did not match!');
          return null;
        }
        console.log('DEBUG: Extracted date:', match[1], 'time:', match[2]);
        return {
          date: match[1],
          time: match[2]
        };
      };

      const dep = parseDateTime(flightData.departure.time);
      const arr = parseDateTime(flightData.arrival.time);

      console.log('DEBUG: Parsed departure:', dep);
      console.log('DEBUG: Parsed arrival:', arr);

      if (dep) {
        setDepartDate(dep.date);
        setDepartTime(dep.time);
        setSelectedDepartDate(moment(flightData.departure.time).toDate());
        setSelectedDepartTime(moment(flightData.departure.time).toDate());
      }

      if (arr) {
        setArriveDate(arr.date);
        setArriveTime(arr.time);
        setSelectedArriveDate(moment(flightData.arrival.time).toDate());
        setSelectedArriveTime(moment(flightData.arrival.time).toDate());
      }

      setShowImportModal(false);
      // Success popup removed per user request
    } catch (error) {
      console.error('Error processing flight data:', error);
      setFlightErrorMsg('Failed to process flight data. Please try again.');
    }
  };

  const handleImportFlight = async () => {
    Keyboard.dismiss(); // Dismiss keyboard so error is visible
    if (!importFlightNum.trim()) {
      setFlightErrorMsg('Please enter a flight number (e.g. UA 261)');
      return;
    }

    setIsImporting(true);
    try {
      // FIX: Use local date formatting (YYYY-MM-DD) instead of UTC (toISOString)
      // to avoid date shifting (e.g. Jan 17 9PM -> Jan 18 2AM UTC)
      const formattedDate = moment(importDate).format('YYYY-MM-DD');
      console.log(`DEBUG: Requesting Flight: ${importFlightNum} on Date: ${formattedDate}`);
      const result = await require('../utils/FlightService').lookupFlight(importFlightNum, formattedDate);
      console.log('DEBUG: Flight Result:', JSON.stringify(result, null, 2));

      // Check if multiple flights were returned (same flight number, different routes)
      console.log('DEBUG: Checking multiple flights:', {
        hasMultiple: result.multiple,
        hasFlights: !!result.flights,
        flightsLength: result.flights?.length,
        condition: result.multiple && result.flights && result.flights.length > 1
      });

      if (result.multiple && result.flights && result.flights.length > 1) {
        console.log('DEBUG: Setting flight selection modal to visible');
        setIsImporting(false);
        setShowImportModal(false);
        setFlightOptions(result.flights);
        setShowFlightSelection(true);
        return;
      }

      // Single flight or already selected - proceed with import
      const flightData = result.multiple ? result.flights[0] : result;

      // Store error message if data is incomplete (will show AFTER form populates)
      let pendingError: string | null = null;
      if (!flightData.departure.time && !flightData.arrival.time) {
        pendingError = "The Airline API found the flight path but returned NO TIME data. This usually means the flight is too far in the future or the airline hasn't published the schedule yet.";
      } else if (!flightData.departure.time) {
        pendingError = "We found the flight, but the Departure Time is missing from the airline data.";
      }

      // Autofill the form with mapped city names
      setFrom(mapIATAToCity(flightData.departure.iata, flightData.departure.airport));
      setTo(mapIATAToCity(flightData.arrival.iata, flightData.arrival.airport));

      // Handle Date/Time
      // The API returns ISO strings (e.g. 2024-05-20T10:00:00+00:00)
      // We need to parse them carefully.

      // Helper to parse time strings from API
      // Format: "2026-02-17 15:00-05:00" -> date: "2026-02-17", time: "15:00"
      const parseDateTime = (isoString: string) => {
        if (!isoString) return null;
        const match = isoString.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
        if (!match) return null;
        return {
          date: match[1],
          time: match[2]
        };
      };

      const dep = parseDateTime(flightData.departure.time);
      const arr = parseDateTime(flightData.arrival.time);

      if (dep) {
        setDepartDate(dep.date);
        setDepartTime(dep.time);
        setFromTz(flightData.departure.timezone);
        setSelectedDepartDate(moment(flightData.departure.time).toDate());
        setSelectedDepartTime(moment(flightData.departure.time).toDate());
      }

      if (arr) {
        setArriveDate(arr.date);
        setArriveTime(arr.time);
        setToTz(flightData.arrival.timezone);
        setSelectedArriveDate(moment(flightData.arrival.time).toDate());
        setSelectedArriveTime(moment(flightData.arrival.time).toDate());
      }

      // Validate the imported times
      if (dep && arr) {
        validateFlightRealism(
          dep.date,
          dep.time,
          arr.date,
          arr.time,
          mapIATAToCity(flightData.departure.iata, flightData.departure.airport),
          mapIATAToCity(flightData.arrival.iata, flightData.arrival.airport)
        );
      }

      setShowImportModal(false);
      setIsImporting(false);

      // Show error AFTER modal closes and form populates
      if (pendingError) {
        setTimeout(() => setFlightErrorMsg(pendingError), 300);
      }

    } catch (err: any) {
      setIsImporting(false);

      let errorMsg = "Please check your flight number and date and try again.";
      // Check for common error keywords from backend
      if (err.message.includes("Flight not found") || err.message.includes("404")) {
        errorMsg = "We couldn't find that flight. Double check the date or enter details manually.";
      } else if (err.message.includes("403") || err.message.includes("status code 403")) {
        errorMsg = "Permission denied/403. Run the permission command.";
      } else if (err.message.includes("Provider error") || err.message.includes("500")) {
        errorMsg = "Service is temporarily unavailable (Provider Error). Please enter details manually.";
      }

      setFlightErrorMsg(errorMsg);
    } finally {
      setIsImporting(false);
    }
  };


  // Determine if we should lock the mode based on existing trips
  // OLD: Locked mode if existing trips existed.
  // NEW: Removed to allow mixed flight types (Direct + Multi-segment) in same plan.
  /*
  React.useEffect(() => {
    if (isEditMode && existingPlan?.trips && existingPlan.trips.length > 0) {
      const firstTrip = existingPlan.trips[0];
      if (firstTrip.hasConnections && firstTrip.segments && firstTrip.segments.length > 1) {
        setInputMode('detailed');
      } else {
        setInputMode('simple');
      }
    }
  }, [isEditMode, existingPlan]); 
  */

  // Helper function to validate cities
  const validateCities = () => {
    if (from.trim()) {
      const fromMatch = findClosestCity(from);
      if (!fromMatch) {
        setFromError(`"${from}" not recognized. Try: ${VALID_CITIES.slice(0, 3).join(', ')}...`);
      } else if (fromMatch !== from) {
        // Auto-fill the corrected city name (handles IATA codes, case differences, etc.)
        setFrom(fromMatch);
        setFromError('');
      } else {
        setFromError('');
      }
    }

    if (to.trim()) {
      const toMatch = findClosestCity(to);
      if (!toMatch) {
        setToError(`"${to}" not recognized. Try: ${VALID_CITIES.slice(0, 3).join(', ')}...`);
      } else if (toMatch !== to) {
        // Auto-fill the corrected city name (handles IATA codes, case differences, etc.)
        setTo(toMatch);
        setToError('');
      } else {
        setToError('');
      }
    }
  };



  const onDepartDateChange = (event: any, date?: Date) => {
    if (date) {
      const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDepartDate(newDate);
      const formattedDate = newDate.toISOString().split('T')[0];
      setDepartDate(formattedDate);

      // Validate arrival is after departure
      validateFlightRealism(formattedDate, departTime, arriveDate, arriveTime, from, to);
    }
  };

  const confirmDepartDate = () => {
    setTimeout(() => {
      setShowDepartDatePicker(false);
    }, 100);
  };

  const onDepartTimeChange = (event: any, time?: Date) => {
    if (time) {
      const newTime = new Date(time);
      setSelectedDepartTime(newTime);
      const hours = String(newTime.getHours()).padStart(2, '0');
      const minutes = String(newTime.getMinutes()).padStart(2, '0');
      setDepartTime(`${hours}:${minutes}`);

      // Clear segment sequence error when times change
      setSegmentSequenceError('');

      // Validate arrival is after departure (UTC check)
      validateFlightRealism(departDate, `${hours}:${minutes}`, arriveDate, arriveTime, from, to);
    }
  };

  const confirmDepartTime = () => {
    setTimeout(() => {
      setShowDepartTimePicker(false);
    }, 100);
  };

  const onArriveDateChange = (event: any, date?: Date) => {
    if (date) {
      const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedArriveDate(newDate);
      const formattedDate = newDate.toISOString().split('T')[0];
      setArriveDate(formattedDate);

      // Validate if we have all info
      validateFlightRealism(departDate, departTime, formattedDate, arriveTime, from, to);
    }
  };

  const confirmArriveDate = () => {
    setTimeout(() => {
      setShowArriveDatePicker(false);
    }, 100);
  };

  const onArriveTimeChange = (event: any, time?: Date) => {
    if (time) {
      const newTime = new Date(time);
      setSelectedArriveTime(newTime);
      const hours = String(newTime.getHours()).padStart(2, '0');
      const minutes = String(newTime.getMinutes()).padStart(2, '0');
      setArriveTime(`${hours}:${minutes}`);

      // Clear segment sequence error when times change
      setSegmentSequenceError('');

      // Validate arrival is after departure
      validateFlightRealism(departDate, departTime, arriveDate, `${hours}:${minutes}`, from, to);
    }
  };

  const confirmArriveTime = () => {
    setTimeout(() => {
      setShowArriveTimePicker(false);
    }, 100);
  };

  const addDirectFlight = () => {
    // Don't proceed if there are any errors (button should be disabled anyway)
    if (fromError || toError || dateTimeError) {
      return;
    }

    if (!from || !to || !departDate || !departTime || !arriveDate || !arriveTime) {
      setDateTimeError('Please fill in all flight details');
      return;
    }

    const fromMatch = findClosestCity(from);
    const toMatch = findClosestCity(to);

    if (fromMatch && toMatch && fromMatch === toMatch) {
      setToError('Departure and arrival cities cannot be the same');
      return;
    }


    // Resolve airport codes
    let resolvedFrom = from;
    let resolvedTo = to;
    if (airportMappings[from.trim().toUpperCase()]) resolvedFrom = airportMappings[from.trim().toUpperCase()];
    if (airportMappings[to.trim().toUpperCase()]) resolvedTo = airportMappings[to.trim().toUpperCase()];

    const segment: FlightSegment = {
      from: resolvedFrom,
      to: resolvedTo,
      fromTz: fromTz || getCityTimezone(from),
      toTz: toTz || getCityTimezone(to),
      departDate,
      departTime,
      arriveDate,
      arriveTime,
    };

    // Validate the segment
    const validation = validateTrip({
      from: resolvedFrom,
      to: resolvedTo,
      departDate,
      departTime,
      arriveDate,
      arriveTime,
      connections: [],
    });

    // Handle city name corrections
    if (validation.suggestions.length > 0 && validation.valid) {
      const suggestionMessages = validation.suggestions.map(s =>
        s.field === 'from'
          ? `Departure: "${from}" > "${s.suggested}"`
          : `Arrival: "${to}" > "${s.suggested}"`
      ).join('\n');

      Alert.alert(
        'City Name Corrections',
        `We found these corrections:\n\n${suggestionMessages}\n\nApply corrections?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: () => {
              // Apply corrections
              let correctedFrom = from;
              let correctedTo = to;

              validation.suggestions.forEach(s => {
                if (s.field === 'from') correctedFrom = s.suggested;
                if (s.field === 'to') correctedTo = s.suggested;
              });

              const correctedSegment: FlightSegment = {
                from: correctedFrom,
                to: correctedTo,
                fromTz: getCityTimezone(correctedFrom),
                toTz: getCityTimezone(correctedTo),
                departDate,
                departTime,
                arriveDate,
                arriveTime,
              };

              const trip: Trip = {
                id: Date.now().toString(),
                from: correctedFrom,
                to: correctedTo,
                departDate,
                departTime,
                arriveDate,
                arriveTime,
                hasConnections: false,
                segments: [correctedSegment],
                connections: [],
              };

              setCompletedTrips([...completedTrips, trip]);

              // Reset form
              setFrom('');
              setTo('');
              setDepartDate('');
              setDepartTime('');
              setArriveDate('');
              setArriveTime('');
            }
          }
        ]
      );
      return;
    }

    // Handle errors - set inline errors
    if (!validation.valid) {
      validation.errors.forEach(error => {
        if (error.includes('Departure city')) {
          setFromError(error);
        } else if (error.includes('Arrival city')) {
          setToError(error);
        } else {
          setDateTimeError(error);
        }
      });
      return;
    }

    // Check for overlaps with other trips
    const overlapError = checkOverlappingTrips(
      {
        departDate,
        departTime,
        arriveDate,
        arriveTime
      },
      completedTrips,
      isEditingTrip ? editingTripId : null
    );

    if (overlapError) {
      setDateTimeError(overlapError);
      return;
    }

    // All valid - add or update trip
    // Preserve existing trip metadata if editing
    const existingTrip = isEditingTrip && editingTripId
      ? completedTrips.find(t => t.id === editingTripId)
      : null;

    const trip: Trip = {
      id: isEditingTrip && editingTripId ? editingTripId : Date.now().toString(),
      from: resolvedFrom,
      to: resolvedTo,
      fromTz: segment.fromTz,
      toTz: segment.toTz,
      departDate,
      departTime,
      arriveDate,
      arriveTime,
      hasConnections: false,
      segments: [segment],
      connections: [],
    };

    if (isEditingTrip && editingTripId) {
      setCompletedTrips(completedTrips.map(t => t.id === editingTripId ? trip : t));
    } else {
      setCompletedTrips([...completedTrips, trip]);
    }

    // Reset form and edit state
    setFrom('');
    setTo('');
    setDepartDate('');
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
    setCurrentTripSegments([]);
    setIsEditingTrip(false);
    setEditingTripId(null);
  };

  const addSegment = () => {
    // Don't proceed if there are any errors
    if (fromError || toError || dateTimeError) {
      return;
    }

    if (!from || !to || !departDate || !departTime || !arriveDate || !arriveTime) {
      setDateTimeError('Please fill in all flight segment details');
      return;
    }

    // Clear previous errors first
    setFromError('');
    setToError('');
    setDateTimeError('');
    setSegmentSequenceError(''); // Add this line

    const fromMatch = findClosestCity(from);
    const toMatch = findClosestCity(to);

    if (fromMatch && toMatch && fromMatch === toMatch) {
      setToError('Departure and arrival cities cannot be the same');
      return;
    }

    // Validate the segment
    const validation = validateTrip({
      from,
      to,
      departDate,
      departTime,
      arriveDate,
      arriveTime,
      connections: [],
    });

    // Additional validation for multi-segment: check connection timing
    if (currentTripSegments.length > 0) {
      const previousSegment = currentTripSegments[currentTripSegments.length - 1];

      // Check that departure city matches previous arrival city
      if (from !== previousSegment.to) {
        setFromError(`Should be ${previousSegment.to} (where previous flight landed)`);
        validation.errors.push(`Departure city should match previous arrival city: ${previousSegment.to}`);
      }

      // Check that departure time is after previous arrival time
      const prevArrival = moment(`${previousSegment.arriveDate} ${previousSegment.arriveTime}`, 'YYYY-MM-DD HH:mm');
      const thisDeparture = moment(`${departDate} ${departTime}`, 'YYYY-MM-DD HH:mm');

      const layoverMinutes = thisDeparture.diff(prevArrival, 'minutes');

      if (layoverMinutes < 0) {
        setDateTimeError(`This flight departs before previous flight lands (${prevArrival.format('h:mm A')} on ${prevArrival.format('MM/DD/YYYY')})`);
        validation.errors.push('Departure before previous arrival');
      } else if (layoverMinutes < 30) {
        setDateTimeError(`Only ${layoverMinutes} min layover. Minimum 30 minutes recommended.`);
        validation.errors.push('Insufficient layover time');
      }
    }

    // Handle city name corrections
    if (validation.suggestions.length > 0 && validation.valid) {
      const suggestionMessages = validation.suggestions.map(s =>
        s.field === 'from'
          ? `Departure: "${from}" > "${s.suggested}"`
          : `Arrival: "${to}" > "${s.suggested}"`
      ).join('\n');

      Alert.alert(
        'City Name Corrections',
        `We found these corrections:\n\n${suggestionMessages}\n\nApply corrections?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: () => {
              // Apply corrections
              let correctedFrom = from;
              let correctedTo = to;

              validation.suggestions.forEach(s => {
                if (s.field === 'from') correctedFrom = s.suggested;
                if (s.field === 'to') correctedTo = s.suggested;
              });

              const segment: FlightSegment = {
                from: correctedFrom,
                to: correctedTo,
                fromTz: getCityTimezone(correctedFrom),
                toTz: getCityTimezone(correctedTo),
                departDate,
                departTime,
                arriveDate,
                arriveTime,
              };

              setCurrentTripSegments([...currentTripSegments, segment]);

              // Pre-fill next segment with corrected city
              setFrom(correctedTo);
              setTo('');
              setDepartDate(arriveDate);
              setDepartTime('');
              setArriveDate('');
              setArriveTime('');
              setSelectedDepartDate(new Date(arriveDate));
            }
          }
        ]
      );
      return;
    }

    // Handle errors - set inline errors
    if (!validation.valid) {
      validation.errors.forEach(error => {
        if (error.includes('Departure city')) {
          setFromError(error);
        } else if (error.includes('Arrival city')) {
          setToError(error);
        } else {
          setDateTimeError(error);
        }
      });
      return;
    }

    // All valid - add segment
    // Resolve airport codes
    let resolvedFrom = from;
    let resolvedTo = to;
    if (airportMappings[from.trim().toUpperCase()]) resolvedFrom = airportMappings[from.trim().toUpperCase()];
    if (airportMappings[to.trim().toUpperCase()]) resolvedTo = airportMappings[to.trim().toUpperCase()];

    const segment: FlightSegment = {
      from: resolvedFrom,
      to: resolvedTo,
      fromTz: fromTz || getCityTimezone(from),
      toTz: toTz || getCityTimezone(to),
      departDate,
      departTime,
      arriveDate,
      arriveTime,
    };

    // Insert segment at the right position
    if (insertAfterIndex !== null) {
      const updatedSegments = [...currentTripSegments];
      updatedSegments.splice(insertAfterIndex + 1, 0, segment);
      setCurrentTripSegments(updatedSegments);
      setInsertAfterIndex(null);
    } else {
      setCurrentTripSegments([...currentTripSegments, segment]);
    }

    // Pre-fill next segment
    setFrom(to);
    setTo('');
    setFromTz(toTz || getCityTimezone(to));
    setToTz(undefined);
    setDepartDate(arriveDate);
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
    setSelectedDepartDate(new Date(arriveDate));
  };

  const removeSegment = (index: number) => {
    setCurrentTripSegments(currentTripSegments.filter((_, i) => i !== index));
  };
  const editSegment = (index: number) => {
    const segment = currentTripSegments[index];
    setEditingSegmentIndex(index);

    // Populate form with segment data
    setFrom(segment.from);
    setTo(segment.to);
    setDepartDate(segment.departDate);
    setDepartTime(segment.departTime);
    setArriveDate(segment.arriveDate);
    setArriveTime(segment.arriveTime);
    setSelectedDepartDate(new Date(segment.departDate));
    setSelectedDepartTime(new Date(`2000-01-01T${segment.departTime}`));
    setSelectedArriveDate(new Date(segment.arriveDate));
    setSelectedArriveTime(new Date(`2000-01-01T${segment.arriveTime}`));
  };

  const updateSegment = () => {
    if (editingSegmentIndex === null) return;

    // Validation
    if (fromError || toError || dateTimeError) {
      return;
    }

    if (!from || !to || !departDate || !departTime || !arriveDate || !arriveTime) {
      setDateTimeError('Please fill in all flight segment details');
      return;
    }

    // Resolve airport codes
    let resolvedFrom = from;
    let resolvedTo = to;
    if (airportMappings[from.trim().toUpperCase()]) resolvedFrom = airportMappings[from.trim().toUpperCase()];
    if (airportMappings[to.trim().toUpperCase()]) resolvedTo = airportMappings[to.trim().toUpperCase()];

    const updatedSegment: FlightSegment = {
      from: resolvedFrom,
      to: resolvedTo,
      departDate,
      departTime,
      arriveDate,
      arriveTime,
    };

    const updatedSegments = [...currentTripSegments];
    updatedSegments[editingSegmentIndex] = updatedSegment;
    setCurrentTripSegments(updatedSegments);

    // Clear form and edit state
    setEditingSegmentIndex(null);
    setFrom('');
    setTo('');
    setDepartDate('');
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
  };

  const insertSegmentAfter = (index: number) => {
    setInsertAfterIndex(index);
    const previousSegment = currentTripSegments[index];

    // Pre-fill departure city and date from previous segment's arrival
    setFrom(previousSegment.to);
    setDepartDate(previousSegment.arriveDate);
    setSelectedDepartDate(new Date(previousSegment.arriveDate));

    // Clear arrival fields
    setTo('');
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
  };

  const finishTrip = () => {
    if (currentTripSegments.length === 0) {
      Alert.alert('No Segments', 'Add at least one flight segment');
      return;
    }
    setSegmentSequenceError('');

    // Validate segment sequence timing
    for (let i = 0; i < currentTripSegments.length - 1; i++) {
      const currentSeg = currentTripSegments[i];
      const nextSeg = currentTripSegments[i + 1];

      const currentArrival = moment(`${currentSeg.arriveDate} ${currentSeg.arriveTime}`, 'YYYY-MM-DD HH:mm');
      const nextDeparture = moment(`${nextSeg.departDate} ${nextSeg.departTime}`, 'YYYY-MM-DD HH:mm');

      if (nextDeparture.isSameOrBefore(currentArrival)) {
        setSegmentSequenceError(
          `Flight ${i + 2} (${nextSeg.from} > ${nextSeg.to}) departs before previous flight arrives. Previous flight lands at ${currentArrival.format('h:mm A')} on ${currentArrival.format('MM/DD/YYYY')}, but next flight leaves at ${nextDeparture.format('h:mm A')} on ${nextDeparture.format('MM/DD/YYYY')}.`
        );
        return;
      }
    }

    // Check for overlaps with other trips
    const firstSegment = currentTripSegments[0];
    const lastSegment = currentTripSegments[currentTripSegments.length - 1];

    const overlapError = checkOverlappingTrips(
      {
        departDate: firstSegment.departDate,
        departTime: firstSegment.departTime,
        arriveDate: lastSegment.arriveDate,
        arriveTime: lastSegment.arriveTime
      },
      completedTrips,
      isEditingTrip ? editingTripId : null
    );

    if (overlapError) {
      setSegmentSequenceError(overlapError);
      return;
    }

    // All segments valid - proceed

    const trip: Trip = {
      id: isEditingTrip && editingTripId ? editingTripId : Date.now().toString(),
      from: firstSegment.from.trim(),
      to: lastSegment.to.trim(),
      fromTz: firstSegment.fromTz,
      toTz: lastSegment.toTz,
      departDate: firstSegment.departDate,
      departTime: firstSegment.departTime,
      arriveDate: lastSegment.arriveDate,
      arriveTime: lastSegment.arriveTime,
      hasConnections: true,
      segments: currentTripSegments,
      connections: [],
    };

    if (isEditingTrip && editingTripId) {
      setCompletedTrips(completedTrips.map(t => t.id === editingTripId ? trip : t));
    } else {
      setCompletedTrips([...completedTrips, trip]);
    }
    setCurrentTripSegments([]);
    setFrom('');
    setTo('');
    setDepartDate('');
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
    setIsEditingTrip(false);
    setEditingTripId(null);
  };

  const deleteTrip = (id: string) => {
    setCompletedTrips(completedTrips.filter(t => t.id !== id));
  };

  const editTrip = (trip: Trip) => {
    setEditingTripId(trip.id);
    setIsEditingTrip(true);

    if (trip.hasConnections && trip.segments && trip.segments.length > 1) {
      // Multi-segment trip - populate segments
      setInputMode('detailed');
      setCurrentTripSegments(trip.segments);
      // Clear form
      setFrom('');
      setTo('');
      setDepartDate('');
      setDepartTime('');
      setArriveDate('');
      setArriveTime('');
    } else {
      // Direct flight - populate form
      setInputMode('simple');
      setFrom(trip.from);
      setTo(trip.to);
      setDepartDate(trip.departDate);
      setDepartTime(trip.departTime);
      setArriveDate(trip.arriveDate);
      setArriveTime(trip.arriveTime);


      const [dYear, dMonth, dDay] = trip.departDate.split('-').map(Number);
      const departDateObj = new Date(dYear, dMonth - 1, dDay);  // ✅ Local time
      setSelectedDepartDate(departDateObj);
      setSelectedDepartTime(new Date(`2000-01-01T${trip.departTime}`));
      const [aYear, aMonth, aDay] = trip.arriveDate.split('-').map(Number);
      const arriveDateObj = new Date(aYear, aMonth - 1, aDay);  // ✅ Local time
      setSelectedArriveDate(arriveDateObj);
      setSelectedArriveTime(new Date(`2000-01-01T${trip.arriveTime}`));

      // Clear any in-progress segments
      setCurrentTripSegments([]);
    }

    // Trip stays in the list during edit
    // setCompletedTrips(completedTrips.filter(t => t.id !== trip.id));
  };

  const cancelEditTrip = () => {
    setEditingTripId(null);
    setIsEditingTrip(false);
    setCurrentTripSegments([]);
    setFrom('');
    setTo('');
    setDepartDate('');
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
  };

  const handleContinue = () => {
    if (completedTrips.length === 0) {
      Alert.alert('No Trips', 'Add at least one trip to continue');
      return;
    }
    navigation.navigate('ReviewPlan', {
      planName: planName || (existingPlan ? existingPlan.name : undefined),
      trips: completedTrips,
      mode: isEditMode ? 'edit' : 'create',
      existingPlanId: isEditMode && existingPlan ? existingPlan.id : undefined
    });
  };


  return (
    <View style={styles.container}>
      {/* ────── Custom Header ────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Icon name="chevron-left" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Flights' : 'Add Flights'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Choose how to add your flights</Text>

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'simple' && styles.modeButtonActive,
              isEditingTrip && inputMode !== 'simple' && styles.modeButtonDisabled
            ]}
            onPress={() => !isEditingTrip && setInputMode('simple')}
            disabled={isEditingTrip}
          >
            <Text style={[
              styles.modeButtonText,
              inputMode === 'simple' && styles.modeButtonTextActive,
              isEditingTrip && inputMode !== 'simple' && styles.modeButtonTextDisabled
            ]}>
              Direct Flight
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              inputMode === 'detailed' && styles.modeButtonActive,
              isEditingTrip && inputMode !== 'detailed' && styles.modeButtonDisabled
            ]}
            onPress={() => !isEditingTrip && setInputMode('detailed')}
            disabled={isEditingTrip}
          >
            <Text style={[
              styles.modeButtonText,
              inputMode === 'detailed' && styles.modeButtonTextActive,
              isEditingTrip && inputMode !== 'detailed' && styles.modeButtonTextDisabled
            ]}>
              Multi-Leg Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Added Trips Section - MOVED TO TOP FOR EDIT MODE */}
        {isEditMode && completedTrips.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Added Trips:</Text>
            {completedTrips.map(trip => (
              <View key={trip.id} style={styles.tripCard}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripRoute}>{trip.from} {'>'} {trip.to}</Text>
                  <Text style={styles.tripDetail}>
                    {trip.hasConnections ? `${trip.segments.length} segments` : 'Direct flight'}
                  </Text>
                  <Text style={styles.tripDetail}>
                    Departs: {moment(trip.departDate).format('MM/DD/YYYY')} {moment(trip.departTime, 'HH:mm').format('h:mm A')}
                  </Text>
                  <Text style={styles.tripDetail}>
                    Arrives: {moment(trip.arriveDate).format('MM/DD/YYYY')} {moment(trip.arriveTime, 'HH:mm').format('h:mm A')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={() => editTrip(trip)}
                  >
                    <Icon name="edit" size={20} color="#00DDD9" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={() => deleteTrip(trip.id)}
                  >
                    <Icon name="x" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Current trip in progress (detailed mode only) */}
        {inputMode === 'detailed' && currentTripSegments.length > 0 && (
          <View style={styles.currentTripContainer}>
            <Text style={styles.sectionTitle}>Current Trip:</Text>
            {currentTripSegments.map((seg, index) => (
              <View key={index}>
                <View style={styles.segmentCard}>
                  <View style={styles.segmentInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="send" size={16} color="#446084" style={{ marginRight: 6 }} />
                      <Text style={styles.segmentRoute}>{seg.from} {'>'} {seg.to}</Text>
                    </View>
                    <Text style={styles.segmentTime}>
                      Depart: {moment(seg.departDate).format('MM/DD/YYYY')} {moment(seg.departTime, 'HH:mm').format('h:mm A')}
                    </Text>
                    <Text style={styles.segmentTime}>
                      Arrive: {moment(seg.arriveDate).format('MM/DD/YYYY')} {moment(seg.arriveTime, 'HH:mm').format('h:mm A')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ padding: 4 }}
                      onPress={() => editSegment(index)}
                    >
                      <Icon name="edit" size={20} color="#00DDD9" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 4 }}
                      onPress={() => removeSegment(index)}
                    >
                      <Icon name="x" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Insert After button */}
                <TouchableOpacity
                  style={styles.insertAfterButton}
                  onPress={() => insertSegmentAfter(index)}
                >
                  <Text style={styles.insertAfterButtonText}>+ Insert Segment After</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add flight form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {inputMode === 'simple'
              ? 'Direct Flight Details'
              : currentTripSegments.length === 0
                ? 'First Flight Segment'
                : 'Next Flight Segment'}
          </Text>

          {/* Import Button */}
          <TouchableOpacity
            style={styles.importButton}
            onPress={() => setShowImportModal(true)}
          >
            <Icon name="download-cloud" size={16} color="#0D4C4A" style={{ marginRight: 6 }} />
            <Text style={styles.importButtonText}>Auto-fill from Flight #</Text>
          </TouchableOpacity>

          <Text style={styles.label}>From</Text>
          <TextInput
            style={[styles.input, fromError && styles.inputError]}
            placeholder="e.g., New York or JFK"
            placeholderTextColor="#94A3B8"
            value={from}
            onChangeText={(text) => {
              setFrom(text);
              setFromError(''); // Clear error while typing
            }}
            onBlur={validateCities}
          />
          {fromError ? <Text style={styles.errorText}>{fromError}</Text> : null}

          <Text style={styles.label}>To</Text>
          <TextInput
            style={[styles.input, toError && styles.inputError]}
            placeholder="e.g., London or LHR"
            placeholderTextColor="#94A3B8"
            value={to}
            onChangeText={(text) => {
              setTo(text);
              setToError(''); // Clear error while typing
            }}
            onBlur={validateCities}
          />
          {toError ? <Text style={styles.errorText}>{toError}</Text> : null}

          <Text style={styles.label}>Departure Date</Text>
          <View style={styles.dateTimeDisplay}>
            <Text style={[styles.dateTimeText, !departDate && styles.placeholderText]}>
              {departDate ? moment(departDate).format('MMM D, YYYY') : 'Not selected'}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                if (!departDate) {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;  // ✅ Local time

                  setSelectedDepartDate(today);
                  setDepartDate(formattedDate);
                }
                setShowDepartDatePicker(true);
              }}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Departure Time</Text>
          <View style={styles.dateTimeDisplay}>
            <Text style={[styles.dateTimeText, !departTime && styles.placeholderText]}>
              {departTime ? moment(departTime, 'HH:mm').format('h:mm A') : 'Not selected'}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                validateCities();
                if (!departTime) {
                  const now = new Date();
                  setSelectedDepartTime(now);
                  const hours = String(now.getHours()).padStart(2, '0');
                  const minutes = String(now.getMinutes()).padStart(2, '0');
                  setDepartTime(`${hours}:${minutes}`);
                }
                setShowDepartTimePicker(true);
              }}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Arrival Date</Text>
          <View style={styles.dateTimeDisplay}>
            <Text style={[styles.dateTimeText, !arriveDate && styles.placeholderText]}>
              {arriveDate ? moment(arriveDate).format('MMM D, YYYY') : 'Not selected'}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                validateCities();
                if (!arriveDate) {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;

                  setSelectedArriveDate(today);
                  setArriveDate(formattedDate);
                }
                setShowArriveDatePicker(true);
              }}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Arrival Time</Text>
          <View style={styles.dateTimeDisplay}>
            <Text style={[styles.dateTimeText, !arriveTime && styles.placeholderText]}>
              {arriveTime ? moment(arriveTime, 'HH:mm').format('h:mm A') : 'Not selected'}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                validateCities();
                if (!arriveTime) {
                  const now = new Date();
                  setSelectedArriveTime(now);
                  const hours = String(now.getHours()).padStart(2, '0');
                  const minutes = String(now.getMinutes()).padStart(2, '0');
                  setArriveTime(`${hours}:${minutes}`);
                }
                setShowArriveTimePicker(true);
              }}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>

          {/* Strategy Preference Toggle */}
          {/* We only show this for Direct Flights (simple mode) or when Finishing Trip (detailed) to avoid clutter per segment */}
          {/* Show general date/time errors */}

          {/* Show general date/time errors */}
          {dateTimeError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{dateTimeError}</Text>
            </View>
          ) : null}

          {inputMode === 'simple' ? (
            <TouchableOpacity
              style={[
                styles.addDirectButton,
                (fromError || toError || dateTimeError || !from || !to || !departDate || !departTime || !arriveDate || !arriveTime) && styles.buttonDisabled
              ]}
              onPress={addDirectFlight}
              disabled={!!(fromError || toError || dateTimeError || !from || !to || !departDate || !departTime || !arriveDate || !arriveTime)}
            >
              <Text style={styles.addDirectButtonText}>
                {isEditingTrip ? '✓ Update This Flight' : '✓ Add This Flight'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              {editingSegmentIndex !== null ? (
                <TouchableOpacity
                  style={[
                    styles.updateSegmentButton,
                    (fromError || toError || dateTimeError || !from || !to || !departDate || !departTime || !arriveDate || !arriveTime) && styles.buttonDisabled
                  ]}
                  onPress={updateSegment}
                  disabled={!!(fromError || toError || dateTimeError || !from || !to || !departDate || !departTime || !arriveDate || !arriveTime)}
                >
                  <Text style={styles.updateSegmentButtonText}>✓ Update This Segment</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.addSegmentButton,
                    (fromError || toError || dateTimeError || !from || !to || !departDate || !departTime || !arriveDate || !arriveTime) && styles.buttonDisabled
                  ]}
                  onPress={addSegment}
                  disabled={!!(fromError || toError || dateTimeError || !from || !to || !departDate || !departTime || !arriveDate || !arriveTime)}
                >
                  <Text style={styles.addSegmentButtonText}>
                    {insertAfterIndex !== null ? '+ Insert This Segment' : '+ Add This Segment'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>


        {(editingSegmentIndex !== null || insertAfterIndex !== null) && (
          <TouchableOpacity
            style={styles.cancelSegmentEditButton}
            onPress={() => {
              setEditingSegmentIndex(null);
              setInsertAfterIndex(null);
              setFrom('');
              setTo('');
              setDepartDate('');
              setDepartTime('');
              setArriveDate('');
              setArriveTime('');
            }}
          >
            <Text style={styles.cancelSegmentEditButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Show segment sequence error */}
        {inputMode === 'detailed' && !!segmentSequenceError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{segmentSequenceError}</Text>
          </View>
        )}

        {inputMode === 'detailed' && currentTripSegments.length > 0 && (
          <TouchableOpacity style={styles.finishTripButton} onPress={finishTrip}>
            <Text style={styles.finishTripButtonText}>
              {isEditingTrip ? '✓ Update This Trip' : '✓ Finish This Trip'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Completed trips */}
        {completedTrips.length > 0 && (
          <>
            {!isEditMode && (
              <>
                <Text style={styles.sectionTitle}>Added Trips:</Text>
                {completedTrips.map(trip => (
                  <View key={trip.id} style={styles.tripCard}>
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripRoute}>{trip.from} {'>'} {trip.to}</Text>
                      <Text style={styles.tripDetail}>
                        {trip.hasConnections ? `${trip.segments.length} segments` : 'Direct flight'}
                      </Text>
                      <Text style={styles.tripDetail}>
                        Departs: {moment(trip.departDate).format('MM/DD/YYYY')} {moment(trip.departTime, 'HH:mm').format('h:mm A')}
                      </Text>
                      <Text style={styles.tripDetail}>
                        Arrives: {moment(trip.arriveDate).format('MM/DD/YYYY')} {moment(trip.arriveTime, 'HH:mm').format('h:mm A')}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={{ padding: 4 }}
                        onPress={() => editTrip(trip)}
                      >
                        <Icon name="edit" size={20} color="#00DDD9" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteTrip(trip.id)}>
                        <Icon name="x" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue to Review</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.spacer} />

        {/* Date/Time Picker Modals for iOS */}
        {Platform.OS === 'ios' && (
          <>
            <Modal
              visible={showDepartDatePicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <DateTimePicker
                    value={selectedDepartDate}
                    mode="date"
                    display="spinner"
                    onChange={onDepartDateChange}
                    textColor="#1E293B"
                    themeVariant="light"
                  />
                  <TouchableOpacity style={styles.modalDoneButton} onPress={confirmDepartDate}>
                    <Text style={styles.modalDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showDepartTimePicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <DateTimePicker
                    value={selectedDepartTime}
                    mode="time"
                    display="spinner"
                    onChange={onDepartTimeChange}
                    textColor="#1E293B"
                    themeVariant="light"
                  />
                  <TouchableOpacity style={styles.modalDoneButton} onPress={confirmDepartTime}>
                    <Text style={styles.modalDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showArriveDatePicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <DateTimePicker
                    value={selectedArriveDate}
                    mode="date"
                    display="spinner"
                    onChange={onArriveDateChange}
                    textColor="#1E293B"
                    themeVariant="light"
                  />
                  <TouchableOpacity style={styles.modalDoneButton} onPress={confirmArriveDate}>
                    <Text style={styles.modalDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showArriveTimePicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <DateTimePicker
                    value={selectedArriveTime}
                    mode="time"
                    display="spinner"
                    onChange={onArriveTimeChange}
                    textColor="#1E293B"
                    themeVariant="light"
                  />
                  <TouchableOpacity style={styles.modalDoneButton} onPress={confirmArriveTime}>
                    <Text style={styles.modalDoneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}
      </ScrollView>

      {/* Import Flight Modal */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import Flight</Text>
            <Text style={styles.modalSubtitle}>Enter your flight details to auto-fill.</Text>

            <Text style={styles.label}>Flight Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. UA 261"
              placeholderTextColor="#94A3B8"
              value={importFlightNum}
              onChangeText={setImportFlightNum}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Date of Flight</Text>
            <TouchableOpacity
              style={styles.dateTimeDisplay}
              onPress={() => {
                Keyboard.dismiss();
                setTimeout(() => {
                  setShowImportDatePicker(true);
                }, 100);
              }}
            >
              <Text style={styles.dateTimeText}>
                {moment(importDate).format('MMM D, YYYY')}
              </Text>
              <Icon name="calendar" size={20} color="#64748B" style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.modeButton, { backgroundColor: '#F3F4F6', borderWidth: 0 }]}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.modeButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addDirectButton, { flex: 1, marginTop: 0 }]}
                onPress={handleImportFlight}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Text style={styles.addDirectButtonText}>Searching...</Text>
                ) : (
                  <Text style={styles.addDirectButtonText}>Find Flight</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Inline Date Picker Modal for iOS */}
            {Platform.OS === 'ios' && (
              <Modal
                visible={showImportDatePicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowImportDatePicker(false)}
              >
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, width: '90%', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <TouchableOpacity onPress={() => setShowImportDatePicker(false)} style={{ padding: 4 }}>
                        <Text style={{ fontFamily: 'Jua', color: '#0D4C4A', fontSize: 16 }}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={importDate}
                      mode="date"
                      display="inline"
                      onChange={(event, date) => {
                        if (date) setImportDate(date);
                      }}
                      textColor="#1E293B"
                      accentColor="#0D4C4A"
                      themeVariant="light"
                    />
                  </View>
                </View>
              </Modal>
            )}
          </View>

          {/* Error Overlay INSIDE Import Modal - For immediate errors (invalid flight) */}
          {!!displayedError && showImportModal && (
            <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
              {/* Background - Fades in/out */}
              <Animated.View style={[StyleSheet.absoluteFill, {
                backgroundColor: 'rgba(0,0,0,0.5)',
                opacity: errorOpacity
              }]} />

              {/* Error Modal - Slides up/down */}
              <Animated.View style={[styles.modalOverlay, {
                transform: [{ translateY: errorSlideAnim }]
              }]}>
                <View style={styles.modalContent}>
                  <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Error</Text>
                  <Text style={[styles.modalSubtitle, { marginBottom: 24 }]}>{displayedError}</Text>
                  <TouchableOpacity
                    style={[styles.addDirectButton, { width: '100%', marginTop: 0, backgroundColor: '#EF4444' }]}
                    onPress={() => setFlightErrorMsg(null)}
                  >
                    <Text style={styles.addDirectButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          )}

        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal (Custom font) */}
      <Modal
        visible={!!importSuccessMsg}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>We found your flight!</Text>
            <Text style={[styles.modalSubtitle, { marginBottom: 24 }]}>{importSuccessMsg}</Text>
            <TouchableOpacity
              style={[styles.addDirectButton, { width: '100%', marginTop: 0 }]}
              onPress={() => setImportSuccessMsg(null)}
            >
              <Text style={styles.addDirectButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Flight Selection Modal (Multiple Routes) */}
      <Modal
        visible={showFlightSelection}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Multiple Flights Found</Text>
            <Text style={[styles.modalSubtitle, { marginBottom: 16 }]}>
              This flight number operates {flightOptions.length} routes on this date.{'\n'}Select yours:
            </Text>

            <ScrollView style={{ width: '100%', marginBottom: 16 }}>
              {flightOptions.map((flight, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  onPress={() => {
                    setShowFlightSelection(false);
                    handleImportFlightWithData(flight);
                  }}
                >
                  <Text style={{ fontFamily: 'Jua', fontSize: 18, color: '#0D4C4A', marginBottom: 4 }}>
                    {mapIATAToCity(flight.departure.iata)} {'>'} {mapIATAToCity(flight.arrival.iata)}
                  </Text>
                  <Text style={{ fontFamily: 'Jua', fontSize: 14, color: '#64748B' }}>
                    Departs {moment(flight.departure.time).tz(flight.departure.timezone).format('h:mm A')}
                  </Text>
                  <Text style={{ fontFamily: 'Jua', fontSize: 12, color: '#94A3B8' }}>
                    {flight.departure.airport} {'>'} {flight.arrival.airport}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addDirectButton, { width: '100%', marginTop: 0, backgroundColor: '#94A3B8' }]}
              onPress={() => {
                setShowFlightSelection(false);
                setFlightOptions([]);
              }}
            >
              <Text style={styles.addDirectButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Error Overlay OUTSIDE Modal - For delayed errors (missing data after successful import) */}
      {!!displayedError && !showImportModal && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
          {/* Background - Fades in/out */}
          <Animated.View style={[StyleSheet.absoluteFill, {
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: errorOpacity
          }]} />

          {/* Error Modal - Slides up/down */}
          <Animated.View style={[styles.modalOverlay, {
            transform: [{ translateY: errorSlideAnim }]
          }]}>
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Error</Text>
              <Text style={[styles.modalSubtitle, { marginBottom: 24 }]}>{displayedError}</Text>
              <TouchableOpacity
                style={[styles.addDirectButton, { width: '100%', marginTop: 0, backgroundColor: '#EF4444' }]}
                onPress={() => setFlightErrorMsg(null)}
              >
                <Text style={styles.addDirectButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#C7F5E8',
    borderColor: '#5EDAD9',
  },
  modeButtonText: {
    fontFamily: 'Jua',
    fontSize: 15,
    color: '#64748B',
  },
  modeButtonTextActive: {
    color: '#0D4C4A',
  },
  sectionTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginTop: 8,
    marginBottom: 12,
  },
  currentTripContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  segmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentInfo: {
    flex: 1,
  },
  segmentRoute: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 4,
  },
  segmentTime: {
    fontFamily: 'Jua',
    fontSize: 12,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  importButtonText: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#0D4C4A',
  },
  modalTitle: {
    fontFamily: 'Jua',
    fontSize: 22,
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'Jua',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  dateTimeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    zIndex: 10, // Ensure it sits on top if needed
  },

  dateTimeText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#1E293B',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  selectButton: {
    backgroundColor: '#5EDAD9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#0D4C4A',
  },
  addDirectButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addDirectButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  addSegmentButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addSegmentButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
  },
  finishTripButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  finishTripButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 18,
  },
  tripCard: {
    backgroundColor: '#C7F5E8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripInfo: {
    flex: 1,
  },
  tripRoute: {
    fontFamily: 'Jua',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 4,
  },
  tripDetail: {
    fontFamily: 'Jua',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },

  continueButton: {
    backgroundColor: '#1F4259',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 18,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorText: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  modeButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#E5E7EB',
  },
  modeButtonTextDisabled: {
    color: '#94A3B8',
  },

  cancelEditButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelEditButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
  },


  insertAfterButton: {
    backgroundColor: '#FCD34D',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  insertAfterButtonText: {
    fontFamily: 'Jua',
    fontSize: 13,
    color: '#78350F',
  },
  updateSegmentButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  updateSegmentButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
  },
  cancelSegmentEditButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  cancelSegmentEditButtonText: {
    fontFamily: 'Jua',
    color: '#FFFFFF',
    fontSize: 16,
  },

  spacer: {
    height: 40,
  },

  // Modal styles for iOS spinner
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalDoneButton: {
    backgroundColor: '#5EDAD9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    width: 280,
  },
  modalDoneButtonText: {
    fontFamily: 'Jua',
    fontSize: 16,
    color: '#0D4C4A',
  },
});





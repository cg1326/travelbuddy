import React, { useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment-timezone';
import Icon from 'react-native-vector-icons/Feather';


// Valid cities from jetLagAlgorithm.ts
const VALID_CITIES = [
  'San Diego', 'Los Angeles', 'San Francisco', 'Las Vegas', 'Seattle', 'Phoenix',
  'Denver', 'Chicago', 'Dallas', 'Houston', 'Austin', 'New York', 'Boston',
  'Washington DC', 'Philadelphia', 'Atlanta', 'Miami', 'Honolulu', 'Toronto',
  'Vancouver', 'Montreal', 'Mexico City', 'Cancun', 'São Paulo', 'Buenos Aires',
  'Santiago', 'Bogota', 'Lima', 'London', 'Dublin', 'Lisbon', 'Madrid', 'Barcelona',
  'Paris', 'Brussels', 'Amsterdam', 'Berlin', 'Frankfurt', 'Munich', 'Rome',
  'Vienna', 'Zurich', 'Stockholm', 'Copenhagen', 'Oslo', 'Prague', 'Warsaw',
  'Istanbul', 'Athens', 'Moscow', 'Cairo', 'Johannesburg', 'Cape Town',
  'Marrakech', 'Casablanca', 'Dubai', 'Abu Dhabi', 'Doha', 'Riyadh', 'Tel Aviv',
  'Delhi', 'Mumbai', 'Bangalore', 'Bangkok', 'Singapore', 'Kuala Lumpur',
  'Jakarta', 'Manila', 'Ho Chi Minh City', 'Auckland', 'Sydney', 'Melbourne',
  'Brisbane', 'Perth', 'Tokyo', 'Osaka', 'Seoul', 'Beijing', 'Shanghai',
  'Hong Kong', 'Taipei', 'Puerto Natales'
];

// Fuzzy match city name
function findClosestCity(input: string): string | null {
  if (!input || input.trim().length < 2) return null;

  const normalized = input.trim().toLowerCase();

  // Exact match
  const exactMatch = VALID_CITIES.find(city => city.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  // Starts with match
  const startsWithMatch = VALID_CITIES.find(city =>
    city.toLowerCase().startsWith(normalized)
  );
  if (startsWithMatch) return startsWithMatch;

  // Contains match
  const containsMatch = VALID_CITIES.find(city =>
    city.toLowerCase().includes(normalized)
  );
  if (containsMatch) return containsMatch;

  // Levenshtein distance for typos
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
      if (arriveMoment.isSameOrBefore(departMoment)) {
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

interface FlightSegment {
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
}

interface Trip {
  id: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  hasConnections: boolean;
  segments: FlightSegment[];
  connections: any[];
}

export default function AddTrips({ route, navigation }: any) {
  const { planName, mode, existingPlan } = route.params || {};
  const isEditMode = mode === 'edit';

  // Mode selection
  const [inputMode, setInputMode] = useState<'simple' | 'detailed'>('simple');

  // Current segment being built
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [departTime, setDepartTime] = useState('');
  const [arriveDate, setArriveDate] = useState('');
  const [arriveTime, setArriveTime] = useState('');

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
    isEditMode && existingPlan?.trips ? existingPlan.trips : []
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


  // Determine if we should lock the mode based on existing trips
  React.useEffect(() => {
    if (isEditMode && existingPlan?.trips && existingPlan.trips.length > 0) {
      const firstTrip = existingPlan.trips[0];
      // If the trip has multiple segments, lock to detailed mode
      if (firstTrip.hasConnections && firstTrip.segments && firstTrip.segments.length > 1) {
        setInputMode('detailed');
      } else {
        setInputMode('simple');
      }
    }
  }, [isEditMode, existingPlan]);

  // Helper function to validate cities
  const validateCities = () => {
    if (from.trim()) {
      const fromMatch = findClosestCity(from);
      if (!fromMatch) {
        setFromError(`"${from}" not recognized. Try: ${VALID_CITIES.slice(0, 3).join(', ')}...`);
      } else if (fromMatch !== from) {
        setFromError(`Did you mean "${fromMatch}"?`);
      }
    }

    if (to.trim()) {
      const toMatch = findClosestCity(to);
      if (!toMatch) {
        setToError(`"${to}" not recognized. Try: ${VALID_CITIES.slice(0, 3).join(', ')}...`);
      } else if (toMatch !== to) {
        setToError(`Did you mean "${toMatch}"?`);
      }
    }
  };

  const onDepartDateChange = (event: any, date?: Date) => {
    if (date) {
      const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDepartDate(newDate);
      const formattedDate = newDate.toISOString().split('T')[0];
      setDepartDate(formattedDate);
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

      // Validate arrival is after departure
      if (departDate && arriveDate && arriveTime) {
        const departMoment = moment(`${departDate} ${hours}:${minutes}`, 'YYYY-MM-DD HH:mm');
        const arriveMoment = moment(`${arriveDate} ${arriveTime}`, 'YYYY-MM-DD HH:mm');

        if (arriveMoment.isSameOrBefore(departMoment)) {
          setDateTimeError('Arrival time must be after departure time');
        } else {
          setDateTimeError('');
        }
      }
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
      if (departDate && departTime && arriveTime) {
        const departMoment = moment(`${departDate} ${departTime}`, 'YYYY-MM-DD HH:mm');
        const arriveMoment = moment(`${formattedDate} ${arriveTime}`, 'YYYY-MM-DD HH:mm');

        if (arriveMoment.isSameOrBefore(departMoment)) {
          setDateTimeError('Arrival must be after departure');
        } else {
          setDateTimeError('');
        }
      }
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
      if (departDate && departTime && arriveDate) {
        const departMoment = moment(`${departDate} ${departTime}`, 'YYYY-MM-DD HH:mm');
        const arriveMoment = moment(`${arriveDate} ${hours}:${minutes}`, 'YYYY-MM-DD HH:mm');

        if (arriveMoment.isSameOrBefore(departMoment)) {
          setDateTimeError('Arrival time must be after departure time');
        } else {
          setDateTimeError('');
        }
      }
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

    const segment: FlightSegment = {
      from,
      to,
      departDate,
      departTime,
      arriveDate,
      arriveTime,
    };

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

    // Handle city name corrections
    if (validation.suggestions.length > 0 && validation.valid) {
      const suggestionMessages = validation.suggestions.map(s =>
        s.field === 'from'
          ? `Departure: "${from}" → "${s.suggested}"`
          : `Arrival: "${to}" → "${s.suggested}"`
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

    // All valid - add or update trip
    const trip: Trip = {
      id: isEditingTrip && editingTripId ? editingTripId : Date.now().toString(),
      from,
      to,
      departDate,
      departTime,
      arriveDate,
      arriveTime,
      hasConnections: false,
      segments: [segment],
      connections: [],
    };

    setCompletedTrips([...completedTrips, trip]);

    // Reset form and edit state
    setFrom('');
    setTo('');
    setDepartDate('');
    setDepartTime('');
    setArriveDate('');
    setArriveTime('');
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
        setDateTimeError(`This flight departs before previous flight lands (${previousSegment.arriveTime} on ${previousSegment.arriveDate})`);
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
          ? `Departure: "${from}" → "${s.suggested}"`
          : `Arrival: "${to}" → "${s.suggested}"`
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
    const segment: FlightSegment = {
      from,
      to,
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

    const updatedSegment: FlightSegment = {
      from,
      to,
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
          `Flight ${i + 2} (${nextSeg.from} → ${nextSeg.to}) departs before previous flight arrives. Previous flight lands at ${currentSeg.arriveTime} on ${currentSeg.arriveDate}, but next flight leaves at ${nextSeg.departTime} on ${nextSeg.departDate}.`
        );
        return;
      }
    }
    // All segments valid - proceed
    const firstSegment = currentTripSegments[0];
    const lastSegment = currentTripSegments[currentTripSegments.length - 1];

    const trip: Trip = {
      id: isEditingTrip && editingTripId ? editingTripId : Date.now().toString(),
      from: firstSegment.from,
      to: lastSegment.to,
      departDate: firstSegment.departDate,
      departTime: firstSegment.departTime,
      arriveDate: lastSegment.arriveDate,
      arriveTime: lastSegment.arriveTime,
      hasConnections: true,
      segments: currentTripSegments,
      connections: [],
    };

    setCompletedTrips([...completedTrips, trip]);
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
    }

    // Remove trip from completed list temporarily (it will be re-added when saved)
    setCompletedTrips(completedTrips.filter(t => t.id !== trip.id));
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
      planName,
      trips: completedTrips,
      mode: isEditMode ? 'edit' : 'create',
      existingPlanId: isEditMode && existingPlan ? existingPlan.id : undefined
    });
  };


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Flights</Text>
      <Text style={styles.subtitle}>Choose how to add your flights</Text>

      {/* Mode selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            inputMode === 'simple' && styles.modeButtonActive,
            isEditMode && inputMode !== 'simple' && styles.modeButtonDisabled
          ]}
          onPress={() => !isEditMode && setInputMode('simple')}
          disabled={isEditMode}
        >
          <Text style={[
            styles.modeButtonText,
            inputMode === 'simple' && styles.modeButtonTextActive,
            isEditMode && inputMode !== 'simple' && styles.modeButtonTextDisabled
          ]}>
            Direct Flight
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            inputMode === 'detailed' && styles.modeButtonActive,
            isEditMode && inputMode !== 'detailed' && styles.modeButtonDisabled
          ]}
          onPress={() => !isEditMode && setInputMode('detailed')}
          disabled={isEditMode}
        >
          <Text style={[
            styles.modeButtonText,
            inputMode === 'detailed' && styles.modeButtonTextActive,
            isEditMode && inputMode !== 'detailed' && styles.modeButtonTextDisabled
          ]}>
            Multi-Leg Trip
          </Text>
        </TouchableOpacity>
      </View>

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
                    <Text style={styles.segmentRoute}>{seg.from} → {seg.to}</Text>
                  </View>
                  <Text style={styles.segmentTime}>
                    Depart: {seg.departDate} {seg.departTime}
                  </Text>
                  <Text style={styles.segmentTime}>
                    Arrive: {seg.arriveDate} {seg.arriveTime}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.editSegmentButton}
                    onPress={() => editSegment(index)}
                  >
                    <Icon name="edit-2" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeSegment(index)}>
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
      {!((isEditMode || (isEditingTrip && currentTripSegments.length > 0)) && completedTrips.length > 0 && editingSegmentIndex === null && insertAfterIndex === null) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {inputMode === 'simple'
              ? 'Direct Flight Details'
              : currentTripSegments.length === 0
                ? 'First Flight Segment'
                : 'Next Flight Segment'}
          </Text>

          <Text style={styles.label}>From</Text>
          <TextInput
            style={[styles.input, fromError && styles.inputError]}
            placeholder="e.g., New York"
            placeholderTextColor="#94A3B8"
            value={from}
            onChangeText={(text) => {
              setFrom(text);
              setFromError(''); // Clear error while typing
            }}
            onBlur={() => {
              if (from.trim()) {
                const match = findClosestCity(from);
                if (!match) {
                  setFromError(`"${from}" not recognized. Try: ${VALID_CITIES.slice(0, 3).join(', ')}...`);
                } else if (match !== from) {
                  setFromError(`Did you mean "${match}"?`);
                } else if (to.trim()) {
                  // NEW: Check if same as arrival city
                  const toMatch = findClosestCity(to);
                  if (toMatch && match === toMatch) {
                    setFromError('Departure city cannot be the same as arrival city');
                  }
                }
              }
            }}
          />
          {fromError ? <Text style={styles.errorText}>{fromError}</Text> : null}

          <Text style={styles.label}>To</Text>
          <TextInput
            style={[styles.input, toError && styles.inputError]}
            placeholder="e.g., Atlanta"
            placeholderTextColor="#94A3B8"
            value={to}
            onChangeText={(text) => {
              setTo(text);
              setToError(''); // Clear error while typing
            }}
            onBlur={() => {
              if (to.trim()) {
                const match = findClosestCity(to);
                if (!match) {
                  setToError(`"${to}" not recognized. Try: ${VALID_CITIES.slice(0, 3).join(', ')}...`);
                } else if (match !== to) {
                  setToError(`Did you mean "${match}"?`);
                } else if (from.trim()) {
                  // NEW: Check if same as departure city
                  const fromMatch = findClosestCity(from);
                  if (fromMatch && match === fromMatch) {
                    setToError('Arrival city cannot be the same as departure city');
                  }
                }
              }
            }}
          />
          {toError ? <Text style={styles.errorText}>{toError}</Text> : null}

          <Text style={styles.label}>Departure Date</Text>
          <View style={styles.dateTimeDisplay}>
            <Text style={[styles.dateTimeText, !departDate && styles.placeholderText]}>
              {departDate || 'Not selected'}
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
              {departTime || 'Not selected'}
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
              {arriveDate || 'Not selected'}
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
              {arriveTime || 'Not selected'}
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
      )}


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
      {inputMode === 'detailed' && segmentSequenceError && (
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
          <Text style={styles.sectionTitle}>Added Trips:</Text>
          {completedTrips.map(trip => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripInfo}>
                <Text style={styles.tripRoute}>{trip.from} → {trip.to}</Text>
                <Text style={styles.tripDetail}>
                  {trip.hasConnections ? `${trip.segments.length} segments` : 'Direct flight'}
                </Text>
                <Text style={styles.tripDetail}>
                  Departs: {trip.departDate} {trip.departTime}
                </Text>
                <Text style={styles.tripDetail}>
                  Arrives: {trip.arriveDate} {trip.arriveTime}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.editTripButton}
                  onPress={() => editTrip(trip)}
                >
                  <Icon name="edit-2" size={16} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTrip(trip.id)}>
                  <Icon name="x" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  title: {
    fontFamily: 'Jua',
    fontSize: 28,
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
    marginBottom: 16,
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
  editTripButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5EDAD9',
    borderRadius: 16,
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

  editSegmentButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5EDAD9',
    borderRadius: 16,
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





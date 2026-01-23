import moment from 'moment-timezone';

export interface Connection {
  city: string;
  duration: string;
}

export interface FlightSegment {
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
}

export interface Trip {
  id: string;
  from: string;
  to: string;
  departDate: string;
  departTime: string;
  arriveDate: string;
  arriveTime: string;
  hasConnections: boolean;
  segments?: FlightSegment[];
  connections: Connection[];
  adjustmentPreference?: 'stay_home' | 'adjust'; // User override for short trips
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
  isInfo?: boolean;
  isDailyRoutine?: boolean;
}

export interface Phase {
  name: string;
  dateRange: string;
  cards: Card[];
  durationDays?: number;
}

export interface TripPlan {
  tripId: string;
  from: string;
  to: string;
  departDate: string;
  phases: {
    prepare: Phase;
    travel: Phase;
    adjust: Phase;
  };
  strategy: 'stay_home' | 'adjust';
  suppressPreparePhase?: boolean; // True when prepare phase overlaps with previous trip's adjust phase
}

export interface UserSettings {
  normalBedtime: string;
  normalWakeTime: string;
  // chronotype: 'early' | 'neither' | 'night';
  useMelatonin: boolean;
  useMagnesium: boolean;
}


export const cityTimezones: { [key: string]: string } = {
  'San Diego': 'America/Los_Angeles',
  'Los Angeles': 'America/Los_Angeles',
  'San Francisco': 'America/Los_Angeles',
  'Las Vegas': 'America/Los_Angeles',
  'Seattle': 'America/Los_Angeles',
  'Phoenix': 'America/Phoenix',
  'Denver': 'America/Denver',
  'Chicago': 'America/Chicago',
  'Dallas': 'America/Chicago',
  'Houston': 'America/Chicago',
  'Austin': 'America/Chicago',
  'New York': 'America/New_York',
  'Boston': 'America/New_York',
  'Washington DC': 'America/New_York',
  'Philadelphia': 'America/New_York',
  'Atlanta': 'America/New_York',
  'Miami': 'America/New_York',
  'Honolulu': 'Pacific/Honolulu',
  'Toronto': 'America/Toronto',
  'Vancouver': 'America/Vancouver',
  'Montreal': 'America/Montreal',
  'Mexico City': 'America/Mexico_City',
  'Cancun': 'America/Cancun',
  'São Paulo': 'America/Sao_Paulo',
  'Buenos Aires': 'America/Argentina/Buenos_Aires',
  'Santiago': 'America/Santiago',
  'Bogota': 'America/Bogota',
  'Lima': 'America/Lima',
  'London': 'Europe/London',
  'Dublin': 'Europe/Dublin',
  'Lisbon': 'Europe/Lisbon',
  'Madrid': 'Europe/Madrid',
  'Barcelona': 'Europe/Madrid',
  'Paris': 'Europe/Paris',
  'Brussels': 'Europe/Brussels',
  'Amsterdam': 'Europe/Amsterdam',
  'Berlin': 'Europe/Berlin',
  'Frankfurt': 'Europe/Berlin',
  'Munich': 'Europe/Berlin',
  'Rome': 'Europe/Rome',
  'Vienna': 'Europe/Vienna',
  'Zurich': 'Europe/Zurich',
  'Stockholm': 'Europe/Stockholm',
  'Copenhagen': 'Europe/Copenhagen',
  'Oslo': 'Europe/Oslo',
  'Prague': 'Europe/Prague',
  'Warsaw': 'Europe/Warsaw',
  'Istanbul': 'Europe/Istanbul',
  'Athens': 'Europe/Athens',
  'Moscow': 'Europe/Moscow',
  'Cairo': 'Africa/Cairo',
  'Johannesburg': 'Africa/Johannesburg',
  'Cape Town': 'Africa/Johannesburg',
  'Marrakech': 'Africa/Casablanca',
  'Casablanca': 'Africa/Casablanca',
  'Dubai': 'Asia/Dubai',
  'Abu Dhabi': 'Asia/Dubai',
  'Doha': 'Asia/Qatar',
  'Riyadh': 'Asia/Riyadh',
  'Tel Aviv': 'Asia/Jerusalem',
  'Delhi': 'Asia/Kolkata',
  'Mumbai': 'Asia/Kolkata',
  'Bangalore': 'Asia/Kolkata',
  'Bangkok': 'Asia/Bangkok',
  'Singapore': 'Asia/Singapore',
  'Kuala Lumpur': 'Asia/Kuala_Lumpur',
  'Jakarta': 'Asia/Jakarta',
  'Manila': 'Asia/Manila',
  'Ho Chi Minh City': 'Asia/Ho_Chi_Minh',
  'Auckland': 'Pacific/Auckland',
  'Sydney': 'Australia/Sydney',
  'Melbourne': 'Australia/Melbourne',
  'Brisbane': 'Australia/Brisbane',
  'Perth': 'Australia/Perth',
  'Tokyo': 'Asia/Tokyo',
  'Osaka': 'Asia/Tokyo',
  'Seoul': 'Asia/Seoul',
  'Beijing': 'Asia/Shanghai',
  'Shanghai': 'Asia/Shanghai',
  'Hong Kong': 'Asia/Hong_Kong',
  'Taipei': 'Asia/Taipei',
  'Puerto Natales': 'America/Punta_Arenas',
  // North America (New)
  'Portland': 'America/Los_Angeles',
  'Salt Lake City': 'America/Denver',
  'New Orleans': 'America/Chicago',
  'Nashville': 'America/Chicago',
  'Orlando': 'America/New_York',
  'Detroit': 'America/Detroit',
  'Minneapolis': 'America/Chicago',
  // Europe (New)
  'Edinburgh': 'Europe/London',
  'Manchester': 'Europe/London',
  'Lyon': 'Europe/Paris',
  'Marseille': 'Europe/Paris',
  'Naples': 'Europe/Rome',
  'Milan': 'Europe/Rome',
  'Hamburg': 'Europe/Berlin',
  'Geneva': 'Europe/Zurich',
  'Krakow': 'Europe/Warsaw',
  'Larnaca': 'Asia/Nicosia',
  'Paphos': 'Asia/Nicosia',
  'Nicosia': 'Asia/Nicosia',
  // Asia (New)
  'Kyoto': 'Asia/Tokyo',
  'Busan': 'Asia/Seoul',
  'Sapporo': 'Asia/Tokyo',
  'Chiang Mai': 'Asia/Bangkok',
  'Hanoi': 'Asia/Bangkok',
  'Chengdu': 'Asia/Shanghai',
  'Xi\'an': 'Asia/Shanghai',
  'Jaipur': 'Asia/Kolkata',
  // Oceania (New)
  'Adelaide': 'Australia/Adelaide',
  'Christchurch': 'Pacific/Auckland',
  'Gold Coast': 'Australia/Brisbane',
  // South America (New)
  'Rio de Janeiro': 'America/Sao_Paulo',
  'Medellin': 'America/Bogota',
  'Cusco': 'America/Lima',
  // Africa (New)
  'Durban': 'Africa/Johannesburg',
  'Nairobi': 'Africa/Nairobi',
  'Luanda': 'Africa/Luanda',

  // --- NEWLY ADDED CITIES ---
  // Europe
  'Venice': 'Europe/Rome',
  'Florence': 'Europe/Rome',
  'Nice': 'Europe/Paris',
  'Bordeaux': 'Europe/Paris',
  'Valencia': 'Europe/Madrid',
  'Seville': 'Europe/Madrid',
  'Porto': 'Europe/Lisbon',
  'Budapest': 'Europe/Budapest',
  'Helsinki': 'Europe/Helsinki',
  'Bucharest': 'Europe/Bucharest',
  'Belgrade': 'Europe/Belgrade',
  'Sofia': 'Europe/Sofia',
  'Zagreb': 'Europe/Zagreb',
  'Dubrovnik': 'Europe/Zagreb',
  'Reykjavik': 'Atlantic/Reykjavik',
  'Glasgow': 'Europe/London',
  'Stuttgart': 'Europe/Berlin',
  'Cologne': 'Europe/Berlin',
  'Dusseldorf': 'Europe/Berlin',

  // Asia
  'Fukuoka': 'Asia/Tokyo',
  'Nagoya': 'Asia/Tokyo',
  'Okinawa': 'Asia/Tokyo',
  'Jeju': 'Asia/Seoul',
  'Phuket': 'Asia/Bangkok',
  'Denpasar': 'Asia/Makassar', // Bali
  'Chennai': 'Asia/Kolkata',
  'Hyderabad': 'Asia/Kolkata',
  'Kolkata': 'Asia/Kolkata',
  'Kathmandu': 'Asia/Kathmandu',
  'Colombo': 'Asia/Colombo',
  'Male': 'Indian/Maldives',
  'Tashkent': 'Asia/Tashkent',
  'Almaty': 'Asia/Almaty',
  'Ulaanbaatar': 'Asia/Ulaanbaatar',

  // Americas
  'Calgary': 'America/Edmonton',
  'Ottawa': 'America/Toronto',
  'Quebec City': 'America/Montreal',
  'Charlotte': 'America/New_York',
  'Indianapolis': 'America/Indiana/Indianapolis',
  'Columbus': 'America/New_York',
  'San Antonio': 'America/Chicago',
  'Jacksonville': 'America/New_York',
  'Raleigh': 'America/New_York',
  'St. Louis': 'America/Chicago',
  'Kansas City': 'America/Chicago',
  'Milwaukee': 'America/Chicago',
  'Guadalajara': 'America/Mexico_City',
  'Monterrey': 'America/Monterrey',
  'San Jose (CR)': 'America/Costa_Rica',
  'Panama City': 'America/Panama',
  'Cartagena': 'America/Bogota',
  'Quito': 'America/Guayaquil',
  'La Paz': 'America/La_Paz',
  'Montevideo': 'America/Montevideo',
  'Brasilia': 'America/Sao_Paulo',
  'Salvador': 'America/Bahia',
  'Cordoba': 'America/Argentina/Cordoba',
  'Mendoza': 'America/Argentina/Mendoza',

  // Africa & Middle East
  'Lagos': 'Africa/Lagos',
  'Accra': 'Africa/Accra',
  'Dakar': 'Africa/Dakar',
  'Addis Ababa': 'Africa/Addis_Ababa',
  'Tunis': 'Africa/Tunis',
  'Algiers': 'Africa/Algiers',
  'Zanzibar': 'Africa/Dar_es_Salaam',
  'Amman': 'Asia/Amman',
  'Muscat': 'Asia/Muscat',
  'Beirut': 'Asia/Beirut',
  'Kuwait City': 'Asia/Kuwait',
  'Manama': 'Asia/Bahrain',
};

export const airportMappings: { [key: string]: string } = {
  // North America
  'JFK': 'New York', 'EWR': 'New York', 'LGA': 'New York',
  'BOS': 'Boston',
  'DCA': 'Washington DC', 'IAD': 'Washington DC', 'BWI': 'Washington DC',
  'PHL': 'Philadelphia',
  'ATL': 'Atlanta',
  'MIA': 'Miami', 'FLL': 'Miami',
  'ORD': 'Chicago', 'MDW': 'Chicago',
  'DFW': 'Dallas', 'DAL': 'Dallas',
  'IAH': 'Houston', 'HOU': 'Houston',
  'AUS': 'Austin',
  'DEN': 'Denver',
  'PHX': 'Phoenix',
  'LAX': 'Los Angeles', 'SNA': 'Los Angeles', 'BUR': 'Los Angeles',
  'SFO': 'San Francisco', 'OAK': 'San Francisco', 'SJC': 'San Francisco',
  'SEA': 'Seattle',
  'LAS': 'Las Vegas',
  'HNL': 'Honolulu',
  'YTZ': 'Toronto', 'YYZ': 'Toronto',
  'YVR': 'Vancouver',
  'YUL': 'Montreal',
  'MEX': 'Mexico City',
  'CUN': 'Cancun',
  'PDX': 'Portland',
  'SLC': 'Salt Lake City',
  'MSY': 'New Orleans',
  'BNA': 'Nashville',
  'MCO': 'Orlando',
  'DTW': 'Detroit',
  'MSP': 'Minneapolis',
  'SAN': 'San Diego',
  'TPA': 'Miami', // Tampa uses Miami timezone
  'PIT': 'Philadelphia', // Pittsburgh uses Philadelphia timezone

  // South America
  'GRU': 'São Paulo', 'CGH': 'São Paulo',
  'EZE': 'Buenos Aires', 'AEP': 'Buenos Aires',
  'SCL': 'Santiago',
  'BOG': 'Bogota',
  'LIM': 'Lima',
  'GIG': 'Rio de Janeiro', 'SDU': 'Rio de Janeiro',
  'MDE': 'Medellin',
  'CUZ': 'Cusco',
  'PNT': 'Puerto Natales',

  // Europe
  'LHR': 'London', 'LGW': 'London', 'STN': 'London', 'LCY': 'London',
  'DUB': 'Dublin',
  'LIS': 'Lisbon',
  'MAD': 'Madrid',
  'BCN': 'Barcelona',
  'CDG': 'Paris', 'ORY': 'Paris',
  'BRU': 'Brussels',
  'AMS': 'Amsterdam',
  'BER': 'Berlin',
  'FRA': 'Frankfurt',
  'MUC': 'Munich',
  'FCO': 'Rome', 'CIA': 'Rome',
  'VIE': 'Vienna',
  'ZRH': 'Zurich',
  'ARN': 'Stockholm',
  'CPH': 'Copenhagen',
  'OSL': 'Oslo',
  'PRG': 'Prague',
  'WAW': 'Warsaw',
  'IST': 'Istanbul', 'SAW': 'Istanbul',
  'ATH': 'Athens',
  'SVO': 'Moscow', 'DME': 'Moscow',
  'EDI': 'Edinburgh',
  'MAN': 'Manchester',
  'LYS': 'Lyon',
  'MRS': 'Marseille',
  'NAP': 'Naples',
  'MXP': 'Milan', 'LIN': 'Milan', 'BGY': 'Milan',
  'HAM': 'Hamburg',
  'GVA': 'Geneva',
  'KRK': 'Krakow',

  // Middle East & Africa
  'CAI': 'Cairo',
  'JNB': 'Johannesburg',
  'CPT': 'Cape Town',
  'CMN': 'Casablanca',
  'DXB': 'Dubai',
  'AUH': 'Abu Dhabi',
  'DOH': 'Doha',
  'RUH': 'Riyadh',
  'TLV': 'Tel Aviv',
  'RAK': 'Marrakech',
  'DUR': 'Durban',
  'NBO': 'Nairobi',
  'LAD': 'Luanda',

  // Asia & Pacific
  'DEL': 'Delhi',
  'BOM': 'Mumbai',
  'BLR': 'Bangalore',
  'BKK': 'Bangkok', 'DMK': 'Bangkok',
  'SIN': 'Singapore',
  'KUL': 'Kuala Lumpur',
  'CGK': 'Jakarta',
  'MNL': 'Manila',
  'SGN': 'Ho Chi Minh City',
  'NRT': 'Tokyo', 'HND': 'Tokyo',
  'KIX': 'Osaka', 'ITM': 'Osaka',
  'ICN': 'Seoul', 'GMP': 'Seoul',
  'PEK': 'Beijing', 'PKX': 'Beijing',
  'PVG': 'Shanghai', 'SHA': 'Shanghai',
  'HKG': 'Hong Kong',
  'TPE': 'Taipei', 'TSA': 'Taipei',
  'SYD': 'Sydney',
  'MEL': 'Melbourne',
  'BNE': 'Brisbane',
  'PER': 'Perth',
  'AKL': 'Auckland',
  'UKY': 'Kyoto', // Unofficial/Fictional code for Kyoto or use ITM/KIX as Osaka serves it. Let's remove duplicate KIX.
  // Actually, let's just map ITM explicitly if not there, or remove the duplicate.
  // 'KIX' is Osaka. Kyoto doesn't have its own major intl airport, it uses KIX/ITM.
  // So I will just remove the explicit Kyoto 'KIX' line.
  'PUS': 'Busan',
  'CTS': 'Sapporo',
  'CNX': 'Chiang Mai',
  'HAN': 'Hanoi',
  'CTU': 'Chengdu',
  'XIY': 'Xi\'an',
  'JAI': 'Jaipur',
  'ADL': 'Adelaide',
  'CHC': 'Christchurch',
  'OOL': 'Gold Coast',

  // --- NEWLY ADDED AIRPORTS ---
  // Europe
  'VCE': 'Venice',
  'FLR': 'Florence',
  'NCE': 'Nice',
  'BOD': 'Bordeaux',
  'VLC': 'Valencia',
  'SVQ': 'Seville',
  'OPO': 'Porto',
  'BUD': 'Budapest',
  'HEL': 'Helsinki',
  'OTP': 'Bucharest',
  'BEG': 'Belgrade',
  'SOF': 'Sofia',
  'ZAG': 'Zagreb',
  'DBV': 'Dubrovnik',
  'KEF': 'Reykjavik',
  'GLA': 'Glasgow',
  'STR': 'Stuttgart',
  'CGN': 'Cologne',
  'DUS': 'Dusseldorf',
  'LCA': 'Larnaca',
  'PFO': 'Paphos',
  'ECN': 'Nicosia',

  // Asia
  'FUK': 'Fukuoka',
  'NGO': 'Nagoya',
  'OKA': 'Okinawa',
  'CJU': 'Jeju',
  'HKT': 'Phuket',
  'DPS': 'Denpasar',
  'MAA': 'Chennai',
  'HYD': 'Hyderabad',
  'CCU': 'Kolkata',
  'KTM': 'Kathmandu',
  'CMB': 'Colombo',
  'MLE': 'Male',
  'TAS': 'Tashkent',
  'ALA': 'Almaty',
  'UBN': 'Ulaanbaatar',

  // Americas
  'YYC': 'Calgary',
  'YOW': 'Ottawa',
  'YQB': 'Quebec City',
  'CLT': 'Charlotte',
  'IND': 'Indianapolis',
  'CMH': 'Columbus',
  'SAT': 'San Antonio',
  'JAX': 'Jacksonville',
  'RDU': 'Raleigh',
  'STL': 'St. Louis',
  'MCI': 'Kansas City',
  'MKE': 'Milwaukee',
  'GDL': 'Guadalajara',
  'MTY': 'Monterrey',
  'SJO': 'San Jose (CR)',
  'PTY': 'Panama City',
  'CTG': 'Cartagena',
  'UIO': 'Quito',
  'LPB': 'La Paz',
  'MVD': 'Montevideo',
  'BSB': 'Brasilia',
  'SSA': 'Salvador',
  'COR': 'Cordoba',
  'MDZ': 'Mendoza',

  // Africa & Middle East
  'LOS': 'Lagos',
  'ACC': 'Accra',
  'DSS': 'Dakar',
  'ADD': 'Addis Ababa',
  'TUN': 'Tunis',
  'ALG': 'Algiers',
  'ZNZ': 'Zanzibar',
  'AMM': 'Amman',
  'MCT': 'Muscat',
  'BEY': 'Beirut',
  'KWI': 'Kuwait City',
  'BAH': 'Manama',
};

function formatTime12Hour(time24: string): string {
  if (!time24) return '';
  return moment(time24, 'HH:mm').format('h:mm A');
}

function formatTimeRange12Hour(start: string, end: string): string {
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
}

export function getCityTimezone(city: string): string {
  // Check if it's a city directly
  if (cityTimezones[city]) {
    return cityTimezones[city];
  }
  // Check if it's an airport code mapping to a city
  const cityFromCode = airportMappings[city];
  if (cityFromCode && cityTimezones[cityFromCode]) {
    return cityTimezones[cityFromCode];
  }
  return 'UTC';
}

function calculateTimezoneDiff(from: string, to: string, date: string, fromTzOverride?: string): number {
  const fromTz = fromTzOverride || getCityTimezone(from);
  const toTz = getCityTimezone(to);

  if (fromTz === 'UTC' && !cityTimezones[from] && !fromTzOverride) {
    console.warn(`City not found in timezone database: ${from}`);
    return 0;
  }
  if (toTz === 'UTC' && !cityTimezones[to]) {
    console.warn(`City not found in timezone database: ${to}`);
    return 0;
  }

  const dateInFrom = moment.tz(date, fromTz);
  const dateInTo = moment.tz(date, toTz);

  const offsetFrom = dateInFrom.utcOffset();
  const offsetTo = dateInTo.utcOffset();

  return (offsetTo - offsetFrom) / 60;
}

function getDirection(tzDiff: number): 'east' | 'west' {
  return tzDiff > 0 ? 'east' : 'west';
}

function parseLayoverDuration(duration: string): number {
  const match = duration.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}

export function calculateStayDuration(trip: Trip, nextTrip?: Trip): number {
  if (!nextTrip) return 999;

  // Calculate arrival at destination (using last segment if available)
  const lastSegment = trip.segments && trip.segments.length > 0
    ? trip.segments[trip.segments.length - 1]
    : null;

  const arrivalMoment = lastSegment
    ? moment(`${lastSegment.arriveDate} ${lastSegment.arriveTime}`, 'YYYY-MM-DD HH:mm')
    : moment(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm').add(6, 'hours'); // rough estimate if no segments

  const nextDepartMoment = moment(`${nextTrip.departDate} ${nextTrip.departTime}`, 'YYYY-MM-DD HH:mm');

  return nextDepartMoment.diff(arrivalMoment, 'days', true);
}

function determineAdjustmentStrategy(
  trip: Trip,
  nextTrip: Trip | undefined,
  hoursDiff: number
): { percentage: number; reason: string } {
  const stayDuration = calculateStayDuration(trip, nextTrip);

  // Check for User Preference Override - PRIORITIZE over duration/diff logic
  if (trip.adjustmentPreference === 'stay_home') {
    return {
      percentage: 0,
      reason: `As requested, we'll keep you on your origin schedule for this trip.`
    };
  }

  if (trip.adjustmentPreference === 'adjust') {
    // Force adjustment (Partial or Full depending on length, but never 0%)
    // If it's short but they want to adjust, give them Partial (60%) or Full (100%)?
    // Let's give them Partial for short trips to be safe, unless it's actually long.
    const percentage = stayDuration >= 6 ? 100 : 60;
    const reason = stayDuration >= 6
      ? 'Full adjustment to harmonize with local time.'
      : `You chose to adjust. We'll shift your schedule just enough to keep you energized.`;

    return { percentage, reason };
  }

  // < 3 days: "Stay Home" equivalent (Default if no preference)
  if (stayDuration < 3) {
    return {
      percentage: 0,
      reason: `Quick trip (${Math.round(stayDuration)} days). We'll focus on boosting your energy when you need it most.`
    };
  }

  if (hoursDiff < 1) {
    return {
      percentage: 0,
      reason: 'No significant timezone difference.'
    };
  }

  if (hoursDiff < 3) {
    return { percentage: 50, reason: 'Small timezone difference.' };
  }

  // 3+ days: Full adjustment
  return { percentage: 100, reason: 'Full adjustment to harmonize with local time.' };
}

function adjustTimeForChronotype(
  baseTime: string,
  chronotype: string,
  direction: 'earlier' | 'later'
): string {
  const [hours, minutes] = baseTime.split(':').map(Number);
  let adjustedHours = hours;

  if (chronotype === 'early' && direction === 'earlier') {
    adjustedHours = Math.max(6, hours - 1);
  } else if (chronotype === 'night' && direction === 'earlier') {
    adjustedHours = Math.min(23, hours + 1);
  } else if (chronotype === 'night' && direction === 'later') {
    adjustedHours = Math.min(1, hours + 1);
  }

  return `${adjustedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function generateJetLagPlan(
  trip: Trip,
  allTrips: Trip[],
  userSettings: UserSettings
): TripPlan {
  // Determine "effective" origin timezone for calculation
  // default: local timezone of departure city
  let effectiveFromTz = getCityTimezone(trip.from);
  let effectiveHoursDiff = 0;
  let circadianOriginCity = trip.from;

  // Check previous trips to see if we are actually fully adjusted to trip.from
  const currentTripIndex = allTrips.findIndex(t => t.id === trip.id);

  if (currentTripIndex > 0) {
    // Recursive lookback:
    // If previous trip was "Stay Home", our body is still at THAT trip's origin.
    // We trace back until we find a trip where we Adjusted (or the start of the chain).

    let checkIndex = currentTripIndex - 1;

    while (checkIndex >= 0) {
      const prevTrip = allTrips[checkIndex];
      const nextTripForPrev = allTrips[checkIndex + 1]; // The trip FOLLOWING prevTrip

      // Calc dwell time / strategy for the prev trip
      const prevDiff = calculateTimezoneDiff(prevTrip.from, prevTrip.to, prevTrip.departDate);
      const prevStrategy = determineAdjustmentStrategy(prevTrip, nextTripForPrev, prevDiff);

      if (prevStrategy.percentage === 0) {
        // "Stay Home" strategy means we kept the rhythm of prevTrip.from
        // So effective origin bubbles up to prevTrip.from
        circadianOriginCity = prevTrip.from;
        effectiveFromTz = getCityTimezone(circadianOriginCity);
        checkIndex--;
      } else {
        // We Adjusted during this previous trip. 
        // So the chain breaks - we are acclimated to prevTrip.to (which is effectively where we started our loop)
        break;
      }
    }
  }

  // 1. Analyze Timezone Difference (using effective origin)
  const tzDiff = calculateTimezoneDiff(circadianOriginCity, trip.to, trip.departDate, effectiveFromTz);
  const direction = getDirection(tzDiff);
  const hoursDiff = Math.abs(tzDiff);

  // 2. Determine Strategy
  const nextTrip = currentTripIndex >= 0 && currentTripIndex < allTrips.length - 1
    ? allTrips[currentTripIndex + 1]
    : undefined;

  const adjustmentStrategy = determineAdjustmentStrategy(trip, nextTrip, hoursDiff);

  const departMoment = moment(trip.departDate);
  const prepDays = hoursDiff >= 4 ? 2 : 1;
  const prepareStartDate = departMoment.clone().subtract(prepDays, 'days').format('YYYY-MM-DD');
  const prepareEndDate = departMoment.clone().subtract(1, 'days').format('YYYY-MM-DD');
  const adjustEndDate = departMoment.clone().add(3, 'days').format('YYYY-MM-DD');

  // Calculate actual arrival date for adjust phase
  const lastSegment = trip.segments && trip.segments.length > 0
    ? trip.segments[trip.segments.length - 1]
    : null;

  const adjustStartDate = lastSegment && lastSegment.arriveDate
    ? lastSegment.arriveDate
    : departMoment.clone().add(1, 'days').format('YYYY-MM-DD');

  const adjustEndDateCalculated = moment(adjustStartDate).add(1, 'days').format('YYYY-MM-DD');

  // Check if previous trip's adjust phase overlaps with current trip's prepare phase
  let hasOverlapWithPrevTrip = false;
  if (currentTripIndex > 0) {
    const prevTrip = allTrips[currentTripIndex - 1];

    // Calculate previous trip's adjust phase end date
    const prevLastSegment = prevTrip.segments && prevTrip.segments.length > 0
      ? prevTrip.segments[prevTrip.segments.length - 1]
      : null;

    const prevAdjustStartDate = prevLastSegment && prevLastSegment.arriveDate
      ? prevLastSegment.arriveDate
      : moment(prevTrip.departDate).add(1, 'days').format('YYYY-MM-DD');

    // Adjust phase duration is fixed at 2 days (arrival + 1 day)
    const prevAdjustEndDate = moment(prevAdjustStartDate).add(1, 'days').format('YYYY-MM-DD');

    // Check if previous adjust phase extends into or past current prepare phase
    if (moment(prevAdjustEndDate).isSameOrAfter(moment(prepareStartDate))) {
      hasOverlapWithPrevTrip = true;
    }
  }

  const prepareCards = generatePrepareCards(
    trip,
    direction,
    hoursDiff,
    userSettings,
    prepareStartDate,
    prepDays,
    hasOverlapWithPrevTrip
  );

  const travelCards = generateTravelCards(
    trip,
    direction,
    hoursDiff,
    userSettings,
    adjustmentStrategy,
    circadianOriginCity
  );

  const adjustmentDuration = 2; // FIXED: Limit to Arrival + 1 Day as requested by user

  const adjustCards = generateAdjustCards(
    trip,
    direction,
    hoursDiff,
    adjustmentStrategy,
    userSettings,
    nextTrip,
    adjustStartDate,
    circadianOriginCity
  );


  return {
    tripId: trip.id,
    from: trip.from,
    to: trip.to,
    departDate: trip.departDate,
    phases: {
      prepare: {
        name: 'Prepare',
        dateRange: formatDateRange(prepareStartDate, prepareEndDate),
        cards: prepareCards,
      },
      travel: {
        name: 'Travel Day',
        dateRange: formatDateRange(
          trip.departDate,
          lastSegment && lastSegment.arriveDate ? lastSegment.arriveDate : trip.departDate
        ),
        cards: travelCards,
      },
      adjust: {
        name: 'Adjust',
        dateRange: formatDateRange(
          adjustStartDate,
          adjustEndDateCalculated
        ),
        cards: adjustCards,
        durationDays: adjustmentDuration,
      },
    },
    strategy: adjustmentStrategy.percentage === 0 ? 'stay_home' : 'adjust',
    suppressPreparePhase: hasOverlapWithPrevTrip,
  };
}

/**
 * Calculate progressive sleep shift based on timezone difference
 * @param hoursDiff - Timezone difference in hours
 * @param prepDays - Number of preparation days
 * @returns Sleep shift per day in hours (capped at 2 hours total)
 */
function calculatePrepSleepShift(hoursDiff: number, prepDays: number): number {
  // Max recommended pre-adjustment: 2 hours total
  // Research shows more than 2 hours disrupts current life too much
  const maxTotalShift = Math.min(hoursDiff, 2);

  // Distribute across available prep days
  const shiftPerDay = maxTotalShift / prepDays;

  return shiftPerDay;
}

function generatePrepareCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  userSettings: UserSettings,
  startDate: string,
  prepDays: number,
  hasOverlapWithPrevTrip: boolean = false
): Card[] {
  const cards: Card[] = [];

  // If previous trip's adjust phase overlaps with this trip's prepare phase,
  // suppress prepare cards to avoid redundancy with daily routine cards
  if (hasOverlapWithPrevTrip) {
    return cards; // Return empty array - daily routine from previous trip continues
  }

  // Check for late-night/overnight departure conflict
  // If flight departs between 9 PM and 5 AM, the "night before" is effectively a travel night, not a sleep night.
  // Reduce prepDays by 1 to effectively exclude this night from the sleep shifting advice.
  const departHour = parseInt(trip.departTime.split(':')[0], 10);
  let effectivePrepDays = prepDays;

  if (departHour >= 21 || departHour < 5) {
    // FIX: Fully suppress sleep advice for late night flights.
    // Reducing by 1 day is confusing and low value for max 2-day prep.
    effectivePrepDays = 0;
  }

  if (hoursDiff < 3) {
    // Only show sleep advice if there is some difference (>= 1h)
    if (hoursDiff >= 1) {
      cards.push({
        id: 'prep-rest',
        title: 'Get Good Rest',
        time: 'Evening',
        icon: '🌙',
        color: '#1C5D74',
        why: `Only ${hoursDiff} hour difference - your body can adjust gradually. Focus on being well-rested.`,
        how: 'Maintain your normal sleep schedule. Pack and prepare without stress.',
        dateTime: moment.tz(`${startDate} 20:00`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
      });
    }

    // FIX #5: Add more cards for short trips
    cards.push({
      id: 'prep-hydrate',
      title: 'Stay Hydrated',
      time: 'Throughout the day',
      icon: '💧',
      color: '#3b82f6',
      why: 'Travel dehydrates you regardless of timezone change. Start hydrating well now.',
      how: 'Drink extra water today and tomorrow. Aim for 8-10 glasses per day.',
      dateTime: `${startDate}T09:00:00`,
    });

    cards.push({
      id: 'prep-activity',
      title: 'Light Exercise',
      time: 'Morning or afternoon',
      icon: '🚶',
      color: '#10b981',
      why: 'Light activity is often helpful before travel.',
      how: 'Consider a 30-minute walk or light exercise. Nothing too intense before travel.',
      dateTime: moment.tz(`${startDate} 10:00`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
    });

    cards.sort((a, b) => {
      if (!a.dateTime || !b.dateTime) return 0;
      return moment(a.dateTime).diff(moment(b.dateTime));
    });

    return cards.sort((a, b) => {
      if (!a.dateTime || !b.dateTime) return 0;
      const momentA = moment(a.dateTime);
      const momentB = moment(b.dateTime);
      return momentA.isBefore(momentB) ? -1 : 1;
    });

  }

  // If timezone difference is negligible (e.g. < 1 hour), skip specific sleep/light shifting
  if (hoursDiff < 1) {
    return cards;
  }

  if (direction === 'east') {
    // Calculate light window based on user wake time
    const wakeTimeMoment = moment(userSettings.normalWakeTime, 'HH:mm');
    const wakeTimeStr = userSettings.normalWakeTime;
    const lightEndStr = wakeTimeMoment.add(2, 'hours').format('HH:mm');

    const lightTime = formatTimeRange12Hour(wakeTimeStr, lightEndStr);


    cards.push({
      id: 'prep-light',
      title: 'Seek Morning Light',
      time: lightTime,
      icon: '☀️',
      color: '#fbbf24',
      why: `Traveling ${hoursDiff} hours east to ${trip.to}. Morning light is commonly used to advance the body clock.`,
      how: 'Try to get bright light exposure within 2 hours of waking. Go outside for 30-60 minutes if possible.',
      dateTime: moment.tz(`${startDate} ${wakeTimeStr}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
    });

    // Calculate progressive sleep shift
    const shiftPerDay = calculatePrepSleepShift(hoursDiff, effectivePrepDays);

    // Generate sleep cards for each prep day with progressive shifts
    if (effectivePrepDays > 0) {
      for (let dayOffset = 0; dayOffset < effectivePrepDays; dayOffset++) {
        const cumulativeShift = shiftPerDay * (dayOffset + 1);
        const currentDate = moment(startDate).subtract(effectivePrepDays - dayOffset - 1, 'days').format('YYYY-MM-DD');

        // Calculate shifted bedtime for this specific day
        const normalBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
        const shiftedBedtime = normalBedtimeMoment.clone().subtract(cumulativeShift * 60, 'minutes').format('HH:mm');

        // Format shift amount for display
        const shiftHours = Math.floor(cumulativeShift);
        const shiftMinutes = Math.round((cumulativeShift - shiftHours) * 60);
        const shiftText = shiftHours > 0
          ? (shiftMinutes > 0 ? `${shiftHours}h ${shiftMinutes}m` : `${shiftHours} hour${shiftHours > 1 ? 's' : ''}`)
          : `${shiftMinutes} minutes`;

        const dayLabel = effectivePrepDays > 1 ? ` - Day ${dayOffset + 1}` : '';
        const progressText = effectivePrepDays > 1 && dayOffset < effectivePrepDays - 1
          ? ` Tomorrow you'll shift another ${Math.round(shiftPerDay * 60)} minutes.`
          : '';

        cards.push({
          id: `prep-sleep-day${dayOffset + 1}`,
          title: `Sleep Earlier${dayLabel}`,
          time: formatTime12Hour(shiftedBedtime),
          icon: '🌙',
          color: '#1C5D74',
          why: `Start shifting your sleep ${shiftText} earlier than your normal ${formatTime12Hour(userSettings.normalBedtime)} bedtime.${progressText}`,
          how: 'Try to go to bed earlier than usual. Dim lights after 8 PM. Limit screen time before bed.',
          dateTime: moment.tz(`${currentDate} ${shiftedBedtime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
        });
      }
    }

    cards.push({
      id: 'prep-avoid-evening-light',
      title: 'Avoid Bright Light',
      time: '8:00 PM onwards',
      icon: '🌙',
      color: '#64748b',
      why: 'Evening light can delay your clock - opposite of what helps for eastward travel.',
      how: 'Consider dimming lights in your home. Use warm/amber lighting if available.',
      dateTime: moment.tz(`${startDate} 20:00`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
    });

  } else {
    const lightTime = '6:00 - 8:00 PM';

    cards.push({
      id: 'prep-light',
      title: 'Seek Evening Light',
      time: lightTime,
      icon: '🌅',
      color: '#f97316',
      why: `Traveling ${hoursDiff} hours west to ${trip.to}. Evening light is commonly used to delay the body clock.`,

      how: 'Try to get bright light exposure in the evening. Go outside or use bright indoor lighting.',
      dateTime: moment.tz(`${startDate} 18:00`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
    });

    // Calculate progressive sleep shift
    const shiftPerDay = calculatePrepSleepShift(hoursDiff, effectivePrepDays);

    // Generate sleep cards for each prep day with progressive shifts
    if (effectivePrepDays > 0) {
      for (let dayOffset = 0; dayOffset < effectivePrepDays; dayOffset++) {
        const cumulativeShift = shiftPerDay * (dayOffset + 1);
        const currentDate = moment(startDate).subtract(effectivePrepDays - dayOffset - 1, 'days').format('YYYY-MM-DD');

        // Calculate shifted bedtime for this specific day
        const normalBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
        const shiftedBedtime = normalBedtimeMoment.clone().add(cumulativeShift * 60, 'minutes').format('HH:mm');

        // Format shift amount for display
        const shiftHours = Math.floor(cumulativeShift);
        const shiftMinutes = Math.round((cumulativeShift - shiftHours) * 60);
        const shiftText = shiftHours > 0
          ? (shiftMinutes > 0 ? `${shiftHours}h ${shiftMinutes}m` : `${shiftHours} hour${shiftHours > 1 ? 's' : ''}`)
          : `${shiftMinutes} minutes`;

        const dayLabel = effectivePrepDays > 1 ? ` - Day ${dayOffset + 1}` : '';
        const progressText = effectivePrepDays > 1 && dayOffset < effectivePrepDays - 1
          ? ` Tomorrow you'll shift another ${Math.round(shiftPerDay * 60)} minutes.`
          : '';

        cards.push({
          id: `prep-sleep-day${dayOffset + 1}`,
          title: `Sleep Later${dayLabel}`,
          time: formatTime12Hour(shiftedBedtime),
          icon: '🌙',
          color: '#1C5D74',
          why: `Start shifting your sleep ${shiftText} later than your normal ${formatTime12Hour(userSettings.normalBedtime)} bedtime.${progressText}`,
          how: 'Try to stay up later than usual. Keep lights bright in the evening.',
          dateTime: moment.tz(`${currentDate} ${shiftedBedtime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.from)).toISOString(),
        });
      }
    }
  }

  return cards;
}

function generateTravelCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  userSettings: UserSettings,
  adjustmentStrategy: { percentage: number; reason: string },
  circadianOriginCity: string
): Card[] {
  const cards: Card[] = [];

  // Use segments if available
  const segments = trip.segments && trip.segments.length > 0
    ? trip.segments
    : [{
      from: trip.from,
      to: trip.to,
      departDate: trip.departDate,
      departTime: trip.departTime,
      arriveDate: trip.arriveDate || trip.departDate,
      arriveTime: trip.arriveTime || '23:59',
    }];

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  // Calculate total journey time
  const journeyStart = moment.tz(
    `${firstSegment.departDate} ${firstSegment.departTime}`,
    'YYYY-MM-DD HH:mm',
    getCityTimezone(firstSegment.from)
  );

  const journeyEnd = moment.tz(
    `${lastSegment.arriveDate} ${lastSegment.arriveTime}`,
    'YYYY-MM-DD HH:mm',
    getCityTimezone(lastSegment.to)
  );

  const totalHours = journeyEnd.diff(journeyStart, 'hours', true);

  // Determine destination sleep window (10 PM - 6 AM destination time)
  const destTz = getCityTimezone(trip.to);

  // === FIRST: Add the "Your Flight" overview card ===
  const routeString = segments.length > 1
    ? `${trip.from} > ${segments.map(s => s.to).join(' > ')}`
    : `${trip.from} > ${trip.to}`;

  cards.push({
    id: 'travel-flight-overview',
    title: 'Your Flight',
    time: routeString,
    icon: '✈️',
    color: '#DBEAFE',
    why: `Departs ${formatTime12Hour(firstSegment.departTime)}`,
    how: `Total journey: ~${Math.round(totalHours)} hours with ${segments.length} flight segment${segments.length > 1 ? 's' : ''}`,
    isInfo: true,
    dateTime: journeyStart.clone().startOf('day').add(2, 'seconds').toISOString(),
  });

  // === Analyze each segment for sleep/wake recommendations ===
  interface SegmentAnalysis {
    segment: FlightSegment;
    departMoment: moment.Moment;
    arriveMoment: moment.Moment;
    durationHours: number;
    departAtDest: moment.Moment;
    arriveAtDest: moment.Moment;
    isOvernightFlight: boolean;
    isDaytimeFlight: boolean;
    shouldSleep: boolean;
    nextLayoverHours?: number;
  }

  const segmentAnalyses: SegmentAnalysis[] = segments.map((segment, index) => {
    const departMoment = moment.tz(
      `${segment.departDate} ${segment.departTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(segment.from)
    );

    const arriveMoment = moment.tz(
      `${segment.arriveDate} ${segment.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(segment.to)
    );

    const durationHours = arriveMoment.diff(departMoment, 'hours', true);

    // Convert to destination timezone
    const departAtDest = departMoment.clone().tz(destTz);
    const arriveAtDest = arriveMoment.clone().tz(destTz);

    const departHourDest = departAtDest.hour();
    const arriveHourDest = arriveAtDest.hour();

    // Determine if this is an overnight flight where sleep is recommended
    // 1. Classic Red Eye (Destination Alignment): Departs evening/night (local dest time)
    const isRedEyeDeparture = departHourDest >= 18 || departHourDest < 2;

    // 2. Early Morning Arrival (Destination Alignment)
    // Arriving 4 AM - 10 AM suggests overnight flight IF long
    const arrivesEarlyMorning = arriveHourDest >= 4 && arriveHourDest < 10;

    // 3. Deep Night Arrival (1 AM - 5 AM)
    const arrivesDeepNight = arriveHourDest >= 1 && arriveHourDest < 5;

    // 4. Origin Night Departure (Biology Alignment)
    // If you leave at your normal bedtime (9 PM - 5 AM), you should sleep,
    // especially on long flights, even if it doesn't align with destination perfectly yet.
    const departHourOrigin = departMoment.hour();
    const isOriginNightDeparture = departHourOrigin >= 21 || departHourOrigin < 5;

    const isOvernightFlight =
      (isRedEyeDeparture && durationHours >= 3) ||
      (arrivesEarlyMorning && durationHours >= 5) ||
      (arrivesDeepNight && durationHours >= 6) ||
      (isOriginNightDeparture && durationHours >= 8);

    const isDaytimeFlight = !isOvernightFlight;

    // Should sleep if classified as overnight flight
    const shouldSleep = isOvernightFlight;

    // Calculate layover time to next flight
    let nextLayoverHours: number | undefined;
    if (index < segments.length - 1) {
      const nextSegment = segments[index + 1];
      const nextDepartMoment = moment.tz(
        `${nextSegment.departDate} ${nextSegment.departTime}`,
        'YYYY-MM-DD HH:mm',
        getCityTimezone(nextSegment.from)
      );
      nextLayoverHours = nextDepartMoment.diff(arriveMoment, 'hours', true);
    }

    return {
      segment,
      departMoment,
      arriveMoment,
      durationHours,
      departAtDest,
      arriveAtDest,
      isOvernightFlight,
      isDaytimeFlight,
      shouldSleep,
      nextLayoverHours,
    };
  });

  // === Build cards chronologically by day ===
  // === Build cards chronologically by day ===
  let currentDate = journeyStart.clone().startOf('day');
  const endDate = journeyEnd.clone().endOf('day');



  while (currentDate.isSameOrBefore(endDate, 'day')) {
    const dateStr = currentDate.format('MMM D');
    const dateYYYYMMDD = currentDate.format('YYYY-MM-DD');

    console.log('\n--- Processing date:', dateYYYYMMDD, '---');

    // Find segments that DEPART on this date
    const segmentsDepartingToday = segmentAnalyses.filter(analysis => {
      const segDepartDate = analysis.departMoment.format('YYYY-MM-DD');
      console.log(`  Segment ${analysis.segment.from} > ${analysis.segment.to} departs on ${segDepartDate}`);
      return segDepartDate === dateYYYYMMDD;
    });



    if (segmentsDepartingToday.length > 0) {
      const isFirstDay = currentDate.isSame(journeyStart, 'day');
      const isLastDay = currentDate.isSame(journeyEnd, 'day');

      const firstSegToday = segmentsDepartingToday[0];
      let headerText = '';
      if (isFirstDay) {
        headerText = `${dateStr} - Departure Day - ${trip.from} Time`;
      } else if (isLastDay) {
        headerText = `${dateStr} - Arrival Day - ${trip.to} Time`;
      } else {
        headerText = `${dateStr} - In Flight - ${firstSegToday.segment.from} Time`;
      }

      // Add navy header bar
      cards.push({
        id: `header-${dateYYYYMMDD}`,
        title: headerText,
        time: '',
        icon: '',
        color: '#1E3A5F',
        why: '',
        how: '',
        isInfo: true,
        dateTime: moment.tz(`${dateYYYYMMDD} 00:00:01`, 'YYYY-MM-DD HH:mm:ss', getCityTimezone(firstSegToday.segment.from)).toISOString(),
      });

      // FIX #3: Add per-day caffeine guidance
      const hasOvernightFlightToday = segmentsDepartingToday.some(a => a.shouldSleep);

      // Check if next day has overnight flight
      const nextDate = currentDate.clone().add(1, 'day').format('YYYY-MM-DD');
      const segmentsDepartingTomorrow = segmentAnalyses.filter(a =>
        a.departMoment.format('YYYY-MM-DD') === nextDate
      );
      const hasOvernightFlightTomorrow = segmentsDepartingTomorrow.some(a => a.shouldSleep);

      if (hasOvernightFlightToday) {
        const overnightFlight = segmentsDepartingToday.find(a => a.shouldSleep);
        if (overnightFlight) {
          // Calculate caffeine cutoff: 6 hours before user's normal bedtime OR 4 hours before flight, whichever is earlier
          // Anchor to the specific travel date and origin timezone
          const userBedtimeMoment = moment.tz(`${dateYYYYMMDD} ${userSettings.normalBedtime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(firstSegment.from));
          const caffeineCutoffFromBedtime = userBedtimeMoment.clone().subtract(6, 'hours');
          const caffeineCutoffFromFlight = overnightFlight.departMoment.clone().subtract(4, 'hours');

          // Use the earlier of the two times
          const caffeineStopTime = moment.min(caffeineCutoffFromBedtime, caffeineCutoffFromFlight);

          cards.push({
            id: `caffeine-cutoff-${dateYYYYMMDD}`,
            title: 'Caffeine Cutoff',
            time: `Stop by ${caffeineStopTime.format('h:mm A')} ${firstSegment.from} time`,
            icon: '🚫',
            color: '#F3F0ED',
            why: `You have an overnight flight at ${overnightFlight.departMoment.format('h:mm A')}. Stopping caffeine early is often recommended for better sleep.`,
            how: `Consider switching to water or herbal tea. This may help you rest on your overnight flight.`,
            dateTime: caffeineStopTime.toISOString(),
          });
        }
      } else if (hasOvernightFlightTomorrow) {

        const firstFlightToday = segmentsDepartingToday[0];

        cards.push({
          id: `caffeine-limit-${dateYYYYMMDD}`,
          title: 'Limit Caffeine Today',
          time: 'Only before 2 PM',
          icon: '☕',
          color: '#B46B49',
          why: `You have an overnight flight tomorrow. Many travelers limit caffeine intake early today.`,
          how: `Coffee or tea is fine until 2 PM. After that, consider switching to water or herbal tea.`,
          dateTime: moment.tz(`${dateYYYYMMDD} 08:00`, 'YYYY-MM-DD HH:mm', getCityTimezone(firstFlightToday.segment.from)).toISOString(),
        });
      } else {
        const flightWord = segments.length > 1 ? 'flights' : 'flight';
        const layoverText = segments.length > 1 ? ' and layovers' : '';
        const firstFlightToday = segmentsDepartingToday[0];

        // Check if any flight today arrives LATE in the evening (e.g. after 8 PM destination time)
        // If so, we should advise stopping caffeine early to prepare for sleep on arrival.
        const lateArrivalFlight = segmentsDepartingToday.find(a => {
          const arriveHour = a.arriveAtDest.hour();
          // Logic: Arrives between 7 PM (19) and 4 AM (4)
          return arriveHour >= 19 || arriveHour < 4;
        });

        if (lateArrivalFlight) {
          cards.push({
            id: `caffeine-limit-late-arrival-${dateYYYYMMDD}`,
            title: 'Limit Caffeine Today',
            time: 'Stop ~6 hours before bed',
            icon: '☕',
            color: '#B46B49',
            why: `You arrive late (${lateArrivalFlight.arriveMoment.format('h:mm A')}). Avoiding caffeine late in the day will help you sleep upon arrival.`,
            how: `Switch to water or herbal tea during your flight.`,
            dateTime: firstFlightToday.departMoment.clone().subtract(10, 'minutes').toISOString(),
          });
        } else {
          cards.push({
            id: `caffeine-ok-${dateYYYYMMDD}`,
            title: 'Caffeine OK',
            time: `Throughout your ${flightWord}`,
            icon: '☕',
            color: '#B46B49',
            why: `Your ${flightWord} today ${segments.length > 1 ? 'are' : 'is'} all during daytime at destination. Caffeine can help you stay alert.`,
            how: `Coffee or tea is fine during ${flightWord}${layoverText}. Stay hydrated too.`,
            dateTime: firstFlightToday.departMoment.clone().subtract(10, 'minutes').toISOString(),
          });
        }
      }

      // === Add flight segment cards for each flight departing today ===
      segmentsDepartingToday.forEach((analysis) => {
        const segment = analysis.segment;

        cards.push({
          id: `flight-segment-${segment.from}-${segment.to}-${segment.departTime}`,
          title: `Flight from ${segment.from} to ${segment.to}`,
          time: `${analysis.departMoment.format('MMM D h:mm A z')} > ${analysis.arriveMoment.format('MMM D h:mm A z')}`,
          icon: '',
          color: '#2C5F7C',
          why: `${segment.from} > ${segment.to}`,
          how: `Departs ${moment(segment.departDate).format('MMM D')} at ${formatTime12Hour(segment.departTime)}, arrives ${moment(segment.arriveDate).format('MMM D')} at ${formatTime12Hour(segment.arriveTime)}`,
          isInfo: true,
          dateTime: analysis.departMoment.clone().subtract(20, 'minutes').toISOString(),
        });

        // === STRICT STAY HOME LOGIC ===
        if (adjustmentStrategy.percentage === 0) {
          // 1. Get Origin Timezone
          const originCity = circadianOriginCity;
          const originTz = getCityTimezone(originCity);

          // 2. Convert Flight Times to Origin Time
          const departOrigin = moment.tz(segment.departDate + ' ' + segment.departTime, getCityTimezone(segment.from)).tz(originTz);
          const durationMinutes = analysis.durationHours * 60;
          const arriveOrigin = departOrigin.clone().add(durationMinutes, 'minutes');

          // 3. Define "Sleep Window" at Origin (22:00 - 06:00)
          // We need to find if the flight overlaps with ANY sleep window.
          // The flight could cover yesterday's sleep, today's sleep, or tomorrow's sleep.

          let proposedSleepStart: moment.Moment | null = null;
          let proposedSleepEnd: moment.Moment | null = null;
          let maxOverlapMinutes = 0;

          // Parse user settings
          const bedTimeStr = userSettings.normalBedtime || "22:00";
          const wakeTimeStr = userSettings.normalWakeTime || "06:00";
          const bedHour = parseInt(bedTimeStr.split(':')[0]);
          const bedMin = parseInt(bedTimeStr.split(':')[1]);
          const wakeHour = parseInt(wakeTimeStr.split(':')[0]);
          const wakeMin = parseInt(wakeTimeStr.split(':')[1]);

          // duration of sleep window
          // If wake < bed (e.g. 07:00 < 23:00), it implies next day
          let sleepDurationMinutes = (wakeHour * 60 + wakeMin) - (bedHour * 60 + bedMin);
          if (sleepDurationMinutes < 0) sleepDurationMinutes += 24 * 60;

          // Buffer arrival time: Stop sleeping 45 mins before landing for descent/prep
          const effectiveArriveOrigin = arriveOrigin.clone().subtract(45, 'minutes');

          const checkOffsets = [-1, 0, 1];

          checkOffsets.forEach(dayOffset => {
            // "Night" starts at user's bedtime on the offset day
            const nightStart = departOrigin.clone().add(dayOffset, 'days').startOf('day').hour(bedHour).minute(bedMin);
            const nightEnd = nightStart.clone().add(sleepDurationMinutes, 'minutes');

            // Calculate intersection between [Depart, Arrive-Buffer] and [NightStart, NightEnd]
            const overlapStart = moment.max(departOrigin, nightStart);
            const overlapEnd = moment.min(effectiveArriveOrigin, nightEnd);

            if (overlapEnd.isAfter(overlapStart)) {
              const overlapDuration = overlapEnd.diff(overlapStart, 'minutes');
              if (overlapDuration > maxOverlapMinutes) {
                maxOverlapMinutes = overlapDuration;
                proposedSleepStart = overlapStart;
                proposedSleepEnd = overlapEnd;
              }
            }
          });

          // 4. Decision: If overlap > 60 mins, suggest sleep.
          if (maxOverlapMinutes > 60 && proposedSleepStart && proposedSleepEnd) {
            // Round to nearest 15 minutes
            const roundNear15 = (m: moment.Moment) => {
              const remainder = m.minute() % 15;
              if (remainder < 8) return m.clone().subtract(remainder, 'minutes').startOf('minute');
              return m.clone().add(15 - remainder, 'minutes').startOf('minute');
            };

            let finalSleepStart = roundNear15(proposedSleepStart as moment.Moment);
            let finalSleepEnd = roundNear15(proposedSleepEnd as moment.Moment);

            // Clamp: Ensure sleep end doesn't exceed effective arrival
            // (Rounding up might push 4:54 -> 5:00 when arriving at 5:00)
            if (finalSleepEnd.isAfter(effectiveArriveOrigin)) {
              // If rounding pushes it over, just use the effective arrival (floored to minute)
              finalSleepEnd = effectiveArriveOrigin.clone().startOf('minute');
            }

            const sleepStartStr = finalSleepStart.format('h:mm A');
            const sleepEndStr = finalSleepEnd.format('h:mm A');
            const originBedTimeFmt = moment(bedTimeStr, "HH:mm").format("h:mm A");
            const originWakeTimeFmt = moment(wakeTimeStr, "HH:mm").format("h:mm A");

            cards.push({
              id: `sleep-${segment.from}-${segment.to}-stayhome`,
              title: `Sleep ${sleepStartStr} - ${sleepEndStr}`,
              time: `${sleepStartStr} - ${sleepEndStr} (${originCity} Time)`,
              icon: '😴',
              color: '#1C5D74',
              why: `This matches your normal sleep schedule in ${originCity} (${originBedTimeFmt} - ${originWakeTimeFmt}).`,
              how: `Use eye mask and earplugs. Set an alarm for ${sleepEndStr}.`,
              dateTime: (proposedSleepStart as moment.Moment).toISOString(),
            });

            // If there's a significant awake period BEFORE sleep
            const awakeDurationBefore = (proposedSleepStart as moment.Moment).diff(departOrigin, 'minutes');
            if (awakeDurationBefore > 45) {
              cards.push({
                id: `awake-pre-${segment.from}-${segment.to}-stayhome`,
                title: `Stay Awake`,
                time: `Until ${sleepStartStr}`,
                icon: '👁️',
                color: '#FFF7C5',
                why: `It's still daytime in ${originCity}. Wait until ${sleepStartStr} to sleep.`,
                how: `Watch a movie or read.`,
                dateTime: departOrigin.toISOString(),
              });
            }

            // If there's a significant awake period AFTER sleep
            const awakeDurationAfter = arriveOrigin.diff((proposedSleepEnd as moment.Moment), 'minutes');
            if (awakeDurationAfter > 45) {
              cards.push({
                id: `awake-post-${segment.from}-${segment.to}-stayhome`,
                title: `Wake Up & Stay Awake`,
                time: `From ${sleepEndStr}`,
                icon: '👁️',
                color: '#FFF7C5',
                why: `It's morning in ${originCity} (${sleepEndStr}).`,
                how: `Force yourself to wake up to stay on your home schedule.`,
                dateTime: (proposedSleepEnd as moment.Moment).toISOString(),
              });
            }

          } else {
            // No sleep overlap - Stay Awake
            cards.push({
              id: `awake-${segment.from}-${segment.to}-stayhome`,
              title: `Stay Awake`,
              time: `Throughout flight`,
              icon: '👁️',
              color: '#FFF7C5',
              why: `It's daytime back home in ${originCity}. Staying awake helps you keep your natural rhythm.`,
              how: `Watch movies, work, or read. Staying engaged will help you feel more energized when you arrive.`,
              dateTime: analysis.departMoment.clone().toISOString(),
            });
          }
          // SKIP standard logic
          return;
        }

        // === Add sleep/wake recommendation for THIS specific flight ===
        if (analysis.shouldSleep) {
          // Calculate specific sleep window
          const arriveHourLocal = analysis.arriveMoment.hour();
          let sleepStart: moment.Moment;
          let sleepEnd: moment.Moment;



          if (arriveHourLocal >= 5 && arriveHourLocal < 18) {
            // Day Arrival: Anchor to Arrival (Wake up just before landing)
            // Goal: Wake up 45 mins before landing
            const targetWake = analysis.arriveMoment.clone().subtract(45, 'minutes');
            const targetDuration = Math.min(analysis.durationHours - 1.5, 8); // Leave 1.5h gap (start/end)
            sleepEnd = targetWake;
            sleepStart = targetWake.clone().subtract(targetDuration * 60, 'minutes');
          } else {
            // Night Arrival: Anchor to Departure (Sleep early to build pressure later)
            // Goal: Sleep after meal service (~1h in)
            const targetStart = analysis.departMoment.clone().add(1, 'hour');
            const targetDuration = Math.min(analysis.durationHours - 2, 6); // Cap at 6h to ensure tiredness
            sleepStart = targetStart;
            sleepEnd = targetStart.clone().add(targetDuration * 60, 'minutes');
          }

          // Safety clamp: Ensure sleep start isn't before departure
          if (sleepStart.isBefore(analysis.departMoment)) {
            sleepStart = analysis.departMoment.clone().add(30, 'minutes');
          }
          // Ensure sleep end isn't after arrival (Buffer 45 mins)
          // Was 20, changing to 45 for consistency with Stay Home logic
          const effectiveArrive = analysis.arriveMoment.clone().subtract(45, 'minutes');
          if (sleepEnd.isAfter(effectiveArrive)) {
            sleepEnd = effectiveArrive;
          }

          // Rounding Logic
          const roundNear15 = (m: moment.Moment) => {
            const remainder = m.minute() % 15;
            if (remainder < 8) return m.clone().subtract(remainder, 'minutes').startOf('minute');
            return m.clone().add(15 - remainder, 'minutes').startOf('minute');
          };

          sleepStart = roundNear15(sleepStart);
          sleepEnd = roundNear15(sleepEnd);

          // Re-clamp after rounding just in case rounding pushed it over
          if (sleepEnd.isAfter(effectiveArrive)) {
            sleepEnd = effectiveArrive.clone().startOf('minute');
          }

          // Determine dynamic descriptions based on strategy
          let whyText = '';
          let howText = '';

          if (arriveHourLocal >= 5 && arriveHourLocal < 18) {
            whyText = `You arrive during the day (${analysis.arriveMoment.format('h:mm A')}). Waking up shortly before landing helps you start your day refreshed.`;
            howText = `Target sleep for the SECOND half of the flight. Use eye mask and earplugs. Wake up for breakfast/descent.`;
          } else {
            whyText = `You arrive at night (${analysis.arriveMoment.format('h:mm A')}). Sleeping early helps you wake up tired enough to sleep again at your destination.`;
            howText = `Target sleep for the FIRST half of the flight. Stay awake later to build sleep pressure for tonight.`;
          }

          cards.push({
            id: `sleep-${segment.from}-${segment.to}`,
            title: `Sleep on ${segment.from} > ${segment.to} Flight`,
            time: `Target: ${sleepStart.format('h:mm A z')} - ${sleepEnd.format('h:mm A z')}`,
            icon: '😴',
            color: '#1C5D74',
            why: whyText,
            how: howText,
            dateTime: sleepStart.clone().subtract(15, 'minutes').toISOString(),
          });


        } else if (analysis.isDaytimeFlight && analysis.durationHours >= 2) {
          cards.push({
            id: `awake-${segment.from}-${segment.to}`,
            title: `Stay Awake on ${segment.from} > ${segment.to} Flight`,
            time: `${analysis.departMoment.format('h:mm A z')} - ${analysis.arriveMoment.format('h:mm A z')}`,
            icon: '👁️',
            color: '#F3F0ED',
            why: adjustmentStrategy.percentage === 0
              ? `It's daytime in ${circadianOriginCity}. Stay awake to stay aligned with ${circadianOriginCity} timezone.`
              : `This flight is during daytime at your destination. Stay awake to stay aligned with ${trip.to} timezone.`,
            how: `Watch movies, read, work. Accept meals. Walk around cabin. Stay engaged and alert.`,
            dateTime: analysis.departMoment.clone().subtract(5, 'minutes').toISOString(),
          });
        }

        // === Add layover guidance if there's a connection ===
        if (analysis.nextLayoverHours !== undefined) {
          const layoverHours = analysis.nextLayoverHours;
          const nextSegment = segments[segments.indexOf(segment) + 1];

          if (layoverHours >= 0.5 && layoverHours < 2) {
            // Short layover - just transit
            cards.push({
              id: `layover-${segment.to}-short`,
              title: `${segment.to} Layover`,
              time: `${Math.round(layoverHours * 60)} min connection`,
              icon: '🚶',
              color: '#F3F0ED',
              why: `Quick connection in ${segment.to}. Focus on making your next flight.`,
              how: `Head directly to next gate. Use restroom. Refill water. No time for meals or exploring.`,
              dateTime: analysis.arriveMoment.clone().add(5, 'minutes').toISOString(),
            });
          } else if (layoverHours >= 2 && layoverHours < 5) {
            // Medium layover - opportunity to adjust
            const layoverArriveHour = analysis.arriveMoment.hour();
            const isNightArrival = layoverArriveHour >= 22 || layoverArriveHour < 6;

            if (isNightArrival && layoverHours >= 3) {
              cards.push({
                id: `layover-${segment.to}-rest`,
                title: `${segment.to} Layover - Rest`,
                time: `${Math.round(layoverHours)} hour layover`,
                icon: '💤',
                color: '#F3F0ED',
                why: `${Math.round(layoverHours)}-hour overnight layover. This is a chance to rest before your next flight.`,
                how: `Find a quiet area. Set alarm for 90 min before next flight. Short nap OK but don't miss your flight!`,
                dateTime: analysis.arriveMoment.clone().add(30, 'minutes').toISOString(),
              });
            } else {
              // Check if next flight is overnight - if so, avoid caffeine
              const nextAnalysis = segmentAnalyses.find(a => a.segment === nextSegment);
              const nextIsOvernight = nextAnalysis?.shouldSleep;

              cards.push({
                id: `layover-${segment.to}-active`,
                title: `${segment.to} Layover - Stay Active`,
                time: `${Math.round(layoverHours)} hour layover`,
                icon: '🚶',
                color: '#F3F0ED',
                why: `${Math.round(layoverHours)}-hour layover during daytime. Stay active and alert.`,
                how: nextIsOvernight
                  ? `Walk around terminal. Eat a light meal. Stretch. Avoid caffeine - you have an overnight flight next.`
                  : `Walk around terminal. Eat a light meal. Caffeine OK if needed. Stay hydrated.`,
                dateTime: analysis.arriveMoment.clone().add(15, 'minutes').toISOString(),
              });
            }
          } else if (layoverHours >= 5) {
            // Long layover - might leave airport
            cards.push({
              id: `layover-${segment.to}-long`,
              title: `${segment.to} Extended Layover`,
              time: `${Math.round(layoverHours)} hour layover`,
              icon: '🏨',
              color: '#F3F0ED',
              why: `${Math.round(layoverHours)}-hour layover. You have time to leave the airport if you want.`,
              how: `Consider booking airport hotel for shower/rest. Or explore city if you have visa. Set multiple alarms!`,
              dateTime: analysis.arriveMoment.clone().add(30, 'minutes').toISOString(),
            });
          }
        }
      });


    }

    currentDate.add(1, 'day');
  }



  // === Add overall hydration card ===
  cards.push({
    id: 'travel-hydrate',
    title: 'Stay Hydrated',
    time: segments.length > 1 ? `All flights and layovers` : `Throughout your flight`,
    icon: '💧',
    color: '#DBEAFE',
    why: segments.length > 1
      ? `Multi-leg journey with ${segments.length} flights. Airplane cabins are extremely dry. Dehydration compounds jet lag.`
      : 'Airplane cabins are extremely dry. Dehydration worsens jet lag symptoms.',
    how: segments.length > 1
      ? `Drink water regularly on planes and during layovers. Aim for 8oz per flight hour. Avoid excessive alcohol.`
      : `Drink water regularly on the plane. Aim for 8oz per flight hour. Avoid excessive alcohol.`,
    dateTime: journeyStart.clone().subtract(15, 'minutes').toISOString(),
  });

  return cards;
}

function generateAdjustCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  adjustmentStrategy: { percentage: number; reason: string },
  userSettings: UserSettings,
  nextTrip: Trip | undefined,
  startDate: string,
  circadianOriginCity: string
): Card[] {
  const cards: Card[] = [];

  // Determine the actual landing time
  const lastSegment = trip.segments && trip.segments.length > 0
    ? trip.segments[trip.segments.length - 1]
    : null;

  const landingMoment = lastSegment
    ? moment.tz(
      `${lastSegment.arriveDate} ${lastSegment.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(lastSegment.to)
    )
    : moment(startDate).startOf('day');

  const landingHour = landingMoment.hour();
  const landingTime = landingMoment.format('h:mm A');

  // TRIGGER: Late Night Arrival Logic (< 4 AM)
  // If true, we treat the rest of the arrival day as "Day 1" of the Daily Routine.
  const isLateNightArrival = landingHour < 4;

  // ============================================
  // ARRIVAL DAY CARDS (conditional based on landing time)
  // ============================================

  cards.push({
    id: 'adjust-arrival',
    title: 'You\'ve Arrived!',
    time: `Landed at ${landingTime}`,
    icon: '🎉',
    color: '#10b981',
    why: (adjustmentStrategy.percentage === 0 && !trip.adjustmentPreference)
      ? `You've reached ${trip.to}. Short trips are about energy management.`
      : adjustmentStrategy.reason,
    how: (adjustmentStrategy.percentage === 0 && !trip.adjustmentPreference)
      ? 'Get your bags and head to your accommodation. Focus on rest when you can.'
      : (adjustmentStrategy.percentage === 0 && trip.adjustmentPreference === 'stay_home')
        ? 'Stick to your origin schedule as much as possible. Focus on rest when you can.'
        : 'Get your bags, clear customs, head to your accommodation. The adjustment phase begins now.',
    dateTime: landingMoment.toISOString(),
  });

  // If land between 4 AM and 10 AM - get morning sunlight immediately
  // NOTE: For late night arrivals (< 4 AM), we SKIP this card.
  // The Daily Routine "Seek Sunlight" card will cover the morning of this arrival day.
  // ALSO SKIP for Stay Home strategy
  if (adjustmentStrategy.percentage > 0 && landingHour >= 4 && landingHour < 10) {
    cards.push({
      id: 'adjust-arrival-morning-light',
      title: 'Seek Morning Sunlight Now', // Changed title to distinguish from daily routine
      time: `${landingTime} - 10:00 AM`,
      icon: '☀️',
      color: '#FFF7C5',
      why: `Perfect timing! You landed during prime morning light hours. Get outside immediately.`,
      how: 'Get sunlight during your commute from airport. Even through windows helps. This jumpstarts your adjustment.',
      dateTime: landingMoment.toISOString(),
    });
  }

  // If land 10 AM - 6 PM - get afternoon sunlight (Skip for Stay Home)
  if (adjustmentStrategy.percentage > 0 && landingHour >= 10 && landingHour < 18) {
    cards.push({
      id: 'adjust-arrival-afternoon-light',
      title: 'Get Afternoon Sunlight',
      time: `${landingTime} - 6:00 PM`,
      icon: '🌞',
      color: '#FFF7C5',
      why: `You landed mid-day. Get outdoor light for the rest of the afternoon to help adjustment.`,
      how: 'Stay active outdoors if possible. Walk around your neighborhood. Sit by windows. Avoid napping.',
      dateTime: landingMoment.toISOString(),
    });
  }

  // Caffeine guidance for arrival day
  // Only suggest caffeine if landing during normal morning hours (6 AM+).
  // Avoid suggesting it for middle-of-the-night arrivals (e.g. 1 AM) where sleep is priority.
  // SKIP for Stay Home strategy (users should stick to origin habits)
  if (adjustmentStrategy.percentage > 0 && landingHour >= 6 && landingHour < 14) {
    cards.push({
      id: 'adjust-arrival-caffeine',
      title: 'Caffeine OK Until 2 PM',
      time: `${landingTime} - 2:00 PM`,
      icon: '☕',
      color: '#B46B49',
      why: 'Stay alert after landing, but cut off early enough to sleep tonight.',
      how: 'Coffee or tea is fine until 2 PM. Then switch to water.',
      dateTime: landingMoment.toISOString(),
    });
  }

  // No caffeine after 2 PM (Always show, UNLESS it's a Late Night Arrival OR Stay Home Strategy)
  // For Late Night Arrivals, the Daily Routine "Limit Caffeine" card will cover this day.
  if (!isLateNightArrival && adjustmentStrategy.percentage > 0) {
    const noCaffeineTime = landingMoment.clone().hour(14).minute(0).second(0);
    cards.push({
      id: 'adjust-arrival-no-caffeine',
      title: 'Limit Caffeine After 2 PM',
      time: 'After 2:00 PM',
      icon: '🚫',
      color: '#F3F0ED',
      why: 'Your first night of sleep in the new timezone is critical. Try to avoid caffeine in the afternoon.',
      how: 'Switch to water, herbal tea, or juice after 2 PM.',
      dateTime: noCaffeineTime.toISOString(),
    });
  }

  // ============================================
  // SIMPLIFIED: Stay Home Strategy - Simple Energy Management
  // ============================================
  if (adjustmentStrategy.percentage === 0) {
    // Check if returning home (no advice needed - just resume normal life)
    const localTz = getCityTimezone(trip.to);
    const homeTz = getCityTimezone(circadianOriginCity);
    const isReturningHome = localTz === homeTz;

    if (!isReturningHome) {
      // Simple energy management card - no specific times, no timezone math
      cards.push({
        id: 'adjust-stay-home-tips',
        title: 'Managing Energy',
        time: 'Throughout your stay',
        icon: '⚡',
        color: '#FFD4C4',
        why: `Short trip - your body will stay on ${circadianOriginCity} time. Focus on rest and energy management.`,
        how: `Listen to your body. Rest when tired. Stay hydrated. Eat light meals. Gentle exercise helps. You'll naturally feel alert during your usual waking hours.`,
        dateTime: landingMoment.clone().add(2, 'hours').toISOString(),
      });
    }
  }

  const arrivalDate = landingMoment.format('YYYY-MM-DD');


  // Evening meal and sleep guidance - conditional based on arrival time
  if (landingHour >= 22 || landingHour < 4) {
    // Very late arrival (10 PM or later)

    // FIX FOR STAY HOME: Check Origin Time!
    // If it's 7 AM at origin, do NOT tell them to go to sleep.
    let shouldSleepNow = true;
    let overrideTitle = '';
    let overrideMsg = '';

    if (adjustmentStrategy.percentage === 0) {
      const originTz = getCityTimezone(circadianOriginCity);
      const landingAtOrigin = landingMoment.clone().tz(originTz);
      const originHour = landingAtOrigin.hour();

      // If it is DAYTIME at origin (e.g. 6 AM to 8 PM), advise staying awake
      if (originHour >= 6 && originHour < 20) {
        shouldSleepNow = false;
        overrideTitle = `Start Your Day`;
        overrideMsg = `It's ${landingAtOrigin.format('h:mm A')} in ${circadianOriginCity}. Even though it's late here, try to stay awake to maintain your origin schedule.`;
      }
    }

    if (shouldSleepNow) {
      cards.push({
        id: 'adjust-arrival-sleep-now',
        title: 'Head to Bed Soon',
        time: 'As soon as you can',
        icon: '🌙',
        color: '#1C5D74',
        why: adjustmentStrategy.percentage === 0
          ? `You arrived late. Sleep now to get some rest before continuing your day on ${circadianOriginCity} time.`
          : `You arrived at ${landingTime}. Get some rest tonight and start the full adjustment routine tomorrow.`,
        how: adjustmentStrategy.percentage === 0
          ? `Get some sleep now. You'll want to wake up closer to your normal time in ${circadianOriginCity}.`
          : `Get to your accommodation and sleep. ${userSettings.useMelatonin ? 'Using melatonin is an option if you choose.' : ''
          } Tomorrow you'll begin the complete adjustment schedule.`,
        dateTime: landingMoment.toISOString(),
      });
    } else {
      // Stay Home + Daytime at Origin -> Suggest Activity
      cards.push({
        id: 'adjust-arrival-stay-awake',
        title: overrideTitle,
        time: 'Until usual bedtime',
        icon: '👁️',
        color: '#FFF7C5',
        why: overrideMsg,
        how: `Light activity, read, or work. Wait until your normal bedtime in ${circadianOriginCity} to sleep.`,
        dateTime: landingMoment.toISOString(),
      });
    }

  } else if (landingHour >= 18) {
    // Evening arrival (6 PM - 10 PM) - light meal then bed
    cards.push({
      id: 'adjust-arrival-light-meal',
      title: 'Light Evening Meal',
      time: 'Soon after arrival',
      icon: '🍽️',
      color: '#F3F0ED',
      why: `Evening arrival at ${landingTime}. Have a light meal to help you settle in.`,
      how: 'Eat something light at your accommodation or nearby. Don\'t skip food, but avoid heavy meals late at night.',
      dateTime: landingMoment.toISOString(),
    });


    if (adjustmentStrategy.percentage > 0) {
      cards.push({
        id: 'adjust-arrival-sleep',
        title: 'Sleep at Local Bedtime',
        time: formatTimeRange12Hour(userSettings.normalBedtime, moment(userSettings.normalBedtime, 'HH:mm').add(8, 'hours').format('HH:mm')),
        icon: '🌙',
        color: '#1C5D74',
        why: 'Getting to bed at a reasonable local time helps start your adjustment.',
        how: `Try to sleep around ${formatTime12Hour(userSettings.normalBedtime)}. ${userSettings.useMelatonin ? 'Using melatonin is an option 30 min before bed if you choose.' : ''
          } Keep room dark and cool.`,
        dateTime: moment.tz(`${arrivalDate} ${userSettings.normalBedtime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.to)).toISOString(),
      });
    } else {
      // Stay Home logic for evening arrival?
      // Maybe just "Rest when tired"
      cards.push({
        id: 'adjust-arrival-rest-home',
        title: 'Rest When Tired',
        time: 'Evening',
        icon: '🌙',
        color: '#1C5D74',
        why: 'Stick to your origin schedule where possible, but rest if you are exhausted.',
        how: 'If it is sleep time at origin, go to bed. Otherwise, try to stay awake or take a short nap.',
        dateTime: landingMoment.clone().add(1, 'hour').toISOString(),
      });
    }
  } else {
    // Daytime arrival (before 6 PM) - normal dinner and sleep schedule
    // Only for Adjustment Strategy
    if (adjustmentStrategy.percentage > 0) {
      const dinnerTime = landingMoment.clone().hour(18).minute(0).second(0);
      cards.push({
        id: 'adjust-arrival-dinner',
        title: 'Eat Dinner at Local Time',
        time: '6:00 - 8:00 PM',
        icon: '🍽️',
        color: '#F3F0ED',
        why: 'Eating at local meal times helps reset your internal clock.',
        how: 'Have dinner at a normal local dinner time, even if not hungry. Light meal is fine.',
        dateTime: dinnerTime.toISOString(),
      });
    }

    if (adjustmentStrategy.percentage > 0) {
      cards.push({
        id: 'adjust-arrival-sleep',
        title: 'Sleep at Local Time Tonight',
        time: formatTime12Hour(userSettings.normalBedtime),
        icon: '🌙',
        color: '#1C5D74',
        why: 'Your first night in the new timezone. Sleeping at normal local bedtime is recommended even if not tired.',
        how: `Try to go to bed around ${formatTime12Hour(userSettings.normalBedtime)}. Keep room dark and cool. ${userSettings.useMelatonin ? 'Using melatonin is an option 30 min before bed if you choose.' : ''
          }`,
        dateTime: moment.tz(`${arrivalDate} ${userSettings.normalBedtime}`, 'YYYY-MM-DD HH:mm', getCityTimezone(trip.to)).toISOString(),
      });
    }
  }

  // ============================================
  // VISUAL SEPARATOR - Place at end of arrival day (11:59 PM)
  // Only show for full adjustment plans where we have a recurring routine
  // ============================================

  if (adjustmentStrategy.percentage > 0) {
    const separatorTime = isLateNightArrival
      ? landingMoment.clone().add(2, 'hours') // Place shortly after landing/bedtime
      : landingMoment.clone().endOf('day');   // Normal placement at end of day

    cards.push({
      id: 'adjust-separator',
      title: 'Daily Routine - Follow These Each Day >',
      time: '',
      icon: '',
      color: '#E5E7EB',
      why: '',
      how: '',
      isInfo: true,
      dateTime: separatorTime.toISOString(),
    });
  }

  // ============================================
  // RECURRING DAILY CARDS (for all following days)
  // ============================================

  // Calculate wake time for next day (OR same day if late night arrival)
  const [wakeHour, wakeMinute] = userSettings.normalWakeTime.split(':').map(Number);
  const nextDayMorning = isLateNightArrival
    ? landingMoment.clone().startOf('day').hour(wakeHour).minute(wakeMinute)
    : landingMoment.clone().add(1, 'day').startOf('day').hour(wakeHour).minute(wakeMinute);

  const nextDayStr = nextDayMorning.format('YYYY-MM-DD');

  // Calculate light window (3 hours from wake)
  const wakeMoment = moment(userSettings.normalWakeTime, 'HH:mm');
  const lightEndStr = wakeMoment.clone().add(3, 'hours').format('HH:mm');

  // ADAPTIVE TITLE: If wake time is late (>= 11 AM), don't say "Morning"
  // wakeHour is parsed from "HH:mm" string above
  const sunTitle = wakeHour >= 11 ? 'Seek Sunlight' : 'Seek Morning Sunlight';

  if (adjustmentStrategy.percentage > 0) {
    cards.push({
      id: 'adjust-morning-light-daily',
      title: sunTitle,
      time: formatTimeRange12Hour(userSettings.normalWakeTime, lightEndStr),
      icon: '☀️',
      color: '#FFF7C5',
      why: `Most powerful tool for locking in ${trip.to} timezone. Light exposure helps stabilize your internal body clock.`,
      how: 'Try to get outside for 30-60 minutes in natural daylight. Even cloudy days work.',
      dateTime: nextDayMorning.toISOString(),
      isDailyRoutine: true,
    });

    // ADAPTIVE CAFFEINE LOGIC
    // Rule: Stop caffeine 9 hours before bedtime
    // Example: Bedtime 23:00 -> Cutoff 14:00 (2 PM)
    // Example: Bedtime 02:00 -> Cutoff 17:00 (5 PM)
    const bedMoment = moment(userSettings.normalBedtime, 'HH:mm');
    // Handle crossing midnight for bedtime if needed (though usually simple subtraction works for time-of-day logic here)
    // We just need a time string for the same day context
    const caffeineCutoffMoment = bedMoment.clone().subtract(9, 'hours');
    const caffeineCutoffStr = caffeineCutoffMoment.format('HH:mm');
    const cutoffTimeDisplay = caffeineCutoffMoment.format('h:mm A');

    // Determine if we should show "Caffeine OK"
    // Logic: If Wake Time is BEFORE Cutoff, show window.
    // If Wake Time is AFTER or SAME as Cutoff, skip "Caffeine OK" card.
    // Compare minutes from midnight
    const wakeMinutes = wakeHour * 60 + wakeMinute;
    const cutoffMinutes = caffeineCutoffMoment.hour() * 60 + caffeineCutoffMoment.minute();

    // Handle midnight wrap-around for cutoff (e.g. Bedtime 6 AM -> Cutoff 9 PM previous day? Or Bedtime 8 AM -> Cutoff 11 PM)
    // Assuming normal bedtimes (e.g. 20:00 to 04:00).
    // If simplified: usually bedtime is late, wake is early.
    // If cutoffMinutes < wakeMinutes (and both are same day), then NO caffeine window.

    // NOTE: Simple comparison assumes same day.
    // If Bedtime is 01:00 (next day), subtract 9h = 16:00 (4 PM).
    // If Wake is 12:00. 12:00 < 16:00. OK.
    // If Bedtime is 22:00. Subtract 9h = 13:00 (1 PM).
    // If Wake is 14:00. 14:00 > 13:00. No Caffeine.

    // Case C: Wake 3 PM (15:00), Bedtime 2 AM (02:00 + 24h = 26:00). Cutoff 17:00.
    // We need to handle the bedtime crossing midnight relative to wake time.
    let adjustedCutoffMinutes = cutoffMinutes;
    // If cutoff seems significantly earlier than wake (like 4 AM cutoff vs 7 AM wake), maybe it wrapped?
    // But strictly, subtract 9h from bedtime.
    // Let's assume standard day flow.
    // If Bedtime is < WakeTime (e.g. Bed 02:00, Wake 10:00 - weird, but implies 02:00 is next day).
    // If Bedtime < 12:00 (noon), assume it's next day (late night).
    let effectiveBedMinutes = bedMoment.hour() * 60 + bedMoment.minute();
    if (effectiveBedMinutes < 12 * 60) {
      effectiveBedMinutes += 24 * 60; // Treat as next day
    }
    const effectiveCutoffMinutes = effectiveBedMinutes - (9 * 60);

    if (wakeMinutes < effectiveCutoffMinutes) {
      cards.push({
        id: 'adjust-caffeine-ok',
        title: 'Caffeine OK',
        time: formatTimeRange12Hour(userSettings.normalWakeTime, caffeineCutoffStr),
        icon: '☕',
        color: '#92400e',
        why: 'Strategic caffeine helps you stay alert during local daytime. Essential for adjustment.',
        how: 'Coffee or tea during these hours. Helps fight off sleepiness and stay on local schedule.',
        dateTime: nextDayMorning.clone().toISOString(),
        isDailyRoutine: true,
      });
    }

    // Always show cutoff card (or "No Caffeine" if immediate)
    const noCaffeineTimeDisplay = wakeMinutes >= effectiveCutoffMinutes
      ? `Since waking (${formatTime12Hour(userSettings.normalWakeTime)})`
      : `After ${cutoffTimeDisplay}`;

    const noCaffeineTimeForSort = wakeMinutes >= effectiveCutoffMinutes
      ? userSettings.normalWakeTime // Sort at wake time
      : caffeineCutoffStr;          // Sort at cutoff time

    cards.push({
      id: 'adjust-no-caffeine',
      title: `Limit Caffeine After ${cutoffTimeDisplay}`,
      time: noCaffeineTimeDisplay,
      icon: '🚫',
      color: '#64748b',
      why: 'Caffeine stays in your system 6+ hours. Prioritizing sleep tonight will help you adjust faster.',
      how: 'Switch to water, herbal tea, or decaf. Resist the temptation for afternoon coffee.',
      dateTime: wakeMinutes >= effectiveCutoffMinutes
        ? nextDayMorning.clone().toISOString() // same as wake time
        : nextDayMorning.clone().hour(caffeineCutoffMoment.hour()).minute(caffeineCutoffMoment.minute()).toISOString(),
      isDailyRoutine: true,
    });

    if (direction === 'east') {
      cards.push({
        id: 'adjust-avoid-naps',
        title: 'Avoid Long Naps',
        time: '12:00 - 5:00 PM',
        icon: '⏰',
        color: '#64748b',
        why: 'Eastward travel often makes you drowsy in afternoon. Long naps can make it harder to sleep at night.',
        how: 'If tired, try to limit naps to 20 minutes max. Set an alarm. Better: take a walk outside.',
        dateTime: nextDayMorning.clone().hour(12).minute(0).toISOString(),
        isDailyRoutine: true,
      });
    } else {
      cards.push({
        id: 'adjust-nap-ok',
        title: 'Short Nap OK if Needed',
        time: '1:00 - 3:00 PM',
        icon: '💤',
        color: '#8b5cf6',
        why: 'Westward travel is easier. A brief nap won\'t hurt your adjustment.',
        how: 'If tired, a 20-30 minute nap is fine. Set an alarm. Don\'t nap after 3 PM.',
        dateTime: nextDayMorning.clone().hour(13).minute(0).toISOString(),
        isDailyRoutine: true,
      });
    }

    const localBedtime = userSettings.normalBedtime;
    cards.push({
      id: 'adjust-sleep',
      title: 'Sleep at Local Time',
      time: `${formatTime12Hour(localBedtime)} - consistent schedule`,
      icon: '🌙',
      color: '#1C5D74',
      why: `Your body is learning ${trip.to} time. A consistent sleep schedule helps lock it in.`,
      how: `Try to go to bed around ${formatTime12Hour(localBedtime)} local time. Keep room dark and cool. ${userSettings.useMelatonin ? 'Using melatonin is an option 30 min before bed if you choose.' : ''
        }`,
      dateTime: nextDayMorning.clone().hour(Number(localBedtime.split(':')[0])).minute(Number(localBedtime.split(':')[1])).toISOString(),
      isDailyRoutine: true,
    });

    if (userSettings.useMelatonin) {
      const melatoninTime = moment(localBedtime, 'HH:mm').subtract(30, 'minutes').format('HH:mm');
      cards.push({
        id: 'adjust-melatonin',
        title: 'Melatonin',
        time: `${formatTime12Hour(melatoninTime)} (optional)`,
        icon: '💊',
        color: '#8b5cf6',
        why: 'Some travelers choose to use melatonin to signal to the body that it\'s time to sleep.',
        how: 'If this is something you already use, you may choose to take a small amount 30 minutes before bed. Follow package instructions.',
        dateTime: nextDayMorning.clone().subtract(30, 'minutes').hour(Number(melatoninTime.split(':')[0])).minute(Number(melatoninTime.split(':')[1])).toISOString(),
        isDailyRoutine: true,
      });
    }

    if (userSettings.useMagnesium) {
      cards.push({
        id: 'adjust-magnesium',
        title: 'Magnesium',
        time: 'Evening (optional)',
        icon: '💊',
        color: '#10b981',
        why: 'Some travelers find magnesium helpful for relaxation.',
        how: 'If you choose to use it, many people take magnesium glycinate with dinner.',
        dateTime: nextDayMorning.clone().hour(19).minute(0).toISOString(),
        isDailyRoutine: true,
      });
    }
  }



  // Sort all cards chronologically before returning
  cards.sort((a, b) => {
    // Cards with dateTime come first, sorted chronologically
    // Cards without dateTime (daily routine cards) come last, in insertion order
    if (a.dateTime && !b.dateTime) return -1;
    if (!a.dateTime && b.dateTime) return 1;
    if (!a.dateTime && !b.dateTime) return 0;
    if (!a.dateTime && !b.dateTime) return 0;
    return moment(a.dateTime).diff(moment(b.dateTime));
  });

  // FINAL FILTER: Ensure no cards are after the Next Trip starts
  if (nextTrip) {
    // FIX: Parse next trip time in its ORIGIN timezone to get correct absolute time
    // Otherwise it defaults to local system time (e.g. simulation time), which might be hours off.
    const nextTripStart = moment.tz(
      `${nextTrip.departDate} ${nextTrip.departTime}`,
      'YYYY-MM-DD HH:mm',
      getCityTimezone(nextTrip.from)
    );

    return cards.filter(c => {
      // Keep info cards or cards without explicit time? Usually specific advice has dateTime.
      if (!c.dateTime) return true;
      return moment(c.dateTime).isBefore(nextTripStart);
    });
  }

  return cards;
}

function formatDateRange(start: string, end: string): string {
  const startMoment = moment(start, 'YYYY-MM-DD');
  const endMoment = moment(end, 'YYYY-MM-DD');

  if (!startMoment.isValid() || !endMoment.isValid()) {
    return 'Invalid date';
  }

  if (start === end) {
    return startMoment.format('MMM D');
  }

  if (startMoment.month() === endMoment.month()) {
    return `${startMoment.format('MMM D')} - ${endMoment.format('D')}`;
  }

  return `${startMoment.format('MMM D')} - ${endMoment.format('MMM D')}`;
}

export function getDefaultUserSettings(): UserSettings {
  return {
    normalBedtime: '22:00',
    normalWakeTime: '07:00',
    // chronotype: 'neither',
    useMelatonin: false,
    useMagnesium: false,
  };
}
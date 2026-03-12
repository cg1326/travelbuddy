import moment from 'moment-timezone';
import SunCalc from 'suncalc';
import cityTimezonesLib from 'city-timezones';
import airportCodesLib from 'airport-codes';
import type {
  Connection,
  FlightSegment,
  Trip,
  Card,
  Phase,
  JetLagPlan,
  UserSettings,
} from '../types/models';

// Re-export for backward compatibility
export type {
  Connection,
  FlightSegment,
  Trip,
  Card,
  Phase,
  UserSettings,
};

// TripPlan is an alias for JetLagPlan (keeping for backward compatibility)
export type TripPlan = JetLagPlan;

// HELPER: Safely construct a bedtime moment, adding 1 day if it's past midnight (early morning)
// This fixes the issue where a 12 AM bedtime is treated as the START of the day instead of the end.
function safelyGetBedtimeMoment(dateStr: string, timeStr: string, tz: string): moment.Moment {
  let mom = moment.tz(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm', tz);
  // If the time is essentially "late night" (00:00 - 05:00), it belongs to the NEXT calendar day relative to the "routine day".
  // Example: "Bedtime for Jan 31" is 12:30 AM. This means 12:30 AM on Feb 1.
  if (mom.hour() < 5) {
    mom.add(1, 'day');
  }
  return mom;
}


export const JetLagConfig = {
  SHORT_TRIP_DAYS: 3,
  RAPID_CONNECTION_HOURS: 6,
  PREP_PHASE_THRESHOLD_HOURS: 4, // If diff >= this, use 2 days prep. Else 1 day.
  MAX_PREP_DAYS: 2,
  FLIGHT_TIERS: {
    TIER_1_MH: 6, // Max Hours for Tier 1 (Stay Awake)
    TIER_2_MH: 10 // Max Hours for Tier 2 (Limit Sleep)
  },
  MAX_SHIFT_TOTAL_HOURS: 2,
  RECOVERY_NAP_MINUTES: 90,
  SHORT_NAP_MINUTES: 20,
  MIN_TIMEZONE_DIFF_HOURS: 1, // Minimum diff to trigger any advice
  SMALL_TIMEZONE_DIFF_HOURS: 3, // Diff that triggers partial adjustment logic
};


export const LEGACY_CITY_TIMEZONES: { [key: string]: string } = {
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
  'San Sebastian': 'Europe/Madrid',  // EAS airport
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
  // Popular Vacation Destinations (Batch 1)
  'Philipsburg': 'America/Lower_Princes',  // St Maarten (SXM)
  'Punta Cana': 'America/Santo_Domingo',  // Dominican Republic (PUJ)
  'Bora Bora': 'Pacific/Tahiti',  // French Polynesia (BOB)
  'Thira': 'Europe/Athens',  // Santorini (JTR)
  'Mykonos': 'Europe/Athens',  // Greece (JMK)
  'Ibiza': 'Europe/Madrid',  // Spain (IBZ)
  'Providenciales': 'America/Grand_Turk',  // Turks and Caicos (PLS)
  'Kahului': 'Pacific/Honolulu',  // Maui (OGG)
  'Kona': 'Pacific/Honolulu',  // Big Island (KOA)
  'Hamilton': 'Atlantic/Bermuda',  // Bermuda (BDA)
  'Vieux Fort': 'America/St_Lucia',  // St Lucia (UVF)
  'Victoria': 'Indian/Mahe',  // Seychelles (SEZ)
  // Popular Vacation Destinations (Batch 2)
  'Oranjestad': 'America/Aruba',  // Aruba (AUA)
  'Willemstad': 'America/Curacao',  // Curacao (CUR)
  'Bridgetown': 'America/Barbados',  // Barbados (BGI)
  'Montego Bay': 'America/Jamaica',  // Jamaica (MBJ)
  'George Town': 'America/Cayman',  // Grand Cayman (GCM)
  'St. Thomas': 'America/St_Thomas',  // US Virgin Islands (STT)
  'Christiansted': 'America/St_Thomas',  // St Croix (STX)
  'Point Salines': 'America/Grenada',  // Grenada (GND)
  'Ko Samui': 'Asia/Bangkok',  // Koh Samui (USM)
  'Langkawi': 'Asia/Kuala_Lumpur',  // Malaysia (LGK)
  'Caticlan': 'Asia/Manila',  // Boracay (MPH)
  'Plaisance': 'Indian/Mauritius',  // Mauritius (MRU)
  'Valletta': 'Europe/Malta',  // Malta (MLA)
  'Heraklion': 'Europe/Athens',  // Crete (HER)
  'Rhodes': 'Europe/Athens',  // Rhodes (RHO)
  'Corfu': 'Europe/Athens',  // Corfu (CFU)
  'Palma': 'Europe/Madrid',  // Mallorca (PMI)
  'Mahon': 'Europe/Madrid',  // Menorca (MAH)
  'Lihue': 'Pacific/Honolulu',  // Kauai (LIH)
  'Tenerife': 'Atlantic/Canary',  // Canary Islands (TFS)
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

export const LEGACY_CITY_COORDINATES: { [key: string]: { lat: number; lng: number } } = {
  // North America
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Phoenix': { lat: 33.4484, lng: -112.0740 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Washington DC': { lat: 38.9072, lng: -77.0369 },
  'Philadelphia': { lat: 39.9526, lng: -75.1652 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Honolulu': { lat: 21.3069, lng: -157.8583 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Cancun': { lat: 21.1619, lng: -86.8515 },
  'Portland': { lat: 45.5152, lng: -122.6784 },
  'Salt Lake City': { lat: 40.7608, lng: -111.8910 },
  'New Orleans': { lat: 29.9511, lng: -90.0715 },
  'Nashville': { lat: 36.1627, lng: -86.7816 },
  'Orlando': { lat: 28.5383, lng: -81.3792 },
  'Detroit': { lat: 42.3314, lng: -83.0458 },
  'Minneapolis': { lat: 44.9778, lng: -93.2650 },
  'Charlotte': { lat: 35.2271, lng: -80.8431 },
  'Indianapolis': { lat: 39.7684, lng: -86.1581 },
  'Columbus': { lat: 39.9612, lng: -82.9988 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'Jacksonville': { lat: 30.3322, lng: -81.6557 },
  'Raleigh': { lat: 35.7796, lng: -78.6382 },
  'St. Louis': { lat: 38.6270, lng: -90.1994 },
  'Kansas City': { lat: 39.0997, lng: -94.5786 },
  'Milwaukee': { lat: 43.0389, lng: -87.9065 },
  'Calgary': { lat: 51.0447, lng: -114.0719 },
  'Ottawa': { lat: 45.4215, lng: -75.6972 },
  'Quebec City': { lat: 46.8139, lng: -71.2082 },
  'Guadalajara': { lat: 20.6597, lng: -103.3496 },
  'Monterrey': { lat: 25.6866, lng: -100.3161 },
  'San Jose (CR)': { lat: 9.9281, lng: -84.0907 },
  'Panama City': { lat: 8.9824, lng: -79.5199 },

  // South America
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Santiago': { lat: -33.4489, lng: -70.6693 },
  'Bogota': { lat: 4.7110, lng: -74.0721 },
  'Lima': { lat: -12.0464, lng: -77.0428 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Medellin': { lat: 6.2442, lng: -75.5812 },
  'Cusco': { lat: -13.5319, lng: -71.9675 },
  'Cartagena': { lat: 10.3910, lng: -75.4794 },
  'Quito': { lat: -0.1807, lng: -78.4678 },
  'La Paz': { lat: -16.4897, lng: -68.1193 },
  'Montevideo': { lat: -34.9011, lng: -56.1645 },
  'Brasilia': { lat: -15.7975, lng: -47.8919 },
  'Salvador': { lat: -12.9714, lng: -38.5014 },
  'Cordoba': { lat: -31.4201, lng: -64.1888 },
  'Mendoza': { lat: -32.8902, lng: -68.8440 },

  // Europe
  'London': { lat: 51.5074, lng: -0.1278 },
  'Dublin': { lat: 53.3498, lng: -6.2603 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Brussels': { lat: 50.8503, lng: 4.3517 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Zurich': { lat: 47.3769, lng: 8.5417 },
  'Stockholm': { lat: 59.3293, lng: 18.0686 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 },
  'Oslo': { lat: 59.9139, lng: 10.7522 },
  'Prague': { lat: 50.0755, lng: 14.4378 },
  'Warsaw': { lat: 52.2297, lng: 21.0122 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  'Moscow': { lat: 55.7558, lng: 37.6173 },
  'Edinburgh': { lat: 55.9533, lng: -3.1883 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Naples': { lat: 40.8518, lng: 14.2681 },
  'Milan': { lat: 45.4642, lng: 9.1900 },
  'Hamburg': { lat: 53.5511, lng: 9.9937 },
  'Geneva': { lat: 46.2044, lng: 6.1432 },
  'Krakow': { lat: 50.0647, lng: 19.9450 },
  'Larnaca': { lat: 34.9248, lng: 33.6233 },
  'Paphos': { lat: 34.7720, lng: 32.4297 },
  'Nicosia': { lat: 35.1856, lng: 33.3823 },
  'Venice': { lat: 45.4408, lng: 12.3155 },
  'Florence': { lat: 43.7696, lng: 11.2558 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
  'Valencia': { lat: 39.4699, lng: -0.3763 },
  'Seville': { lat: 37.3891, lng: -5.9845 },
  'Porto': { lat: 41.1579, lng: -8.6291 },
  'Budapest': { lat: 47.4979, lng: 19.0402 },
  'Helsinki': { lat: 60.1699, lng: 24.9384 },
  'Bucharest': { lat: 44.4268, lng: 26.1025 },
  'Belgrade': { lat: 44.7866, lng: 20.4489 },
  'Sofia': { lat: 42.6977, lng: 23.3219 },
  'Zagreb': { lat: 45.8150, lng: 15.9819 },
  'Dubrovnik': { lat: 42.6507, lng: 18.0944 },
  'Reykjavik': { lat: 64.1265, lng: -21.8174 },
  'Glasgow': { lat: 55.8642, lng: -4.2518 },
  'Stuttgart': { lat: 48.7758, lng: 9.1829 },
  'Cologne': { lat: 50.9375, lng: 6.9603 },
  'Dusseldorf': { lat: 51.2277, lng: 6.7735 },

  // Africa & Middle East
  'Cairo': { lat: 30.0444, lng: 31.2357 },
  'Johannesburg': { lat: -26.2041, lng: 28.0473 },
  'Cape Town': { lat: -33.9249, lng: 18.4241 },
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
  'Durban': { lat: -29.8587, lng: 31.0218 },
  'Nairobi': { lat: -1.2921, lng: 36.8219 },
  'Luanda': { lat: -8.8390, lng: 13.2894 },
  'Lagos': { lat: 6.5244, lng: 3.3792 },
  'Accra': { lat: 5.6037, lng: -0.1870 },
  'Dakar': { lat: 14.7167, lng: -17.4677 },
  'Addis Ababa': { lat: 9.0300, lng: 38.7400 },
  'Tunis': { lat: 36.8065, lng: 10.1815 },
  'Algiers': { lat: 36.7538, lng: 3.0588 },
  'Zanzibar': { lat: -6.1659, lng: 39.2026 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  'Doha': { lat: 25.2854, lng: 51.5310 },
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  'Amman': { lat: 31.9454, lng: 35.9284 },
  'Muscat': { lat: 23.5859, lng: 58.4059 },
  'Beirut': { lat: 33.8938, lng: 35.5018 },
  'Kuwait City': { lat: 29.3759, lng: 47.9774 },
  'Manama': { lat: 26.2285, lng: 50.5860 },
  'Marrakech': { lat: 31.6295, lng: -7.9811 },

  // Asia
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Kuala Lumpur': { lat: 3.1390, lng: 101.6869 },
  'Jakarta': { lat: -6.2088, lng: 106.8456 },
  'Manila': { lat: 14.5995, lng: 120.9842 },
  'Ho Chi Minh City': { lat: 10.8231, lng: 106.6297 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Osaka': { lat: 34.6937, lng: 135.5023 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Busan': { lat: 35.1796, lng: 129.0756 },
  'Sapporo': { lat: 43.0618, lng: 141.3545 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Taipei': { lat: 25.0330, lng: 121.5654 },
  'Chiang Mai': { lat: 18.7883, lng: 98.9853 },
  'Hanoi': { lat: 21.0285, lng: 105.8542 },
  'Chengdu': { lat: 30.5728, lng: 104.0668 },
  'Xi\'an': { lat: 34.3416, lng: 108.9398 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Fukuoka': { lat: 33.5902, lng: 130.4017 },
  'Nagoya': { lat: 35.1815, lng: 136.9066 },
  'Okinawa': { lat: 26.2124, lng: 127.6809 },
  'Jeju': { lat: 33.4996, lng: 126.5312 },
  'Phuket': { lat: 7.8804, lng: 98.3922 },
  'Denpasar': { lat: -8.6705, lng: 115.2126 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Kathmandu': { lat: 27.7172, lng: 85.3240 },
  'Colombo': { lat: 6.9271, lng: 79.8612 },
  'Male': { lat: 4.1755, lng: 73.5093 },
  'Tashkent': { lat: 41.2995, lng: 69.2401 },
  'Almaty': { lat: 43.2220, lng: 76.8512 },
  'Ulaanbaatar': { lat: 47.8864, lng: 106.9057 },

  // Oceania
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Auckland': { lat: -36.8485, lng: 174.7633 },
  'Brisbane': { lat: -27.4705, lng: 153.0260 },
  'Perth': { lat: -31.9505, lng: 115.8605 },
  'Adelaide': { lat: -34.9285, lng: 138.6007 },
  'Christchurch': { lat: -43.5321, lng: 172.6362 },
  'Gold Coast': { lat: -28.0167, lng: 153.4000 },
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
  'EAS': 'San Sebastian',
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

  // Popular Vacation Destinations (Batch 1)
  'SXM': 'Philipsburg',  // St Maarten
  'PUJ': 'Punta Cana',  // Dominican Republic
  'BOB': 'Bora Bora',  // French Polynesia
  'JTR': 'Thira',  // Santorini
  'JMK': 'Mykonos',  // Greece
  'IBZ': 'Ibiza',  // Spain
  'PLS': 'Providenciales',  // Turks and Caicos
  'OGG': 'Kahului',  // Maui
  'KOA': 'Kona',  // Big Island
  'BDA': 'Hamilton',  // Bermuda
  'UVF': 'Vieux Fort',  // St Lucia
  'SEZ': 'Victoria',  // Seychelles
  // Popular Vacation Destinations (Batch 2)
  'AUA': 'Oranjestad',  // Aruba
  'CUR': 'Willemstad',  // Curacao
  'BGI': 'Bridgetown',  // Barbados
  'MBJ': 'Montego Bay',  // Jamaica
  'GCM': 'George Town',  // Grand Cayman
  'STT': 'St. Thomas',  // US Virgin Islands
  'STX': 'Christiansted',  // St Croix
  'GND': 'Point Salines',  // Grenada
  'USM': 'Ko Samui',  // Koh Samui, Thailand
  'LGK': 'Langkawi',  // Malaysia
  'MPH': 'Caticlan',  // Boracay, Philippines
  'MRU': 'Plaisance',  // Mauritius
  'MLA': 'Valletta',  // Malta
  'HER': 'Heraklion',  // Crete
  'RHO': 'Rhodes',  // Greece
  'CFU': 'Corfu',  // Greece
  'PMI': 'Palma',  // Mallorca
  'MAH': 'Mahon',  // Menorca
  'LIH': 'Lihue',  // Kauai
  'TFS': 'Tenerife',  // Canary Islands
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


// Helper to round moment to nearest 5 minutes
const roundToNearest5 = (m: moment.Moment): moment.Moment => {
  const rounded = m.clone();
  const remainder = rounded.minute() % 5;
  if (remainder < 3) {
    rounded.subtract(remainder, 'minutes');
  } else {
    rounded.add(5 - remainder, 'minutes');
  }
  return rounded.startOf('minute');
};

// Helper to round UP to next :20 minute mark (e.g., 2:17 PM → 2:20 PM)
const roundUpTo20 = (m: moment.Moment): moment.Moment => {
  const rounded = m.clone();
  const currentMinute = rounded.minute();
  const remainder = currentMinute % 20;

  if (remainder === 0) {
    // Already at :00, :20, or :40
    return rounded.startOf('minute');
  } else {
    // Round up to next :20 mark
    rounded.add(20 - remainder, 'minutes');
    return rounded.startOf('minute');
  }
};


function formatTimeRange12Hour(start: string, end: string): string {
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
}

/**
 * Robustly finds a city in the city-timezones library.
 * Checks exact match, then case-insensitive match on both Name and ASCII Name.
 * Handles "San Sebastian" matching "San Sebastián".
 */
export function findCityUniversal(city: string): any | null {
  if (!city) return null;
  const cleanCity = city.trim();

  // 1. Direct Lookup (Fast)
  const direct = cityTimezonesLib.lookupViaCity(cleanCity);
  if (direct && direct.length > 0) return direct[0];

  // 2. Robust Search (Case-insensitive & ASCII mapping)
  const lowerCity = cleanCity.toLowerCase();

  // cityTimezonesLib.cityMapping is the raw array of all cities
  const match = cityTimezonesLib.cityMapping.find((c: any) =>
    (c.city_ascii && c.city_ascii.toLowerCase() === lowerCity) ||
    (c.city && c.city.toLowerCase() === lowerCity)
  );

  return match || null;
  return match || null;
}

/**
 * Universal IATA Lookup
 * Uses airport-codes lib to find IATA -> City Name
 */
export function findCityByIATA(iata: string): string | null {
  if (!iata || iata.length !== 3) return null;
  const code = iata.toUpperCase();

  // "airport-codes" maps are Backbone-like but likely just an array in this usage or .findWhere
  // Looking at the lib structure, it exports a collection. 
  // We can treat it as a list if we use .findWhere or similar, or iterate.
  // The simplest usage for 'airport-codes' (based on typical npm package usage)
  // is often `airports.findWhere({ iata: 'EAS' })`.

  // Let's protect against library structure variations:
  let match = null;
  // @ts-ignore
  if (typeof airportCodesLib.findWhere === 'function') {
    // @ts-ignore
    match = airportCodesLib.findWhere({ iata: code });
  }

  if (match) {
    // 'get' is Backbone style
    const city = match.get('city');
    return city || null;
  }
  return null;
}

export function getCityTimezone(city: string): string {
  if (!city) return 'UTC';

  const cleanCity = city.trim();

  // 1. Check Exact Legacy Match
  if (LEGACY_CITY_TIMEZONES[cleanCity]) {
    return LEGACY_CITY_TIMEZONES[cleanCity];
  }

  // 2. Check Case-Insensitive Legacy Match
  const lowerCity = cleanCity.toLowerCase();
  const matchedKey = Object.keys(LEGACY_CITY_TIMEZONES).find(k => k.toLowerCase() === lowerCity);
  if (matchedKey) {
    return LEGACY_CITY_TIMEZONES[matchedKey];
  }

  // 3. Check Airport Maps -> Legacy
  const cityFromCode = airportMappings[cleanCity];
  if (cityFromCode && LEGACY_CITY_TIMEZONES[cityFromCode]) {
    return LEGACY_CITY_TIMEZONES[cityFromCode];
  }

  // 4. Universal Lookup (Library + Robust)
  const universal = findCityUniversal(cleanCity);
  if (universal) {
    return universal.timezone;
  }

  // 5. Try mapped city name in Library (e.g. Code -> City -> Lib)
  if (cityFromCode) {
    const universal2 = findCityUniversal(cityFromCode);
    if (universal2) {
      return universal2.timezone;
    }
  }

  return 'UTC';
}

export function getCityCoordinates(city: string): { lat: number; lng: number } | null {
  if (!city) return null;
  const cleanCity = city.trim();

  // 1. Legacy
  if (LEGACY_CITY_COORDINATES[cleanCity]) return LEGACY_CITY_COORDINATES[cleanCity];

  const lowerCity = cleanCity.toLowerCase();
  const matchedKey = Object.keys(LEGACY_CITY_COORDINATES).find(k => k.toLowerCase() === lowerCity);
  if (matchedKey) return LEGACY_CITY_COORDINATES[matchedKey];

  // Airport
  const cityFromCode = airportMappings[cleanCity];
  if (cityFromCode && LEGACY_CITY_COORDINATES[cityFromCode]) return LEGACY_CITY_COORDINATES[cityFromCode];

  // 2. Library
  const universal = findCityUniversal(cleanCity);
  if (universal) return { lat: universal.lat, lng: universal.lng };

  if (cityFromCode) {
    const universal2 = findCityUniversal(cityFromCode);
    if (universal2) return { lat: universal2.lat, lng: universal2.lng };
  }

  return null;
}

export function calculateTimezoneDiff(from: string, to: string, date: string, fromTzOverride?: string, toTzOverride?: string): number {
  const fromTz = fromTzOverride || getCityTimezone(from);
  const toTz = toTzOverride || getCityTimezone(to);

  if (fromTz === 'UTC' && !LEGACY_CITY_TIMEZONES[from] && !fromTzOverride) {
    // console.warn(`City not found in timezone database: ${from}`);
    // Suppress warning now that we have universal lookup, or change check
    // Actually, getCityTimezone already used the library. If it returned UTC, it really failed.
  }
  if (toTz === 'UTC' && !LEGACY_CITY_TIMEZONES[to] && !toTzOverride) {
    // console.warn(`City not found in timezone database: ${to}`);
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
    : moment(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm');

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
    // If it's short but they want to adjust, give them Partial (60%) or Full (100%)
    // Let's give them Partial for short trips to be safe, unless it's actually long.
    const percentage = stayDuration >= 6 ? 100 : 60;
    const reason = stayDuration >= 6
      ? 'Full adjustment to harmonize with local time.'
      : `You chose to adjust. We'll shift your schedule just enough to keep you energized.`;

    return { percentage, reason };
  }

  // NEW LOGIC: Distinguish between round trips (A→B→A) and layovers (A→B→C)
  // For short trips (< 3 days):
  // - Round trips (A→B→A): Default to "Stay Home" (user can change)
  // - Layovers (A→B→C): Force "Adjust Fully" (no user choice)
  if (stayDuration < JetLagConfig.SHORT_TRIP_DAYS && nextTrip) {
    const isRoundTrip = trip.to === nextTrip.from && trip.from === nextTrip.to;

    if (isRoundTrip) {
      // Round trip: Default to Stay Home (user can override in UI)
      return {
        percentage: 0,
        reason: `Quick round trip (${Math.round(stayDuration)} days). We'll focus on boosting your energy when you need it most.`
      };
    } else {
      // Layover/Connection: Force Adjust Fully (no user choice)
      return {
        percentage: 100,
        reason: `Layover connection. Adjusting to ${trip.to} timezone to prepare for your onward journey.`
      };
    }
  }

  // < 3 days without next trip: Default to Stay Home
  if (stayDuration < JetLagConfig.SHORT_TRIP_DAYS) {
    return {
      percentage: 0,
      reason: `Quick trip (${Math.round(stayDuration)} days). We'll focus on boosting your energy when you need it most.`
    };
  }

  if (hoursDiff < JetLagConfig.MIN_TIMEZONE_DIFF_HOURS) {
    return {
      percentage: 0,
      reason: 'No significant timezone difference.'
    };
  }

  if (hoursDiff < JetLagConfig.SMALL_TIMEZONE_DIFF_HOURS) {
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

/**
 * Generate a complete jet lag plan for a trip
 * 
 * IMPORTANT: When modifying this algorithm, increment ALGORITHM_VERSION 
 * in context/PlanContext.tsx to force plan regeneration for all users.
 * Current version tracking ensures optimal performance by caching plans.
 * 
 * @param trip - The trip to generate a plan for
 * @param allTrips - All trips in the plan (for multi-trip context)
 * @param userSettings - User preferences (bedtime, supplements, etc.)
 * @returns Complete jet lag plan with prepare, travel, and adjust phases
 */
export function generateJetLagPlan(
  trip: Trip,
  allTrips: Trip[],
  userSettings: UserSettings
): TripPlan {
  const currentTripIndex = allTrips.findIndex(t => t.id === trip.id);

  // ============================================
  // CIRCADIAN ORIGIN TRACKING
  // ============================================
  // Determine where the user's body clock is currently set.
  // This is crucial for multi-trip plans where the user may not have fully adjusted
  // between trips (e.g., "Stay Home" strategy or rapid connections).

  let circadianOriginCity = trip.from;
  let circadianOriginTz: string | undefined = trip.fromTz;

  // Determine "effective" origin timezone for calculation
  // default: local timezone of departure city
  let effectiveFromTz = trip.fromTz || getCityTimezone(trip.from);

  // NEW: Check for intra-trip segment conflicts (Missed Connections)
  // If found, we create a conflict card to pause notifications, 
  // BUT we do NOT return early so the user can still see the rest of the plan.
  let conflictCard: Card | null = null;

  if (trip.segments && trip.segments.length > 1) {
    for (let i = 0; i < trip.segments.length - 1; i++) {
      const seg = trip.segments[i];
      const nextSeg = trip.segments[i + 1];

      // Calculate Arrival of Segment i
      const arrival = moment.tz(`${seg.arriveDate} ${seg.arriveTime}`, 'YYYY-MM-DD HH:mm', seg.toTz || getCityTimezone(seg.to));

      // Calculate Departure of Segment i+1
      const nextDepart = moment.tz(`${nextSeg.departDate} ${nextSeg.departTime}`, 'YYYY-MM-DD HH:mm', nextSeg.fromTz || getCityTimezone(nextSeg.from));

      if (arrival.isAfter(nextDepart)) {
        conflictCard = {
          id: `conflict-warning-${trip.id}`,
          title: 'Missed Connection Detected',
          time: 'Plan Paused',
          icon: 'alert-triangle',
          color: '#FEF2F2',
          why: `Flight ${i + 1} (${seg.from} > ${seg.to}) arrives after previous flight lands. Previous flight lands at ${arrival.format('h:mm A')} on ${arrival.format('MM/DD/YYYY')}, but next flight leaves at ${nextDepart.format('h:mm A')} on ${nextDepart.format('MM/DD/YYYY')}.`,
          how: 'Tap to Edit Trip',
          dateTime: arrival.toISOString(), // Use arrival time of first leg
          isInfo: false,
          isDailyRoutine: false
        };
        // We found a conflict, no need to check further segments
        break;
      }
    }
  }

  // Check previous trips to see if we are actually fully adjusted to trip.from
  // This is critical for return trips - if you adjusted to LA on the outbound leg,
  // the return to NY should be treated as a fresh timezone shift, not "returning home"

  if (currentTripIndex > 0) {
    // We need to trace through the trip chain to find where the user's body clock actually is.
    // Start from the beginning and build up the circadian state trip by trip.

    let trackedCircadianCity = allTrips[0].from;
    let trackedCircadianTz = allTrips[0].fromTz;

    for (let i = 0; i < currentTripIndex; i++) {
      const prevTrip = allTrips[i];
      const nextTripForPrev = i < allTrips.length - 1 ? allTrips[i + 1] : undefined;

      // Calculate timezone difference from where the user's body clock currently is
      // to where they're traveling
      const prevDiff = Math.abs(calculateTimezoneDiff(
        trackedCircadianCity,
        prevTrip.to,
        prevTrip.departDate,
        trackedCircadianTz || getCityTimezone(trackedCircadianCity),
        prevTrip.toTz
      ));

      // Determine if they adjusted on this trip
      const prevStrategy = determineAdjustmentStrategy(prevTrip, nextTripForPrev, prevDiff);

      if (prevStrategy.percentage === 0) {
        // "Stay Home" strategy - body clock stayed at the origin
        // circadianCity remains unchanged
        console.log(`[Circadian Tracking] Trip ${i}: ${prevTrip.from} → ${prevTrip.to} - STAY HOME (kept ${trackedCircadianCity} time)`);
      } else {
        // Adjusted to the destination - body clock shifts
        trackedCircadianCity = prevTrip.to;
        trackedCircadianTz = prevTrip.toTz;
        console.log(`[Circadian Tracking] Trip ${i}: ${prevTrip.from} → ${prevTrip.to} - ADJUSTED (now on ${trackedCircadianCity} time)`);
      }
    }

    // Set the circadian origin for the current trip
    circadianOriginCity = trackedCircadianCity;
    circadianOriginTz = trackedCircadianTz;
    effectiveFromTz = circadianOriginTz || getCityTimezone(circadianOriginCity);

    console.log(`[Circadian Tracking] Current trip ${currentTripIndex}: ${trip.from} → ${trip.to}`);
    console.log(`[Circadian Tracking] Body clock is on: ${circadianOriginCity} time`);
  }

  // 1. Analyze Timezone Difference (using effective origin)
  const tzDiff = calculateTimezoneDiff(
    circadianOriginCity,
    trip.to,
    trip.departDate,
    effectiveFromTz,
    trip.toTz
  );
  const direction = getDirection(tzDiff);
  const hoursDiff = Math.abs(tzDiff);

  // 2. Determine Strategy
  const nextTrip = currentTripIndex >= 0 && currentTripIndex < allTrips.length - 1
    ? allTrips[currentTripIndex + 1]
    : undefined;

  const previousTrip = currentTripIndex > 0
    ? allTrips[currentTripIndex - 1]
    : undefined;

  const adjustmentStrategy = determineAdjustmentStrategy(trip, nextTrip, hoursDiff);

  const departMoment = moment(trip.departDate);
  // Calculate prep days: Ideal is (Diff / 3), but capped by Max Constraints
  const idealPrepDays = Math.ceil(hoursDiff / 3);
  const prepDays = Math.min(idealPrepDays, JetLagConfig.MAX_PREP_DAYS);
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

  let adjustEndDateCalculated = moment(adjustStartDate).add(2, 'days').format('YYYY-MM-DD');

  // FIX: If bedtime is after midnight (00:01-04:59), extend adjust end date by 1 day
  // This ensures the sleep card for the last adjust day (which falls on the next calendar day)
  // isn't filtered out by the next trip's prep phase
  // NOTE: Exactly 00:00 (midnight) is NOT considered "after midnight" - it's the day boundary
  const bedtimeParts = userSettings.normalBedtime.split(':');
  const bedtimeHour = parseInt(bedtimeParts[0], 10);
  const bedtimeMinute = parseInt(bedtimeParts[1], 10);
  const isAfterMidnight = bedtimeHour > 0 && bedtimeHour < 5; // 01:00-04:59
  const isJustAfterMidnight = bedtimeHour === 0 && bedtimeMinute > 0; // 00:01-00:59

  if (isAfterMidnight || isJustAfterMidnight) {
    adjustEndDateCalculated = moment(adjustEndDateCalculated).add(1, 'day').format('YYYY-MM-DD');
    console.log(`[BEDTIME FIX] Extended adjust end date by 1 day for late bedtime (${userSettings.normalBedtime}). New end: ${adjustEndDateCalculated}`);
  }

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
      // NEW: Strategy-Aware Overlap Detection
      // We only suppress the Prepare phase if the previous trip was an "Adjust" trip.
      // If the user is "Staying Home" for the intermediate stay, they aren't physically 
      // committing to that timezone's schedule, so the Prepare cards for the next jump 
      // should take priority and NOT be suppressed.
      const prevTzDiff = Math.abs(calculateTimezoneDiff(
        prevTrip.from,
        prevTrip.to,
        prevTrip.departDate,
        prevTrip.fromTz,
        prevTrip.toTz
      ));
      const prevStrategy = determineAdjustmentStrategy(prevTrip, trip, prevTzDiff);

      if (prevStrategy.percentage > 0) {
        hasOverlapWithPrevTrip = true;
      } else {
        console.log(`[STRATEGY-AWARE] Overlap detected with ${prevTrip.to} stay, but skip suppression because prev strategy was 'Stay Home'.`);
      }
    }
  }

  const prepareCards = generatePrepareCards(
    trip,
    direction,
    hoursDiff,
    userSettings,
    prepareStartDate,
    prepDays,
    hasOverlapWithPrevTrip,
    circadianOriginTz // NEW: pass the TZ
  );

  console.log(`📋 Prepare phase for ${trip.from} → ${trip.to}:`);
  console.log(`   - prepDays: ${prepDays}`);
  console.log(`   - prepareStartDate: ${prepareStartDate}`);
  console.log(`   - hasOverlapWithPrevTrip: ${hasOverlapWithPrevTrip}`);
  console.log(`   - prepareCards.length: ${prepareCards.length}`);
  console.log(`   - strategy: ${adjustmentStrategy.percentage === 0 ? 'stay_home' : 'adjust'} (${adjustmentStrategy.percentage}%)`);

  // Calculate minCardTime from previous trip's arrival to separate overlap
  let minCardTime: string | undefined;
  if (previousTrip) {
    const prevLastSegment = previousTrip.segments && previousTrip.segments.length > 0
      ? previousTrip.segments[previousTrip.segments.length - 1]
      : null;

    if (prevLastSegment) {
      minCardTime = moment.tz(
        `${prevLastSegment.arriveDate} ${prevLastSegment.arriveTime}`,
        'YYYY-MM-DD HH:mm',
        prevLastSegment.toTz || getCityTimezone(prevLastSegment.to)
      ).toISOString();
    } else {
      // Fallback if no segments info
      minCardTime = moment.tz(
        `${previousTrip.arriveDate} ${previousTrip.arriveTime}`,
        'YYYY-MM-DD HH:mm',
        previousTrip.toTz || getCityTimezone(previousTrip.to)
      ).toISOString();
    }
  }

  const suppressAdjustPhase = hoursDiff > 0 && nextTrip && calculateStayDuration(trip, nextTrip) < (JetLagConfig.RAPID_CONNECTION_HOURS / 24);

  const travelCards = generateTravelCards(
    trip,
    direction,
    hoursDiff,
    userSettings,
    adjustmentStrategy,
    circadianOriginCity,
    circadianOriginTz,
    effectiveFromTz,
    minCardTime // Pass calculated previous arrival time
  );

  // ============================================
  // LEVER A: RECOVERY SPEED MULTIPLIER
  // ============================================
  let multiplier = 1.0;
  if (direction === 'east' && userSettings.recoveryMultiplierEast !== undefined) {
    multiplier = userSettings.recoveryMultiplierEast;
  } else if (direction === 'west' && userSettings.recoveryMultiplierWest !== undefined) {
    multiplier = userSettings.recoveryMultiplierWest;
  }

  let adjustmentDuration = 3;
  if (adjustmentStrategy.percentage > 0 && hoursDiff >= JetLagConfig.MIN_TIMEZONE_DIFF_HOURS) {
    const tzDiffHours = Math.abs(hoursDiff);
    const baselineDays = Math.max(3, Math.ceil(tzDiffHours / 2));
    const minDays = Math.max(2, Math.ceil(tzDiffHours / 2.5));
    const maxDays = 7;
    const finalDaysRaw = Math.round(baselineDays * multiplier);
    adjustmentDuration = Math.min(Math.max(finalDaysRaw, minDays), maxDays);
    console.log(`[HITL] tzDiff: ${tzDiffHours}, base: ${baselineDays}, mult: ${multiplier}, duration: ${adjustmentDuration}`);
  }

  // NEW: Calculate Truncated Adjust End Date to prevent overlap with Next Trip's Prepare Phase
  let truncatedAdjustEndDate = adjustEndDateCalculated;

  if (nextTrip) {
    const nextDepartMoment = moment(nextTrip.departDate); // Removed TZ parsing for simple date math
    // Next Trip's Prepare Start calculation (replicate logic from next iteration roughly, or use next trip's diff)
    // We need to know when the NEXT trip's prepare phase starts.
    // Re-calculating next trip's prep days briefly:
    const nextTzDiff = Math.abs(calculateTimezoneDiff(
      trip.to, // Next Trip From (approx)
      nextTrip.to,
      nextTrip.departDate,
      trip.toTz,
      nextTrip.toTz
    ));
    const nextIdealPrepDays = Math.ceil(nextTzDiff / 3);
    const nextPrepDays = Math.min(nextIdealPrepDays, JetLagConfig.MAX_PREP_DAYS);
    const nextPrepareStartDate = nextDepartMoment.clone().subtract(nextPrepDays, 'days');

    // If our current adjust end date overlaps with (or is after) the next prepare start date,
    // we must truncate.
    // e.g. Adjust Ends Jan 23. Next Prepare Starts Jan 23. -> Truncate Adjust to Jan 22.
    const currentAdjustEnd = moment(adjustEndDateCalculated);

    if (currentAdjustEnd.isSameOrAfter(nextPrepareStartDate)) {
      truncatedAdjustEndDate = nextPrepareStartDate.clone().subtract(1, 'days').format('YYYY-MM-DD');
      console.log(`[OVERLAP FIX] Truncating Adjust Phase for trip ${trip.to}. Original End: ${adjustEndDateCalculated}, New End: ${truncatedAdjustEndDate}`);
    }
  }

  // Calculate next trip's departure time to filter overlapping adjust cards
  let nextTripDepartTime: string | undefined;
  if (nextTrip) {
    nextTripDepartTime = moment.tz(
      `${nextTrip.departDate} ${nextTrip.departTime}`,
      'YYYY-MM-DD HH:mm',
      nextTrip.fromTz || getCityTimezone(nextTrip.from)
    ).toISOString();
    console.log(`🔍 Next trip departs: ${nextTrip.from} -> ${nextTrip.to} at ${moment(nextTripDepartTime).format('MMM D h:mm A z')}`);
  } else {
    console.log('🔍 No next trip - adjust cards will not be filtered');
  }

  const adjustCards = generateAdjustCards(
    trip,
    direction,
    hoursDiff,
    adjustmentStrategy,
    userSettings,
    nextTrip,
    previousTrip,
    adjustStartDate,
    circadianOriginCity,
    circadianOriginTz,
    minCardTime,
    nextTripDepartTime,
    adjustmentDuration
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
        startDate: prepareStartDate,
        endDate: prepareEndDate,
        cards: prepareCards,
      },
      travel: {
        name: 'Travel',
        dateRange: formatDateRange(trip.departDate, trip.arriveDate),
        startDate: trip.departDate,
        endDate: trip.arriveDate,
        cards: conflictCard ? [conflictCard, ...travelCards] : travelCards,
      },
      adjust: {
        name: 'Adjust',
        dateRange: formatDateRange(
          adjustStartDate,
          truncatedAdjustEndDate
        ),
        startDate: adjustStartDate,
        endDate: truncatedAdjustEndDate,
        cards: adjustCards,
        durationDays: adjustmentDuration,
      },
    },
    strategy: adjustmentStrategy.percentage === 0 ? 'stay_home' : 'adjust',
    suppressPreparePhase: hasOverlapWithPrevTrip,
    suppressAdjustPhase: suppressAdjustPhase,
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
  const maxTotalShift = Math.min(hoursDiff, JetLagConfig.MAX_SHIFT_TOTAL_HOURS);

  // Distribute across available prep days
  const shiftPerDay = maxTotalShift / prepDays;

  return shiftPerDay;
}

/**
 * Checks if the sun is up at a given moment for a specific city.
 * Falls back to true (Natural Sunlight assumed) if city coordinates are missing.
 */
function isSunUp(timeMoment: moment.Moment, city: string): boolean {
  // Try direct lookup, then try to map code to city, then try lookup again
  // Try direct lookup, then try to map code to city, then try lookup again
  const cleanCity = city.trim();
  const coords = getCityCoordinates(cleanCity);

  if (!coords) {
    // Fallback: Default to "daylight" between 7 AM and 7 PM if no coords
    const hour = timeMoment.hour();
    return hour >= 7 && hour < 19;
  }

  try {
    const date = timeMoment.toDate();
    const sunTimes = SunCalc.getTimes(date, coords.lat, coords.lng);

    // Resulting sunTimes are JS Dates (UTC instants)
    const sunrise = moment(sunTimes.sunrise);
    const sunset = moment(sunTimes.sunset);

    return timeMoment.isBetween(sunrise, sunset);
  } catch (e) {
    console.warn('Error calculating sun times:', e);
    const hour = timeMoment.hour();
    return hour >= 7 && hour < 19;
  }
}

function generatePrepareCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  userSettings: UserSettings,
  startDate: string,
  prepDays: number,
  hasOverlapWithPrevTrip: boolean = false,
  circadianOriginTz?: string
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
    // For late night flights, we still show the prep phase to maintain consistency.
    // The user can choose to follow the shift or not.
    // effectivePrepDays = 0; // REMOVED SUPPRESSION
  }

  if (hoursDiff < JetLagConfig.SMALL_TIMEZONE_DIFF_HOURS) {
    // Only show sleep advice if there is some difference (>= 1h)
    if (hoursDiff >= JetLagConfig.MIN_TIMEZONE_DIFF_HOURS) {
      cards.push({
        id: `prep-rest-${trip.id}`,
        title: 'Get Good Rest',
        time: 'Evening',
        icon: '🌙',
        color: '#1C5D74',
        why: `Only ${hoursDiff} hour difference - your body can adjust gradually. Focus on being well-rested.`,
        how: 'Maintain your normal sleep schedule. Pack and prepare without stress.',
        dateTime: moment.tz(`${startDate} 20:00`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from)).toISOString(),
      });
    }

    // FIX #5: Add more cards for short trips
    cards.push({
      id: `prep-hydrate-${trip.id}`,
      title: 'Stay Hydrated',
      time: 'Throughout the day',
      icon: '💧',
      color: '#3b82f6',
      why: 'Travel dehydrates you regardless of timezone change. Start hydrating well now.',
      how: 'Drink extra water today and tomorrow. Aim for 8-10 glasses per day.',
      dateTime: `${startDate}T09:00:00`,
    });

    cards.push({
      id: `prep-activity-${trip.id}`,
      title: 'Light Exercise',
      time: 'Morning or afternoon',
      icon: '🚶',
      color: '#10b981',
      why: 'Light activity is often helpful before travel.',
      how: 'Consider a 30-minute walk or light exercise. Nothing too intense before travel.',
      dateTime: moment.tz(`${startDate} 10:00`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from)).toISOString(),
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
  if (hoursDiff < JetLagConfig.MIN_TIMEZONE_DIFF_HOURS) {
    return cards;
  }

  if (direction === 'east') {
    // Calculate progressive sleep shift
    const shiftPerDay = calculatePrepSleepShift(hoursDiff, effectivePrepDays);

    // Generate cards for each prep day (or at least 1 day if effectivePrepDays is 0)
    const daysToGenerate = Math.max(effectivePrepDays, 1);

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const currentDate = moment(startDate).add(dayOffset, 'days').format('YYYY-MM-DD');
      const dayLabel = ''; // User requested removal of date suffix in titles

      // Determine shift for this specific day (0 if dayOffset is beyond effectivePrepDays... wait, logic check)
      // If effectivePrepDays = 0 (Late Night), shift is 0.
      // If dayOffset < effectivePrepDays, apply shift.
      let cumulativeShift = 0;
      if (effectivePrepDays > 0 && dayOffset < effectivePrepDays) {
        cumulativeShift = shiftPerDay * (dayOffset + 1);
      }

      // === DYNAMIC LIGHT SHIFTING (EAST) ===
      // Shift Mornings EARLIER
      const wakeTimeMoment = moment(userSettings.normalWakeTime, 'HH:mm');
      const shiftedWakeTime = wakeTimeMoment.clone().subtract(cumulativeShift * 60, 'minutes');
      const lightEndMoment = shiftedWakeTime.clone().add(2, 'hours');
      const lightTimeStr = formatTimeRange12Hour(shiftedWakeTime.format('HH:mm'), lightEndMoment.format('HH:mm'));

      // Shift Avoid Light EARLIER (2h before shifted bedtime)
      const normalBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
      const shiftedBedtimeMoment = normalBedtimeMoment.clone().subtract(cumulativeShift * 60, 'minutes');
      const avoidLightMoment = shiftedBedtimeMoment.clone().subtract(2, 'hours');
      const avoidLightTimeStr = `${avoidLightMoment.format('h:mm A')} onwards`;

      // Morning light card for this day
      const wakeTimeFinal = moment.tz(`${currentDate} ${shiftedWakeTime.format('HH:mm')}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));
      const hasNaturalSunPrep = isSunUp(wakeTimeFinal, trip.from);

      cards.push({
        id: `prep-light-day${dayOffset + 1}-${trip.id}`,
        title: hasNaturalSunPrep ? `Get Morning Sunlight${dayLabel}` : `Get Morning Light (Artificial)${dayLabel}`,
        time: lightTimeStr,
        icon: '☀️',
        color: '#fbbf24',
        why: `Traveling ${hoursDiff} hours east to ${trip.to}. Advancing your light exposure helps shift your clock earlier.`,
        how: hasNaturalSunPrep
          ? 'Try to get bright natural sunlight immediately upon waking. A 20-minute walk outside is ideal.'
          : 'The sun isn\'t up yet, but your body needs light to shift. Turn on bright indoor lights or use a lightbox immediately upon waking.',
        dateTime: wakeTimeFinal.toISOString(),
      });

      // Avoid evening light card for this day
      const avoidTimeFinal = moment.tz(`${currentDate} ${avoidLightMoment.format('HH:mm')}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));
      const hasNaturalSunAvoid = isSunUp(avoidTimeFinal, trip.from);

      cards.push({
        id: `prep-avoid-evening-light-day${dayOffset + 1}-${trip.id}`,
        title: `Avoid Bright Light${dayLabel}`,
        time: avoidLightTimeStr,
        icon: '🌙',
        color: '#64748b',
        why: 'Evening light delays your clock. Avoiding it early helps you fall asleep at your earlier bedtime.',
        how: hasNaturalSunAvoid
          ? 'Wear sunglasses if outdoors, or stay in a dimly lit room. Natural sunset is approaching, but extra shade helps.'
          : 'Consider dimming lights in your home. Use warm/amber lighting if available.',
        dateTime: avoidTimeFinal.toISOString(),
      });

      // Sleep card for this day (only if effectivePrepDays > 0)
      if (effectivePrepDays > 0 && dayOffset < effectivePrepDays) {
        const shiftedBedtime = shiftedBedtimeMoment.format('HH:mm');
        const normalBedtime = normalBedtimeMoment.format('HH:mm');

        // Check if shifted bedtime conflicts with flight (e.g. 12:30 AM departure vs 10:00 PM sleep)
        const shiftedBedtimeFull = safelyGetBedtimeMoment(
          currentDate,
          shiftedBedtime,
          trip.fromTz || getCityTimezone(trip.from)
        );
        const flightDepart = moment.tz(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));

        // If sleep time is within 6 hours BEFORE flight, advising sleep is impossible/unhelpful.
        const hoursToFlight = flightDepart.diff(shiftedBedtimeFull, 'hours', true);
        const CONFLICT_BUFFER = 6;

        // Format shift amount for display
        const shiftHours = Math.floor(cumulativeShift);
        const shiftMinutes = Math.round((cumulativeShift - shiftHours) * 60);
        const shiftText = shiftHours > 0
          ? (shiftMinutes > 0 ? `${shiftHours}h ${shiftMinutes}m` : `${shiftHours} hour${shiftHours > 1 ? 's' : ''}`)
          : `${shiftMinutes} minutes`;

        const progressText = effectivePrepDays > 1 && dayOffset < effectivePrepDays - 1
          ? ` Tomorrow you'll shift another ${Math.round(shiftPerDay * 60)} minutes.`
          : '';

        if (hoursToFlight < CONFLICT_BUFFER && hoursToFlight > -24) {
          // Determine if the first flight is a sleepable overnight leg, or just a short connector.
          // If it's short/daytime, guide the user to rest on the longer overnight segment instead.
          const tripFirstSeg = trip.segments && trip.segments.length > 0 ? trip.segments[0] : null;
          const firstSegFromTz = tripFirstSeg ? (tripFirstSeg.fromTz || getCityTimezone(tripFirstSeg.from)) : (trip.fromTz || getCityTimezone(trip.from));
          const firstSegToTz = tripFirstSeg ? (tripFirstSeg.toTz || getCityTimezone(tripFirstSeg.to)) : (trip.toTz || getCityTimezone(trip.to));
          const firstSegDepartDate = tripFirstSeg ? tripFirstSeg.departDate : trip.departDate;
          const firstSegDepartTime = tripFirstSeg ? tripFirstSeg.departTime : trip.departTime;
          const firstSegArriveDate = tripFirstSeg ? tripFirstSeg.arriveDate : trip.arriveDate;
          const firstSegArriveTime = tripFirstSeg ? tripFirstSeg.arriveTime : trip.arriveTime;

          const firstSegDepartMoment = moment.tz(
            `${firstSegDepartDate} ${firstSegDepartTime}`,
            'YYYY-MM-DD HH:mm',
            firstSegFromTz
          );
          const firstSegArriveMoment = moment.tz(
            `${firstSegArriveDate} ${firstSegArriveTime}`,
            'YYYY-MM-DD HH:mm',
            firstSegToTz
          );
          const firstSegDurationHours = firstSegArriveMoment.diff(firstSegDepartMoment, 'hours', true);
          const firstSegDepartHour = firstSegDepartMoment.hour();
          const firstFlightIsOvernightSleepable =
            firstSegDurationHours >= 5 ||
            (firstSegDepartHour >= 21 || firstSegDepartHour < 5);
          const hasMultipleSegments = trip.segments ? trip.segments.length > 1 : false;

          const stayAwakeHowEast = firstFlightIsOvernightSleepable
            ? 'Resist the urge to nap at the gate. Sleep as soon as possible after takeoff.'
            : hasMultipleSegments
              ? `Your first flight is short — stay awake through it. Rest during your layover or on the longer leg later.`
              : 'Resist the urge to nap at the gate. Stay alert until you board.';

          cards.push({
            id: `prep-sleep-day${dayOffset + 1}-${trip.id}`,
            title: `Stay Awake Until Flight`,
            time: `Until Departure (${formatTime12Hour(trip.departTime)})`,
            icon: 'eye',
            color: '#FFF7C5',
            why: `Your target sleep time (${formatTime12Hour(shiftedBedtime)}) is close to your flight. Stay awake until you board.`,
            how: stayAwakeHowEast,
            dateTime: shiftedBedtimeFull.toISOString(),
          });
        } else {
          cards.push({
            id: `prep-sleep-day${dayOffset + 1}-${trip.id}`,
            title: `Sleep Earlier${dayLabel}`,
            time: formatTime12Hour(shiftedBedtime),
            icon: '🌙',
            color: '#1C5D74',
            why: `Start shifting your sleep ${shiftText} earlier than your normal ${formatTime12Hour(userSettings.normalBedtime)} bedtime.${progressText}`,
            how: `Try to go to bed around ${formatTime12Hour(shiftedBedtime)}. Keep room dark and cool.`,
            dateTime: shiftedBedtimeFull.toISOString(),
          });
        }
      }
    }

  } else {
    // WESTWARD LOGIC
    const shiftPerDay = calculatePrepSleepShift(hoursDiff, effectivePrepDays);
    const daysToGenerate = Math.max(effectivePrepDays, 1);

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const currentDate = moment(startDate).add(dayOffset, 'days').format('YYYY-MM-DD');
      const dayLabel = ''; // User requested removal of date suffix in titles

      // Calculate cumulative shift
      let cumulativeShift = 0;
      if (effectivePrepDays > 0 && dayOffset < effectivePrepDays) {
        cumulativeShift = shiftPerDay * (dayOffset + 1);
      }

      // === DYNAMIC LIGHT SHIFTING (WEST) ===
      // Shift Evening Light LATER
      // Base: 6 PM - 8 PM
      const baseLightStart = moment('18:00', 'HH:mm');
      const shiftedLightStart = baseLightStart.clone().add(cumulativeShift * 60, 'minutes');
      const shiftedLightEnd = shiftedLightStart.clone().add(2, 'hours'); // Keep 2 hr window
      const lightTimeStr = formatTimeRange12Hour(shiftedLightStart.format('HH:mm'), shiftedLightEnd.format('HH:mm'));

      // Evening light card for this day
      const lightStartFinal = moment.tz(`${currentDate} ${shiftedLightStart.format('HH:mm')}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));
      const hasNaturalSunWest = isSunUp(lightStartFinal, trip.from);

      cards.push({
        id: `prep-light-day${dayOffset + 1}-${trip.id}`,
        title: hasNaturalSunWest ? `Get Evening Sunlight${dayLabel}` : `Get Evening Light (Artificial)${dayLabel}`,
        time: lightTimeStr,
        icon: '🌅',
        color: '#f97316',
        why: `Traveling ${hoursDiff} hours west to ${trip.to}. Delaying your light exposure helps shift your clock later.`,
        how: hasNaturalSunWest
          ? 'Enjoy the evening sun. Go outside for a walk or stay in a sunlit room.'
          : 'The sun is setting or already down, but your body needs light to delay its clock. Use bright indoor lighting in the evening.',
        dateTime: lightStartFinal.toISOString(),
      });

      // Sleep card for this day (only if effectivePrepDays > 0)
      if (effectivePrepDays > 0 && dayOffset < effectivePrepDays) {
        // Calculate shifted bedtime for this specific day
        const normalBedtimeMoment = moment(userSettings.normalBedtime, 'HH:mm');
        const shiftedBedtime = normalBedtimeMoment.clone().add(cumulativeShift * 60, 'minutes').format('HH:mm');

        // Check for midnight crossing (Westward shifts later)
        // FIX: Removed manual dateOffset logic. safelyGetBedtimeMoment matches < 5 AM and adds a day automatically.
        // If we add a day here, we double-shift (Jan 30 -> Jan 31 -> Feb 1), causng the card to appear on Jan 31 instead of Jan 30.
        const sortableDate = currentDate;

        // Format shift amount for display
        const shiftHours = Math.floor(cumulativeShift);
        const shiftMinutes = Math.round((cumulativeShift - shiftHours) * 60);
        const shiftText = shiftHours > 0
          ? (shiftMinutes > 0 ? `${shiftHours}h ${shiftMinutes}m` : `${shiftHours} hour${shiftHours > 1 ? 's' : ''}`)
          : `${shiftMinutes} minutes`;

        const progressText = effectivePrepDays > 1 && dayOffset < effectivePrepDays - 1
          ? ` Tomorrow you'll shift another ${Math.round(shiftPerDay * 60)} minutes.`
          : '';

        // Check if shifted bedtime conflicts with flight (e.g. 12:30 AM departure vs 12:00 AM sleep)
        const shiftedBedtimeFull = safelyGetBedtimeMoment(
          sortableDate,
          shiftedBedtime,
          trip.fromTz || getCityTimezone(trip.from)
        );
        const flightDepart = moment.tz(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));

        // If sleep time is within 6 hours BEFORE flight, advising sleep is impossible.
        // Change to "Stay Awake" guidance.
        const hoursToFlight = flightDepart.diff(shiftedBedtimeFull, 'hours', true);
        const CONFLICT_BUFFER = 6;

        if (hoursToFlight < CONFLICT_BUFFER && hoursToFlight > -24) {
          // Determine if the first flight is a sleepable overnight leg, or just a short connector.
          const tripFirstSegW = trip.segments && trip.segments.length > 0 ? trip.segments[0] : null;
          const firstSegFromTzW = tripFirstSegW ? (tripFirstSegW.fromTz || getCityTimezone(tripFirstSegW.from)) : (trip.fromTz || getCityTimezone(trip.from));
          const firstSegToTzW = tripFirstSegW ? (tripFirstSegW.toTz || getCityTimezone(tripFirstSegW.to)) : (trip.toTz || getCityTimezone(trip.to));
          const firstSegDepartDateW = tripFirstSegW ? tripFirstSegW.departDate : trip.departDate;
          const firstSegDepartTimeW = tripFirstSegW ? tripFirstSegW.departTime : trip.departTime;
          const firstSegArriveDateW = tripFirstSegW ? tripFirstSegW.arriveDate : trip.arriveDate;
          const firstSegArriveTimeW = tripFirstSegW ? tripFirstSegW.arriveTime : trip.arriveTime;

          const firstSegDepartMomentW = moment.tz(
            `${firstSegDepartDateW} ${firstSegDepartTimeW}`,
            'YYYY-MM-DD HH:mm',
            firstSegFromTzW
          );
          const firstSegArriveMomentW = moment.tz(
            `${firstSegArriveDateW} ${firstSegArriveTimeW}`,
            'YYYY-MM-DD HH:mm',
            firstSegToTzW
          );
          const firstSegDurationHoursW = firstSegArriveMomentW.diff(firstSegDepartMomentW, 'hours', true);
          const firstSegDepartHourW = firstSegDepartMomentW.hour();
          const firstFlightIsOvernightSleepableW =
            firstSegDurationHoursW >= 5 ||
            (firstSegDepartHourW >= 21 || firstSegDepartHourW < 5);
          const hasMultipleSegmentsW = trip.segments ? trip.segments.length > 1 : false;

          const stayAwakeHowWest = firstFlightIsOvernightSleepableW
            ? 'Resist the urge to nap at the gate. Sleep as soon as possible after takeoff.'
            : hasMultipleSegmentsW
              ? `Your first flight is short — stay awake through it. Rest during your layover or on the longer leg later.`
              : 'Resist the urge to nap at the gate. Stay alert until you board.';

          cards.push({
            id: `prep-sleep-day${dayOffset + 1}-${trip.id}`,
            title: `Stay Awake Until Flight`,
            time: `Until Departure (${formatTime12Hour(trip.departTime)})`,
            icon: 'eye',
            color: '#FFF7C5',
            why: `Your target sleep time (${formatTime12Hour(shiftedBedtime)}) is close to your flight. Stay awake until you board.`,
            how: stayAwakeHowWest,
            dateTime: shiftedBedtimeFull.toISOString(),
          });
        } else {
          cards.push({
            id: `prep-sleep-day${dayOffset + 1}-${trip.id}`,
            title: `Sleep Later${dayLabel}`,
            time: formatTime12Hour(shiftedBedtime),
            icon: '🌙',
            color: '#1C5D74',
            why: `Start shifting your sleep ${shiftText} later than your normal ${formatTime12Hour(userSettings.normalBedtime)} bedtime.${progressText}`,
            how: 'Try to stay up later than usual. Keep lights bright in the evening.',
            dateTime: shiftedBedtimeFull.toISOString(),
          });
        }
      }
    }
  }

  // FIX #6: Add Pre-Flight Caffeine Cutoff for Late/Early Flights
  // If the flight departs late tonight (e.g. 11 PM) or very early tomorrow (e.g. 1 AM),
  // advise caffeine cutoff on the main prepare day (today).
  // departHour is already parsed above at line 847
  const isLateDep = departHour >= 21 || departHour < 5;
  const lastPrepDate = moment(startDate).add(Math.max(prepDays, 1) - 1, 'days').format('YYYY-MM-DD');

  if (isLateDep) {
    // Determine the user's bedtime on the last prep day
    const userBedtimeMoment = moment.tz(`${lastPrepDate} ${userSettings.normalBedtime}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));

    // Determine the flight departure relative to the last prep day
    // If flight is 00:30 on Jan 25, and lastPrepDate is Jan 24.
    // The departure is Jan 25 00:30.
    const flightDepartMoment = moment.tz(`${trip.departDate} ${trip.departTime}`, 'YYYY-MM-DD HH:mm', trip.fromTz || getCityTimezone(trip.from));

    // Logic: Cutoff 6h before bed OR 4h before flight.
    const caffeineCutoffFromBedtime = userBedtimeMoment.clone().subtract(6, 'hours');
    const caffeineCutoffFromFlight = flightDepartMoment.clone().subtract(4, 'hours');
    const caffeineStopTime = moment.min(caffeineCutoffFromBedtime, caffeineCutoffFromFlight);

    // Only show if the calculated cutoff falls on a relevant date AND is reasonably close to flight
    // Date check: Cutoff should be on flight day OR the day before (for early AM flights)
    // Time check: Cutoff should be within 18 hours of flight (tighter than previous 28h)
    const cutoffDate = caffeineStopTime.format('YYYY-MM-DD');
    const flightDate = flightDepartMoment.format('YYYY-MM-DD');
    const dayBeforeFlight = flightDepartMoment.clone().subtract(1, 'day').format('YYYY-MM-DD');

    const isRelevantDate = cutoffDate === flightDate || cutoffDate === dayBeforeFlight;
    const hoursBeforeFlight = flightDepartMoment.diff(caffeineStopTime, 'hours', true);
    const isReasonablyClose = hoursBeforeFlight >= 0 && hoursBeforeFlight <= 18;

    if (hoursDiff >= JetLagConfig.SMALL_TIMEZONE_DIFF_HOURS && isRelevantDate && isReasonablyClose) {
      cards.push({
        id: `prep-caffeine-cutoff-${trip.id}`,
        title: `Pre-Flight Caffeine Cutoff - ${moment(lastPrepDate).format('MMM D')}`,
        time: `Stop by ${caffeineStopTime.format('h:mm A')}`,
        icon: '🚫',
        color: '#F3F0ED',
        why: `You have a late flight. Stopping caffeine early helps you sleep on the plane.`,
        how: `Switch to water or herbal tea after ${caffeineStopTime.format('h:mm A')}.`,
        dateTime: caffeineStopTime.toISOString(),
      });
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
  circadianOriginCity: string,
  circadianOriginTz: string | undefined,
  effectiveFromTz: string,
  minCardTime?: string // NEW: Optional cutoff time (e.g. previous trip arrival)
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
    trip.fromTz || getCityTimezone(firstSegment.from)
  );

  const journeyEnd = moment.tz(
    `${lastSegment.arriveDate} ${lastSegment.arriveTime}`,
    'YYYY-MM-DD HH:mm',
    trip.toTz || getCityTimezone(lastSegment.to)
  );

  const totalHours = journeyEnd.diff(journeyStart, 'hours', true);

  // Determine destination sleep window (10 PM - 6 AM destination time)
  const destTz = trip.toTz || getCityTimezone(trip.to);

  // === FIRST: Add the "Your Flight" overview card ===
  const routeString = segments.length > 1
    ? `${trip.from} > ${segments.map(s => s.to).join(' > ')}`
    : `${trip.from} > ${trip.to}`;

  cards.push({
    id: `travel-flight-overview-${trip.id}`,
    title: 'Your Flight',
    time: routeString,
    icon: '✈️',
    color: '#DBEAFE',
    why: `Departs ${formatTime12Hour(firstSegment.departTime)}`,
    how: `Total journey: ~${Math.round(totalHours)} hours with ${segments.length} flight segment${segments.length > 1 ? 's' : ''}`,
    isInfo: true,
    // Use an early fixed year to ensure this block is ALWAYS at the very top of the Travel phase
    dateTime: '2020-01-01T00:00:00Z',
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
      segment.fromTz || getCityTimezone(segment.from)
    );

    const arriveMoment = moment.tz(
      `${segment.arriveDate} ${segment.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      segment.toTz || getCityTimezone(segment.to)
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

    // 5. BODY CLOCK LOGIC (New)
    // Calculate what time it is for the user's BIOLOGY at the end of the flight.
    // We expect body clock to be at Origin Time + Duration.
    const originTz = circadianOriginTz || getCityTimezone(trip.from);
    const arriveBodyMoment = arriveMoment.clone().tz(originTz);
    const bodyHour = arriveBodyMoment.hour();

    // If it's biological night (10 PM - 6 AM) when you arrive (meaning the flight covered 
    // the night or landed deep in the night), then Sleep is valuable.
    const isBodyNight = bodyHour >= 22 || bodyHour < 6;

    const isOvernightFlight =
      (isRedEyeDeparture && durationHours >= 3) ||
      (arrivesEarlyMorning && durationHours >= 5) ||
      (arrivesDeepNight && durationHours >= 6) ||
      (isOriginNightDeparture && durationHours >= 8) ||
      (isBodyNight && durationHours >= 4); // Added Body Night rule

    const isDaytimeFlight = !isOvernightFlight;

    // Should sleep if classified as overnight flight
    // CLAUDE FIX: Base sleep advice primarily on BODY time for the "Sleep" decision
    // If it's night for your body, you CAN sleep.
    // If it's day for your body, you SHOULD NOT sleep (or just nap).
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
        id: `header-${dateYYYYMMDD}-${trip.id}`,
        title: headerText,
        time: '',
        icon: '',
        color: '#1E3A5F',
        why: '',
        how: '',
        isInfo: true,
        dateTime: moment.tz(`${dateYYYYMMDD} 00:00:01`, 'YYYY-MM-DD HH:mm:ss', firstSegToday.segment.fromTz || getCityTimezone(firstSegToday.segment.from)).toISOString(),
      });

      // FIX: Add Morning Light & Hydration for Departure Day
      // Only added if the flight time allows for it (e.g. not 6 AM departure)
      if (isFirstDay) {
        const departHour = firstSegToday.departMoment.hour();

        // Hydrate: Only if flight is in afternoon/evening (>= 12 PM)
        // If flight is morning, "Stay Hydrated" covers the flight itself.
        if (departHour >= 12) {
          cards.push({
            id: `travel-hydrate-${dateYYYYMMDD}-${trip.id}`,
            title: 'Start Hydrating',
            time: departHour >= 16 ? 'Morning & Afternoon' : 'Before your flight',
            icon: '💧',
            color: '#DBEAFE', // Matches CARD_THEMES.Hydrated background
            why: 'The air in planes is very dry. Boosting hydration now reduces jet lag later.',
            how: 'Drink a glass of water every hour or so leading up to your flight.',
            dateTime: moment.tz(`${dateYYYYMMDD} 09:00`, 'YYYY-MM-DD HH:mm', firstSegToday.segment.fromTz || getCityTimezone(firstSegToday.segment.from)).toISOString(),
          });
        }

        // Dynamic Waking Light: Ensure flight departs at least 3 hours after wake time
        const wakeTimeMoment = moment.tz(`${dateYYYYMMDD} ${userSettings.normalWakeTime}`, 'YYYY-MM-DD HH:mm', firstSegToday.segment.fromTz || getCityTimezone(firstSegToday.segment.from));
        const lightEndMoment = wakeTimeMoment.clone().add(2, 'hours');

        if (firstSegToday.departMoment.diff(wakeTimeMoment, 'hours', true) >= 3) {
          const hasNaturalSunTravel = isSunUp(wakeTimeMoment, firstSegToday.segment.from);
          const isLateWake = wakeTimeMoment.hour() >= 11;
          const cardTitle = isLateWake
            ? 'Get Waking Light'
            : (hasNaturalSunTravel ? 'Get Morning Sunlight' : 'Get Morning Light (Artificial)');

          cards.push({
            id: `travel-morning-light-${dateYYYYMMDD}-${trip.id}`,
            title: cardTitle,
            time: `${wakeTimeMoment.format('h:mm A')} - ${lightEndMoment.format('h:mm A')}`,
            icon: '☀️',
            color: '#FFF7C5', // Matches CARD_THEMES.Sunlight background
            why: 'Get bright light immediately upon waking to anchor your circadian rhythm before travel.',
            how: hasNaturalSunTravel
              ? 'Get bright natural sunlight immediately after waking. A 20-minute walk outside is ideal.'
              : (isLateWake ? 'Turn on bright indoor lights immediately after waking.' : 'The sun isn\'t up yet, but your body needs light to anchor your rhythm. Turn on bright indoor lights immediately after waking.'),
            dateTime: wakeTimeMoment.toISOString(),
          });
        }
      }

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
          // Use the overnight flight's OWN departure city timezone, not the trip origin.
          // e.g. for Jaipur→Delhi→Tokyo, the Delhi→Tokyo overnight leg should show Delhi time.
          const overnightFromCity = overnightFlight.segment.from;
          const overnightFromTz = overnightFlight.segment.fromTz || getCityTimezone(overnightFromCity);

          // Calculate caffeine cutoff: 6 hours before user's normal bedtime OR 4 hours before flight, whichever is earlier
          const userBedtimeMoment = moment.tz(`${dateYYYYMMDD} ${userSettings.normalBedtime}`, 'YYYY-MM-DD HH:mm', overnightFromTz);
          const caffeineCutoffFromBedtime = userBedtimeMoment.clone().subtract(6, 'hours');
          const caffeineCutoffFromFlight = overnightFlight.departMoment.clone().subtract(4, 'hours');

          // Use the earlier of the two times
          const caffeineStopTime = moment.min(caffeineCutoffFromBedtime, caffeineCutoffFromFlight);

          // FIX: If caffeine cutoff is actually on the PREVIOUS day (e.g. 12:30 AM flight -> 8:30 PM prev day),
          // do NOT show it on the current day's list, as it confuses the user.
          // (The user should have seen this in the 'Prepare' phase).
          if (caffeineStopTime.isSameOrAfter(moment(dateYYYYMMDD))) {
            // Format the time in the overnight flight's departure city timezone for display
            const displayTime = caffeineStopTime.tz(overnightFromTz).format('h:mm A');
            cards.push({
              id: `caffeine-cutoff-${dateYYYYMMDD}-${trip.id}`,
              title: 'Caffeine Cutoff',
              time: `Stop by ${displayTime} ${overnightFromCity} time`,
              icon: '🚫',
              color: '#F3F0ED',
              why: `You have an overnight flight at ${overnightFlight.departMoment.tz(overnightFromTz).format('h:mm A')}. Stopping caffeine early is often recommended for better sleep.`,
              how: `Consider switching to water or herbal tea. This may help you rest on your overnight flight.`,
              dateTime: caffeineStopTime.toISOString(),
            });
          }
        }
      } else if (hasOvernightFlightTomorrow) {

        const firstFlightToday = segmentsDepartingToday[0];

        cards.push({
          id: `caffeine-limit-${dateYYYYMMDD}-${trip.id}`,
          title: 'Limit Caffeine Today',
          time: 'Only before 2 PM',
          icon: '☕',
          color: '#B46B49',
          why: `You have an overnight flight tomorrow. Many travelers limit caffeine intake early today.`,
          how: `Coffee or tea is fine until 2 PM. After that, consider switching to water or herbal tea.`,
          dateTime: moment.tz(`${dateYYYYMMDD} 08:00`, 'YYYY-MM-DD HH:mm', firstFlightToday.segment.fromTz || getCityTimezone(firstFlightToday.segment.from)).toISOString(),
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
            id: `caffeine-limit-late-arrival-${dateYYYYMMDD}-${trip.id}`,
            title: 'Limit Caffeine Today',
            time: 'Stop ~6 hours before bed',
            icon: '☕',
            color: '#B46B49',
            why: `You arrive late (${lateArrivalFlight.arriveMoment.format('h:mm A')}). Avoiding caffeine late in the day will help you sleep upon arrival.`,
            how: `Switch to water or herbal tea during your flight.`,
            dateTime: moment.tz(`${dateYYYYMMDD} 14:00`, 'YYYY-MM-DD HH:mm', firstFlightToday.segment.fromTz || getCityTimezone(firstFlightToday.segment.from)).toISOString(),
          });
        } else {
          cards.push({
            id: `caffeine-ok-${dateYYYYMMDD}-${trip.id}`,
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

      // === FILTERING STEP ===
      // If minCardTime is provided (e.g. from previous trip arrival), remove any routine cards 
      // that start significantly before this time.
      if (minCardTime) {
        const cutoffMoment = moment(minCardTime);
        // Filter out cards that:
        // 1. have a scheduled time BEFORE the cutoff (with small buffer)
        // 2. AND are "routine" type cards (Light, Hydration, Caffeine) -- NOT flight cards
        const filteredCards = cards.filter(card => {
          // Always keep flight headers and flight cards
          if (card.id.startsWith('header-') || card.title.includes('Flight')) return true;

          if (!card.dateTime) return true;

          const cardTime = moment(card.dateTime);

          // If card is effectively after cutoff, keep it
          if (cardTime.isAfter(cutoffMoment.clone().subtract(30, 'minutes'))) return true;

          // If card is earlier than cutoff, check if it's a routine card to look suppress
          const isRoutine =
            card.title.includes('Light') ||
            card.title.includes('Hydrat') ||
            card.title.includes('Caffeine');

          if (isRoutine) {
            return false;
          }

          return true;
        });

        // Replace the main cards array with filtered content
        cards.length = 0;
        cards.push(...filteredCards);
      }

      // === Add flight segment cards for each flight departing today ===
      segmentsDepartingToday.forEach((analysis) => {
        const segment = analysis.segment;

        cards.push({
          id: `flight-segment-${segment.from}-${segment.to}-${segment.departTime}-${trip.id}`,
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
          const originTz = circadianOriginTz || getCityTimezone(circadianOriginCity);

          // 2. Convert Flight Times to Origin Time
          const departOrigin = moment.tz(segment.departDate + ' ' + segment.departTime, segment.fromTz || getCityTimezone(segment.from)).tz(originTz);
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
              id: `sleep-${segment.from}-${segment.to}-stayhome-${trip.id}`,
              title: `Sleep ${sleepStartStr} - ${sleepEndStr}`,
              time: `${sleepStartStr} - ${sleepEndStr} (${originCity} Time)`,
              icon: '😴',
              color: '#1C5D74',
              why: `This matches your normal sleep schedule in ${originCity} (${originBedTimeFmt} - ${originWakeTimeFmt}).`,
              how: `Use eye mask and earplugs. Set an alarm for ${sleepEndStr}.`,
              dateTime: (proposedSleepStart as moment.Moment).toISOString(),
              endDateTime: finalSleepEnd.toISOString(),
            });

            // If there's a significant awake period BEFORE sleep
            const awakeDurationBefore = (proposedSleepStart as moment.Moment).diff(departOrigin, 'minutes');
            if (awakeDurationBefore > 45) {
              cards.push({
                id: `awake-pre-${segment.from}-${segment.to}-stayhome-${trip.id}`,
                title: `Stay Awake`,
                time: `Until ${sleepStartStr} (${originCity} Time)`,
                icon: '👁️',
                color: '#FFF7C5',
                why: `It's still daytime in ${originCity}. Hold off on sleeping until ${sleepStartStr} to stay aligned with your home schedule.`,
                how: `Watch something, read, or move around the cabin. Your sleep window starts at ${sleepStartStr}.`,
                dateTime: departOrigin.toISOString(),
              });
            }

            // If there's a significant awake period AFTER sleep
            const awakeDurationAfter = arriveOrigin.diff((proposedSleepEnd as moment.Moment), 'minutes');
            if (awakeDurationAfter > 45) {
              cards.push({
                id: `awake-post-${segment.from}-${segment.to}-stayhome-${trip.id}`,
                title: `Time to Wake Up`,
                time: `From ${sleepEndStr} (${originCity} Time)`,
                icon: '⏰',
                color: '#FEF3C7',
                why: `It's morning in ${originCity} (${sleepEndStr}). Waking now keeps you on your home schedule.`,
                how: `Set an alarm for ${sleepEndStr}. Splash water on your face and stay active for the rest of the flight.`,
                dateTime: (proposedSleepEnd as moment.Moment).toISOString(),
              });
            }

          } else {
            // No sleep overlap - Tiered Stay Awake logic
            const duration = analysis.durationHours;

            if (duration < JetLagConfig.FLIGHT_TIERS.TIER_1_MH) {
              cards.push({
                id: `awake-${segment.from}-${segment.to}-stayhome-${trip.id}`,
                title: `Stay Awake`,
                time: `Throughout flight`,
                icon: '👁️',
                color: '#FFF7C5',
                why: `It's daytime back home in ${originCity}. Staying awake helps you keep your natural rhythm.`,
                how: `Watch movies, work, or read. Staying engaged will help you feel more energized when you arrive.`,
                dateTime: analysis.departMoment.clone().toISOString(),
              });
            } else if (duration < JetLagConfig.FLIGHT_TIERS.TIER_2_MH) {
              cards.push({
                id: `limit-sleep-${segment.from}-${segment.to}-stayhome-${trip.id}`,
                title: `Limit Sleep on Flight`,
                time: `Throughout flight`,
                icon: '⏰',
                color: '#FEF3C7',
                why: `It's daytime back home in ${originCity}. Limiting sleep helps you keep your natural rhythm.`,
                how: `If you must sleep, limit to 1-2 short naps (20-30 minutes each). Set an alarm to avoid deep sleep.`,
                dateTime: analysis.departMoment.clone().toISOString(),
              });
            } else {
              cards.push({
                id: `strategic-naps-${segment.from}-${segment.to}-stayhome-${trip.id}`,
                title: `Take Strategic Naps`,
                time: `Throughout flight`,
                icon: '💤',
                color: '#DBEAFE',
                why: `It's daytime back home in ${originCity}, but staying awake for ${Math.round(duration)} hours is difficult.`,
                how: `Take short naps (20-30 minutes) as needed, but avoid sleeping more than 2-3 hours total. set alarms!`,
                dateTime: analysis.departMoment.clone().toISOString(),
              });
            }
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
            id: `sleep-${segment.from}-${segment.to}-${trip.id}`,
            title: `Sleep on ${segment.from} > ${segment.to} Flight`,
            time: `Target: ${sleepStart.format('h:mm A z')} - ${sleepEnd.format('h:mm A z')}`,
            icon: '😴',
            color: '#1C5D74',
            why: whyText,
            how: howText,
            dateTime: sleepStart.clone().subtract(15, 'minutes').toISOString(),
            endDateTime: sleepEnd.toISOString(),
          });


        } else if (analysis.isDaytimeFlight && analysis.durationHours >= 0) {
          // Tiered guidance based on flight duration
          const duration = analysis.durationHours;

          if (duration < JetLagConfig.FLIGHT_TIERS.TIER_1_MH) {
            // Short flight - realistic to stay awake
            cards.push({
              id: `awake-${segment.from}-${segment.to}-${trip.id}`,
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
          } else if (duration < JetLagConfig.FLIGHT_TIERS.TIER_2_MH) {
            // Medium flight - allow limited napping
            cards.push({
              id: `limit-sleep-${segment.from}-${segment.to}-${trip.id}`,
              title: `Limit Sleep on ${segment.from} > ${segment.to} Flight`,
              time: `${analysis.departMoment.format('h:mm A z')} - ${analysis.arriveMoment.format('h:mm A z')}`,
              icon: '⏰',
              color: '#FEF3C7',
              why: adjustmentStrategy.percentage === 0
                ? `It's daytime in ${circadianOriginCity}. Limiting sleep helps you stay aligned with ${circadianOriginCity} timezone.`
                : `This flight is during daytime at your destination. Limiting sleep helps you stay aligned with ${trip.to} timezone.`,
              how: `If you must sleep, limit to 1-2 short naps (20-30 minutes each). Set an alarm to avoid deep sleep. Stay awake between naps with movies, reading, or walking.`,
              dateTime: analysis.departMoment.clone().subtract(5, 'minutes').toISOString(),
            });
          } else {
            // Long flight (10+ hours) - strategic napping
            cards.push({
              id: `strategic-naps-${segment.from}-${segment.to}-${trip.id}`,
              title: `Take Strategic Naps on ${segment.from} > ${segment.to} Flight`,
              time: `${analysis.departMoment.format('h:mm A z')} - ${analysis.arriveMoment.format('h:mm A z')}`,
              icon: '💤',
              color: '#DBEAFE',
              why: adjustmentStrategy.percentage === 0
                ? `It's daytime in ${circadianOriginCity}, but staying awake for ${Math.round(duration)} hours is difficult. Strategic naps help manage fatigue while maintaining alignment with ${circadianOriginCity}.`
                : `This flight is during daytime at your destination, but staying awake for ${Math.round(duration)} hours is difficult. Strategic naps help manage fatigue while maintaining alignment with ${trip.to}.`,
              how: `Take short naps (20-30 minutes) as needed, but avoid sleeping more than 2-3 hours total. Set alarms to prevent deep sleep. Stay awake between naps with activities, meals, and movement.`,
              dateTime: analysis.departMoment.clone().subtract(5, 'minutes').toISOString(),
            });
          }
        }

        // === Add layover guidance if there's a connection ===
        if (analysis.nextLayoverHours !== undefined) {
          const layoverHours = analysis.nextLayoverHours;
          const nextSegment = segments[segments.indexOf(segment) + 1];

          if (layoverHours >= 0.5 && layoverHours < 2) {
            // Short layover - just transit
            cards.push({
              id: `layover-${segment.to}-short-${trip.id}`,
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
                id: `layover-${segment.to}-rest-${trip.id}`,
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
                id: `layover-${segment.to}-active-${trip.id}`,
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
              id: `layover-${segment.to}-long-${trip.id}`,
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

  // ==========================================
  // NOVEL FEATURE: Destination Timeline Fasting Protocol
  // Overlay the entire travel timeline (all flights & layovers) onto the Target Time.
  // Generate a max 16-hour fast ending at Target Breakfast (8:00 AM dest time),
  // and Break Fast at the exact target breakfast.
  // Do not apply if Stay Home (percentage === 0)
  // ==========================================
  if (adjustmentStrategy.percentage > 0) {
    const destinationTz = trip.toTz || getCityTimezone(trip.to);
    const arrivalMoment = moment.tz(`${trip.arriveDate} ${trip.arriveTime}`, 'YYYY-MM-DD HH:mm', destinationTz);

    // 1. Identify "Target Breakfast" (8:00 AM destination time on the day we land OR the day after if landing late)
    let targetBreakfast = arrivalMoment.clone().hour(8).minute(0).second(0);

    // 2. Define the Fasting Window: ~14 hours before Target Breakfast
    const fastStart = targetBreakfast.clone().subtract(14, 'hours');

    // 3. Safety Check: If the fast started WAY before the journey even began, compress it.
    // We shouldn't tell people to start fasting 8 hours before they leave for the airport.
    let actualFastStart = fastStart.clone();
    const departureBuffer = journeyStart.clone().subtract(2, 'hours'); // Airport arrival

    if (actualFastStart.isBefore(departureBuffer)) {
      // Compress the fast to start around when travel starts (max compression to 8 hours)
      actualFastStart = departureBuffer;
    }

    const fastDuration = targetBreakfast.diff(actualFastStart, 'hours', true);

    // Only generate the protocol if it's a meaningful fast (e.g. at least 6 hours) 
    // to avoid triggering on very short flights.
    if (fastDuration >= 6) {

      // A. Generate "Start Fasting" Card
      // We drop it on the timeline EXACTLY when the fast should start
      // Check if actualFastStart is after the journey ends (rare, but possible if very short flight landing next day)
      if (actualFastStart.isBefore(arrivalMoment)) {
        cards.push({
          id: `travel-fast-start-${trip.id}`,
          title: 'Align Your Meal Schedule',
          time: `Until ${targetBreakfast.format('h:mm A z')}`,
          icon: 'circle',
          color: '#F1F5F9', // Gray theme
          why: `We are shifting you onto ${trip.to} time! Your next main meal should ideally be breakfast at your destination.`,
          how: `Stay hydrated. If you get hungry, try to stick to light snacks rather than heavy meals to help your stomach adjust faster.`,
          dateTime: actualFastStart.toISOString(),
        });
      }

      // B. Generate "Break Fast" Card
      // Default Break Fast Time = 8:00 AM Destination Time
      let breakFastMoment = targetBreakfast.clone();

      // CONFLICT RESOLUTION: Does Break Fast overlap with a scheduled flight sleep block?
      // Since sleep wins, we must shift the breakfast to AFTER they wake up.

      // Look for any sleep cards generated in the travel phase
      const sleepCards = cards.filter(c => c.id.startsWith('sleep-') && !c.id.includes('stayhome'));

      let sleepConflict = false;
      sleepCards.forEach(sleepCard => {
        // Sleep cards format: Target: 12:15 AM CET - 8:15 AM CET
        // We can parse the exact end time to prevent overlap
        let exactSleepEnd = breakFastMoment.clone(); // fallback value if parsing fails

        // Prefer absolute `endDateTime` over fragile text parsing
        if (sleepCard.endDateTime) {
          exactSleepEnd = moment.tz(sleepCard.endDateTime, destinationTz);
        } else {
          try {
            const timeParts = sleepCard.time.split('-');
            if (timeParts.length === 2) {
              const endTimeStrString = timeParts[1].trim(); // e.g. "8:15 AM CET"
              const cleanEndTimeStr = endTimeStrString.split(' ')[0] + ' ' + endTimeStrString.split(' ')[1]; // "8:15 AM"
              const parsedEndTime = moment.tz(cleanEndTimeStr, 'h:mm A', destinationTz);
              if (parsedEndTime.isValid()) {
                // Reconstruct the moment on the same day as the destination arrival
                exactSleepEnd = breakFastMoment.clone().hour(parsedEndTime.hour()).minute(parsedEndTime.minute()).second(0);

                // If parsed time is way after breakFastMoment (e.g. 10PM sleep end vs 8AM breakfast), 
                // it might be crossing midnight backward, so adjust day
                if (exactSleepEnd.diff(breakFastMoment, 'hours') > 12) {
                  exactSleepEnd.subtract(1, 'day');
                }
              }
            }
          } catch (error) {
            console.warn("Failed to parse sleep window exactly.");
          }
        }

        const sleepStart = moment.tz(sleepCard.dateTime, destinationTz).add(15, 'minutes');
        // If parsing failed or gave weird result, fallback to a generous 8 hour block just in case
        const assumedSleepEnd = exactSleepEnd.isValid() && exactSleepEnd.isAfter(sleepStart) ? exactSleepEnd : sleepStart.clone().add(8, 'hours');

        // If BreakFast overlaps this newly found accurate sleep window
        if (breakFastMoment.isBetween(sleepStart, assumedSleepEnd, null, '[]')) {
          sleepConflict = true;
          breakFastMoment = assumedSleepEnd.clone().add(15, 'minutes'); // Shift to 15m after wake
        }
      });

      // Ensure Break Fast isn't wildly after arrival (if so, they just eat a normal meal)
      if (breakFastMoment.isBefore(arrivalMoment.clone().add(4, 'hours'))) {
        const isInFlightBreakfast = breakFastMoment.isBefore(arrivalMoment);

        cards.push({
          id: `travel-break-fast-${trip.id}`,
          title: isInFlightBreakfast ? 'In-Flight Breakfast' : 'Time for Breakfast',
          time: `${breakFastMoment.clone().tz(destinationTz).format('h:mm A z')}`,
          icon: 'package',
          color: '#E6F5D0', // Pistachio Green Theme
          why: isInFlightBreakfast
            ? `It is currently 8:00 AM in ${trip.to}! Breaking your fast now syncs your digestion to your destination while you fly.`
            : (sleepConflict
              ? `Eating your first main meal signals to your body that a new day has started. We delayed this slightly to protect your sleep.`
              : `Eating your first main meal aligned with ${trip.to} morning time powerfully reinforces your new timezone.`),
          how: `Enjoy a balanced breakfast. A high-protein meal can be especially helpful for boosting your morning energy.`,
          dateTime: breakFastMoment.toISOString(),
        });
      }
    }
  }

  // === Add overall hydration card ===
  cards.push({
    id: `travel-hydrate-${trip.id}`,
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

export function generateAdjustCards(
  trip: Trip,
  direction: 'east' | 'west',
  hoursDiff: number,
  adjustmentStrategy: { percentage: number; reason: string },
  userSettings: UserSettings,
  nextTrip: Trip | undefined,
  previousTrip: Trip | undefined,
  startDate: string,
  circadianOriginCity: string,
  circadianOriginTz?: string,
  minCardTime?: string, // Start cutoff (e.g. prev trip arrival)
  endCutoffTime?: string, // End cutoff (e.g. next trip departure)
  adjustmentDuration: number = 2 // Default to 2 loop days if not provided
): Card[] {
  console.log('🎯 generateAdjustCards called for trip:', trip.from, '→', trip.to);
  console.log('🎯 nextTrip:', nextTrip ? `${nextTrip.from} → ${nextTrip.to}` : 'undefined');
  console.log('🎯 previousTrip:', previousTrip ? `${previousTrip.from} → ${previousTrip.to}` : 'undefined');
  console.log('🎯 minCardTime:', minCardTime ? moment(minCardTime).format('MMM D h:mm A z') : 'undefined');

  const cards: Card[] = [];



  // Determine the actual landing time
  const lastSegment = trip.segments && trip.segments.length > 0
    ? trip.segments[trip.segments.length - 1]
    : null;

  const destTz = trip.toTz || getCityTimezone(trip.to); // Define destTz here

  const landingMoment = lastSegment
    ? moment.tz(
      `${lastSegment.arriveDate} ${lastSegment.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      lastSegment.toTz || getCityTimezone(lastSegment.to)
    )
    : moment.tz(
      `${trip.arriveDate} ${trip.arriveTime}`,
      'YYYY-MM-DD HH:mm',
      trip.toTz || getCityTimezone(trip.to)
    );

  // TRIGGER: Connection Conflict / Negative Duration Check
  // Forward check: If there is a next trip, and we arrive AFTER it departs, the plan is invalid.
  if (nextTrip) {
    const nextTripStart = moment.tz(
      `${nextTrip.departDate} ${nextTrip.departTime}`,
      'YYYY-MM-DD HH:mm',
      nextTrip.fromTz || getCityTimezone(nextTrip.from)
    );

    // If arrival is after next departure (with minor buffer for tight connections)
    // Using 0 buffer means strictly impossible.
    if (landingMoment.isAfter(nextTripStart)) {
      return [{
        id: `conflict-warning-${trip.id}`,
        title: 'Connection Conflict Detected',
        time: 'Plan Paused',
        icon: 'alert-triangle',
        color: '#FEF2F2', // Light red bg
        why: 'Your arrival time overlaps with your next flight\'s departure. This itinerary is not possible.',
        how: 'Tap to Edit Trip',
        dateTime: landingMoment.toISOString(),
        isInfo: false, // Must be false so notification scheduler sees it and suppresses others
        isDailyRoutine: false
      }];
    }
  }

  // Backward check: If there is a previous trip, and we depart BEFORE it arrives, the plan is invalid.
  if (previousTrip) {
    // Calculate previous trip's landing time
    const prevLastSegment = previousTrip.segments && previousTrip.segments.length > 0
      ? previousTrip.segments[previousTrip.segments.length - 1]
      : null;

    const prevLandingMoment = prevLastSegment
      ? moment.tz(
        `${prevLastSegment.arriveDate} ${prevLastSegment.arriveTime}`,
        'YYYY-MM-DD HH:mm',
        prevLastSegment.toTz || getCityTimezone(prevLastSegment.to)
      )
      : moment.tz(
        `${previousTrip.arriveDate} ${previousTrip.arriveTime}`,
        'YYYY-MM-DD HH:mm',
        previousTrip.toTz || getCityTimezone(previousTrip.to)
      );

    // Calculate current trip's departure time
    const currentDepartMoment = moment.tz(
      `${trip.departDate} ${trip.departTime}`,
      'YYYY-MM-DD HH:mm',
      trip.fromTz || getCityTimezone(trip.from)
    );

    // If we depart before previous trip arrives
    if (currentDepartMoment.isBefore(prevLandingMoment)) {
      return [{
        id: `conflict-warning-${trip.id}`,
        title: 'Connection Conflict Detected',
        time: 'Plan Paused',
        icon: 'alert-triangle',
        color: '#FEF2F2', // Light red bg
        why: 'Your departure time is before your previous flight\'s arrival. This itinerary is not possible.',
        how: 'Tap to Edit Trip',
        dateTime: currentDepartMoment.toISOString(),
        isInfo: false,
        isDailyRoutine: false
      }];
    }
  }

  const landingHour = landingMoment.hour();
  const landingTime = landingMoment.format('h:mm A');

  // TRIGGER: Late Night Arrival Logic (< 4 AM)
  // If true, we treat the rest of the arrival day as "Day 1" of the Daily Routine.
  const isLateNightArrival = landingHour < 4;
  const isExhausted = trip.arrivalRestStatus === 'exhausted';

  // ============================================
  // ARRIVAL DAY CARDS (conditional based on landing time)
  // ============================================

  cards.push({
    id: `adjust-arrival-${trip.id}`,
    title: 'You\'ve Arrived!',
    time: `Landed at ${landingTime}`,
    icon: '🎉',
    color: '#10b981',
    why: (adjustmentStrategy.percentage === 0 && !trip.adjustmentPreference)
      ? `You've reached ${trip.to}. Short trips are about energy management.`
      : adjustmentStrategy.reason,
    how: (adjustmentStrategy.percentage === 0 && trip.adjustmentPreference === 'stay_home')
      ? 'Stick to your origin schedule as much as possible. Focus on rest when you can.'
      : 'Get your bags, clear customs, head to your accommodation. The adjustment phase begins now.',
    dateTime: landingMoment.toISOString(),
  });

  // EXHAUSTED TRAVELER: Recovery Nap
  // Logic:
  // 1. Triggered if user marked "exhausted".
  // 2. Nap Start Time:
  //    - If recorded time exists, use max(LandingTime + 15m, RecordedTime + 5m)
  //    - Else use LandingTime + 15m
  // 3. Cutoff:
  //    - Must be started by 4 PM (16:00) generally.
  //    - AND must finish at least 6 hours before "bedtime" (roughly 10pm).
  //    - For simplicity, we stick to the 4 PM start time cutoff as a proxy for "too late to nap".

  let napEndMoment: moment.Moment | null = null; // Track when the nap ends to delay other cards

  if (isExhausted) {
    const recordedAt = trip.arrivalRestRecordedAt ? moment(trip.arrivalRestRecordedAt) : null;

    // Default: Landing + 90 mins (travel/customs time)
    let napStartMoment = landingMoment.clone().add(JetLagConfig.RECOVERY_NAP_MINUTES, 'minutes');

    // If recorded later than landing, use Recorded + 30 mins (settling in time)
    // We take the LATER of the two to be safe.
    // FIX: Ensure we convert the recorded time (which is absolute) to the DESTINATION timezone
    // so that .format() prints the correct local clock time.
    if (recordedAt && recordedAt.clone().add(30, 'minutes').isAfter(napStartMoment)) {
      napStartMoment = recordedAt.clone().add(30, 'minutes').tz(destTz);
    }

    napStartMoment = roundToNearest5(napStartMoment);

    napStartMoment = roundToNearest5(napStartMoment);

    const napStartHour = napStartMoment.hour();

    // Only suggest nap if start time is reasonably during the day (6 AM - 4 PM)
    // This prevents "Night Naps" (e.g. 12:30 AM) caused by late check-ins wrapping to next day
    // or very early morning arrivals where they should just sleep.
    if (napStartHour >= 6 && napStartHour < 16) {
      cards.push({
        id: `adjust-arrival-nap-${trip.id}`,
        title: 'Priority: Recovery Nap',
        time: napStartMoment.format('h:mm A') + ' for ' + JetLagConfig.RECOVERY_NAP_MINUTES + ' min',
        icon: '🛌',
        color: '#Fcd34d',
        why: 'Since you are feeling drained, a ' + JetLagConfig.RECOVERY_NAP_MINUTES + '-minute nap (one full sleep cycle) will reduce sleep pressure without causing grogginess.',
        how: 'Set an alarm for exactly ' + JetLagConfig.RECOVERY_NAP_MINUTES + ' minutes. Do not oversleep, or it will be hard to sleep tonight.',
        dateTime: napStartMoment.toISOString(),
      });

      // Calculate end time for conflict resolution
      napEndMoment = napStartMoment.clone().add(JetLagConfig.RECOVERY_NAP_MINUTES, 'minutes');
    }
  }

  // ============================================
  // COVERAGE-BASED LOGIC (Refactored)
  // Instead of checking if landing time is INSIDE a window, we check if there is TIME REMAINING in the window.
  // This ensures early arrivals (e.g. 4am) catch all subsequent advice windows.
  // ============================================

  // 1. Morning Light (Target: Arrival -> 10:00 AM)
  // Skip if Late Night Arrival (Daily Routine covers this) logic remains to prevent double-stacking.
  let morningLightGenerated = false;
  if (adjustmentStrategy.percentage > 0 && !isLateNightArrival) {
    const morningLightEnd = landingMoment.clone().hour(10).minute(0).second(0);

    // We only generate if we can get at least 45 mins of light
    // Start time is MAX(Arrival, "Morning Start"?).
    // Let's just say Start = Arrival (rounded).
    let sunStart = roundUpTo20(landingMoment.clone());

    // CONFLICT RESOLUTION: If napping, start sunlight AFTER nap
    if (napEndMoment && napEndMoment.isAfter(sunStart)) {
      sunStart = napEndMoment.clone().add(15, 'minutes');
    }

    if (sunStart.isBefore(morningLightEnd.clone().subtract(45, 'minutes'))) {
      const hasNaturalSunAdjustMorning = isSunUp(sunStart, trip.to);
      morningLightGenerated = true;
      cards.push({
        id: `adjust-arrival-morning-light-${trip.id}`,
        title: hasNaturalSunAdjustMorning ? 'Get Morning Sunlight' : 'Get Morning Light (Artificial)',
        time: `${roundToNearest5(sunStart).format('h:mm A')} - 10:00 AM`,
        icon: '☀️',
        color: '#FFF7C5',
        why: `Perfect timing! You landed during prime morning light hours. Get bright light immediately.`,
        how: hasNaturalSunAdjustMorning
          ? 'Get sunlight during your commute from airport. Even through windows helps. This jumpstarts your adjustment.'
          : 'The sun isn\'t up yet, but your body needs light to start the adjustment. Turn on bright indoor lights immediately.',
        dateTime: sunStart.toISOString(),
      });
    }
  }

  // 2. Afternoon Light (Target: MAX(Arrival, 10am) -> 6:00 PM)
  // We generate this for ALL arrivals (even late night) if there is time left in the afternoon.
  // This fills the gap for very early arrivals.
  if (adjustmentStrategy.percentage > 0) {
    const afternoonLightEnd = landingMoment.clone().hour(18).minute(0).second(0);
    const morningCutoff = landingMoment.clone().hour(10).minute(0).second(0);

    // Start is MAX(Arrival, 10am)
    let sunStart = roundUpTo20(landingMoment.clone());
    if (sunStart.isBefore(morningCutoff)) {
      sunStart = morningCutoff;
    }

    // CONFLICT RESOLUTION: If napping, start sunlight AFTER nap
    if (napEndMoment && napEndMoment.isAfter(sunStart)) {
      sunStart = napEndMoment.clone().add(15, 'minutes');
    }

    if (sunStart.isBefore(afternoonLightEnd.clone().subtract(45, 'minutes'))) {
      const hasNaturalSunAdjustAfternoon = isSunUp(sunStart, trip.to);
      // If morning light was already shown, the afternoon card is a continuation — adjust why text accordingly.
      const afternoonWhy = morningLightGenerated
        ? `Keep getting afternoon light to reinforce your adjustment.`
        : `Get bright light for the rest of the afternoon to help your body adjust to the new timezone.`;
      cards.push({
        id: `adjust-arrival-afternoon-light-${trip.id}`,
        title: hasNaturalSunAdjustAfternoon ? 'Get Afternoon Sunlight' : 'Get Afternoon Light (Artificial)',
        time: `${roundToNearest5(sunStart).format('h:mm A')} - 6:00 PM`,
        icon: '🌞',
        color: '#FFF7C5',
        why: afternoonWhy,
        how: hasNaturalSunAdjustAfternoon
          ? 'Stay active outdoors if possible. Walk around your neighborhood. Sit by windows. Avoid napping.'
          : 'The sun is setting or down, but bright indoor light will help you stay awake and adjust. Avoid napping.',
        dateTime: sunStart.toISOString(),
      });
    }
  }

  // 3. Caffeine (Target: MAX(Arrival, 6am) -> 2:00 PM)
  // Skip for Stay Home.
  // Also check !isLateNightArrival to prevent checking overlaps if using Daily Routine?
  // Actually, checking "Coverage" handles it safely. Even if 2AM arrival,
  // isLateNightArrival=true -> Daily Routine generated.
  // Daily Routine has Caffeine card.
  // So we SHOULD suppress this if isLateNightArrival to avoid double caffeine cards.
  if (adjustmentStrategy.percentage > 0 && !isLateNightArrival) {
    const caffeineEnd = landingMoment.clone().hour(14).minute(0).second(0);
    const caffeineMorningStart = landingMoment.clone().hour(6).minute(0).second(0);

    // Start is MAX(Arrival, 6am)
    let caffeineStart = roundUpTo20(landingMoment.clone());
    if (caffeineStart.isBefore(caffeineMorningStart)) {
      caffeineStart = caffeineMorningStart;
    }

    // CONFLICT RESOLUTION: If napping, delay caffeine until AFTER nap
    if (napEndMoment && napEndMoment.isAfter(caffeineStart)) {
      caffeineStart = napEndMoment.clone().add(15, 'minutes');
    }

    if (caffeineStart.isBefore(caffeineEnd.clone().subtract(45, 'minutes'))) {
      // We do NOT add the "Caffeine OK" card here because the Evolving Loop handles "Caffeine OK"
      // based on wake time.
      // Wait, the original code had a comment:
      // "REMOVED LEGACY LOGIC: Evolving Loop ... now handles all Caffeine advice including Day 0."
      // BUT the Evolving Loop only runs if `isLateNightArrival` OR `Start Tomorrow`.
      // If I land at 4 AM, `isLateNightArrival` is false.
      // So the Evolving Loop starts TOMORROW (Day 1).
      // So TODAY (Day 0) gets NO caffeine advice from Evolving Loop.
      // So we MUST generate caffeine advice here.

      // Check if I should re-enable the Caffeine card.
      // The previous code had the block `if ... { ... }` but it was EMPTY inside except for comments!
      // It said "REMOVED LEGACY LOGIC".
      // AND "The evolving loop uses 'Until X' / 'After X' strictly aligned."

      // This means the user currently gets NO caffeine advice on arrival day unless Late Night?
      // Let's check the Evolving Loop params.
      // `const dayOffset = isLatearrivalNextDayStart ? i : i + 1;`
      // If 4 AM arrival: `isLatearrivalNextDayStart` = false.
      // `dayOffset` starts at 1. (Arrival + 1 day).
      // So Day 0 is indeed skipped by Evolving Loop.

      // If the original code was empty, then NO caffeine card was generated for Day 0 ever (except maybe implied?)
      // The user complained about emptiness.
      // So adding a Caffeine card here IS desirable.
      // I will add a simple "Caffeine OK" card.

      cards.push({
        id: `adjust-arrival-caffeine-ok-${trip.id}`,
        title: `Caffeine OK Until 2:00 PM`,
        time: `${roundToNearest5(caffeineStart).format('h:mm A')} - 2:00 PM`,
        icon: '☕',
        color: '#92400e',
        why: 'Caffeine helps you stay alert during the day.',
        how: 'Enjoy your coffee or tea!',
        dateTime: caffeineStart.toISOString(),
      });

      // Also add the limit card? Usually paired.
      // Or just leave the limit card for the "Daily Routine" / or implied.
      // The Evolving loop adds both.
      // I'll adds both for completeness if I'm restoring it.

      cards.push({
        id: `adjust-arrival-no-caffeine-${trip.id}`,
        title: `Limit Caffeine After 2:00 PM`,
        time: `After 2:00 PM`,
        icon: '🚫',
        color: '#64748b',
        why: 'Caffeine can stay in your system for 8+ hours. Stopping early ensures deep sleep.',
        how: 'Switch to decaf, water, or herbal tea.',
        dateTime: caffeineEnd.toISOString(),
      });
    }
  }

  // ============================================
  // SIMPLIFIED: Stay Home Strategy - Simple Energy Management
  // ============================================
  if (adjustmentStrategy.percentage === 0) {
    // Check if returning home (no advice needed - just resume normal life)
    const localTz = trip.toTz || getCityTimezone(trip.to);
    const homeTz = circadianOriginTz || getCityTimezone(circadianOriginCity);
    const isReturningHome = localTz === homeTz;

    if (!isReturningHome) {
      // Simple energy management card - no specific times, no timezone math
      cards.push({
        id: `adjust-stay-home-tips-${trip.id}`,
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
      const originTz = circadianOriginTz || getCityTimezone(circadianOriginCity);
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
        id: `adjust-arrival-sleep-now-${trip.id}`,
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
        id: `adjust-arrival-stay-awake-${trip.id}`,
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
      id: `adjust-arrival-light-meal-${trip.id}`,
      title: 'Light Evening Meal',
      time: 'Soon after arrival',
      icon: '🍽️',
      color: '#F3F0ED',
      why: `Evening arrival at ${landingTime}. Have a light meal to help you settle in.`,
      how: 'Eat something light at your accommodation or nearby. Don\'t skip food, but avoid heavy meals late at night.',
      dateTime: landingMoment.toISOString(),
    });


    if (adjustmentStrategy.percentage > 0) {
      // Resolve Conflict: Late Arrival vs Early Bedtime
      // If arrival is 9 PM and bedtime is 9 PM, user cannot sleep instantly.
      // Enforce a minimum "Settling In" buffer (e.g. 90 mins) after landing.
      // FIX: Use safelyGetBedtimeMoment to handle bedtimes after midnight (e.g., 12:30 AM)
      const arrivalBedtimeBase = safelyGetBedtimeMoment(
        arrivalDate,
        userSettings.normalBedtime,
        trip.toTz || getCityTimezone(trip.to)
      );

      // Calculate target bedtime based on exhaustion
      // Exhausted: Normal - 1h. Standard: Normal.
      let targetBedtime = isExhausted
        ? arrivalBedtimeBase.clone().subtract(1, 'hour')
        : arrivalBedtimeBase.clone();

      // Calculate minimum allowed bedtime (Landing + 90 mins) to allow for transport/food
      const minBedtime = landingMoment.clone().add(90, 'minutes');

      // Use the later of the two
      if (targetBedtime.isBefore(minBedtime)) {
        targetBedtime = minBedtime;
      }

      // Round to nearest 5
      targetBedtime = roundToNearest5(targetBedtime);

      // Determine strict title: Only call it "Early Bedtime" if it's actually early (e.g. at least 30m before normal)
      const isActuallyEarly = targetBedtime.isBefore(arrivalBedtimeBase.clone().subtract(29, 'minutes'));

      cards.push({
        id: `adjust-arrival-sleep-${trip.id}`,
        // FIX: Add "Priority:" prefix if exhausted to trigger the Peach color theme in TripDetails.tsx
        title: isExhausted
          ? (isActuallyEarly ? 'Priority: Early Bedtime' : 'Priority: Sleep at Local Bedtime')
          : 'Sleep at Local Bedtime',
        time: formatTime12Hour(targetBedtime.format('HH:mm')),
        icon: '🌙',
        color: isExhausted ? '#FFE4D6' : '#1C5D74', // Algorithm color (backup)
        why: isExhausted
          ? 'Since you\'re feeling drained, aim to sleep as soon as possible after settling in.'
          : 'Getting to bed at a reasonable local time helps start your adjustment.',
        how: isExhausted
          ? `Push through until at least ${formatTime12Hour(targetBedtime.clone().subtract(30, 'minutes').format('HH:mm'))}, then crash. Don't go to bed too early or you'll wake up at 2 AM.`
          : `Try to sleep around ${formatTime12Hour(targetBedtime.format('HH:mm'))}. Keep room dark and cool.`,
        dateTime: targetBedtime.toISOString(),
      });

      if (userSettings.useMelatonin) {
        const melatoninTime = targetBedtime.clone().subtract(30, 'minutes');
        cards.push({
          id: `adjust-arrival-melatonin-${trip.id}`,
          title: 'Melatonin',
          time: `${formatTime12Hour(melatoninTime.format('HH:mm'))} (optional)`,
          icon: '💊',
          color: '#8b5cf6',
          why: 'Some travelers choose to use melatonin to signal to the body that it\'s time to sleep.',
          how: 'If this is something you already use, you may choose to take a small amount 30 minutes before bed. Follow package instructions.',
          dateTime: melatoninTime.toISOString(),
        });
      }

      if (userSettings.useMagnesium) {
        const magTime = targetBedtime.clone().subtract(1, 'hour');
        cards.push({
          id: `adjust-arrival-magnesium-${trip.id}`,
          title: 'Magnesium',
          time: '1 hour before bed (optional)',
          icon: '💊',
          color: '#10b981',
          why: 'Many travelers find magnesium helpful for winding down.',
          how: 'If you\'d like to try it, consider taking magnesium glycinate about an hour before bed.',
          dateTime: magTime.toISOString(),
        });
      }
    } else {
      // Stay Home logic for evening arrival?
      // Maybe just "Rest when tired"
      cards.push({
        id: `adjust-arrival-rest-home-${trip.id}`,
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
      const dinnerTime = roundToNearest5(landingMoment.clone().hour(18).minute(0).second(0));
      cards.push({
        id: `adjust-arrival-dinner-${trip.id}`,
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
        id: `adjust-arrival-sleep-${trip.id}`,
        title: isExhausted ? 'Early Bedtime' : 'Sleep at Local Time Tonight',
        time: isExhausted
          ? formatTime12Hour(moment(userSettings.normalBedtime, 'HH:mm').subtract(1, 'hour').format('HH:mm'))
          : formatTime12Hour(userSettings.normalBedtime),
        icon: '🌙',
        color: '#1C5D74',
        why: isExhausted
          ? 'Since you are feeling drained, aim for an early bedtime to catch up on rest while anchoring to local time.'
          : 'Your first night in the new timezone. Sleeping at normal local bedtime is recommended even if not tired.',
        how: isExhausted
          ? `Push through until at least ${formatTime12Hour(moment(userSettings.normalBedtime, 'HH:mm').subtract(1.5, 'hours').format('HH:mm'))}, then crash. Don't go to bed too early or you'll wake up in the middle of the night.`
          : `Try to go to bed around ${userSettings.normalBedtime}. Keep room dark and cool.`,
        dateTime: safelyGetBedtimeMoment(arrivalDate, userSettings.normalBedtime, trip.toTz || getCityTimezone(trip.to)).toISOString(),
      });

      // Inject Melatonin/Magnesium for Day Arrival
      let bedtimeMoment = safelyGetBedtimeMoment(arrivalDate, userSettings.normalBedtime, trip.toTz || getCityTimezone(trip.to));

      // FIX: If exhausted, user is sleeping early (1 hour early). Supplements should shift too.
      if (isExhausted) {
        bedtimeMoment.subtract(1, 'hour');
      }

      if (userSettings.useMelatonin) {
        const melatoninTime = bedtimeMoment.clone().subtract(30, 'minutes');
        cards.push({
          id: `adjust-arrival-melatonin-${trip.id}`,
          title: 'Melatonin',
          time: `${formatTime12Hour(melatoninTime.format('HH:mm'))} (optional)`,
          icon: '💊',
          color: '#8b5cf6',
          why: 'Some travelers choose to use melatonin to signal to the body that it\'s time to sleep.',
          how: 'If this is something you already use, you may choose to take a small amount 30 minutes before bed. Follow package instructions.',
          dateTime: melatoninTime.toISOString(),
        });
      }

      if (userSettings.useMagnesium) {
        const magTime = bedtimeMoment.clone().subtract(1, 'hour');
        cards.push({
          id: `adjust-arrival-magnesium-${trip.id}`,
          title: 'Magnesium',
          time: '1 hour before bed (optional)',
          icon: '💊',
          color: '#10b981',
          why: 'Many travelers find magnesium helpful for winding down.',
          how: 'If you\'d like to try it, consider taking magnesium glycinate about an hour before bed.',
          dateTime: magTime.toISOString(),
        });
      }
    }
  }

  // ============================================
  // VISUAL SEPARATOR - Place at end of arrival day (11:59 PM)
  // Only show for full adjustment plans where we have a recurring routine
  // ============================================

  // Separator moved below conflict check

  // ============================================
  // EVOLVING DAILY ADVICE (Day 1 - Day 4)
  // Instead of a static "Repeated Daily" routine, we generate specific advice for each day
  // accounting for the body's gradual timeline shift (approx 1h/day).
  // ============================================

  // Ensure loop duration matches the plan's adjustmentDuration
  // If duration is 3 (e.g. gap Jan 26-28), we need 2 days of routine (Jan 27, 28).
  const adjustmentDays = Math.max(adjustmentDuration - 1, 1);

  // Check if we should generate a daily adjustment routine
  // We SKIP this loop if:
  // 1. Timezone difference is negligible (< 1 hour)
  // 2. OR Strategy is 'Stay Home' (percentage === 0)
  const shouldGenerateRoutine = Math.abs(hoursDiff) >= JetLagConfig.MIN_TIMEZONE_DIFF_HOURS && adjustmentStrategy.percentage > 0;

  if (shouldGenerateRoutine) {
    // Start from Day 1 (Tomorrow relative to landing, or Today if Late Arrival)
    const isLatearrivalNextDayStart = isLateNightArrival && landingMoment.hour() < 4;

    for (let i = 0; i < adjustmentDays; i++) {
      // Calculate the target date for this iteration
      // If late arrival (e.g. 2 AM on Feb 1), "Day 1" routine starts Feb 1 (today).
      // If normal arrival (e.g. 5 PM on Feb 1), "Day 1" routine starts Feb 2 (tomorrow).
      const dayOffset = isLatearrivalNextDayStart ? i : i + 1;
      const currentDayMoment = landingMoment.clone().add(dayOffset, 'days').startOf('day');
      const currentDayStr = currentDayMoment.format('YYYY-MM-DD');

      // Generate advice for this day (even if close to departure)
      // The filter at the end of the function will handle precise suppression.

      // CLAUDE MATH: Body Clock Shift
      const daysElapsed = i + 1;
      const strictness = Math.min(daysElapsed / Math.max(adjustmentDuration, 1), 1.0);
      const percentAdjusted = strictness;

      const unshiftedOffsetHours = hoursDiff * (1 - strictness);

      // === 1. Sunlight Advice ===
      const [wakeHour, wakeMinute] = userSettings.normalWakeTime.split(':').map(Number);
      const destWakeMoment = currentDayMoment.clone().hour(wakeHour).minute(wakeMinute);
      const wakeMoment = destWakeMoment.clone().subtract(unshiftedOffsetHours, 'hours');

      const hasNaturalSunAdjust = isSunUp(wakeMoment, trip.to);
      const lightEndMoment = wakeMoment.clone().add(2, 'hours'); // 2 hours exposure

      // Adaptive Title based on progress
      let sunTitle = hasNaturalSunAdjust ? 'Seek Morning Sunlight' : 'Seek Light (Artificial if needed)';
      let sunWhy = 'Light exposure is the most powerful tool to lock in your new timezone.';

      if (percentAdjusted < 0.5) {
        sunTitle = hasNaturalSunAdjust ? 'Get Sunlight When You Wake' : 'Get Morning Light (Artificial)';
        sunWhy = 'Your body is still catching up. Getting light immediately upon waking is critical to shift your rhythm.';
      } else {
        sunTitle = hasNaturalSunAdjust ? 'Lock In Your Rhythm' : 'Lock In Your Rhythm (Artificial Light)';
        sunWhy = 'You are almost fully adjusted. Morning light helps anchor your new schedule.';
      }

      // Don't generate if wake time is super late (past noon)
      if (wakeHour < 12) {
        cards.push({
          id: `adjust-sun-${currentDayStr}`,
          title: sunTitle,
          time: `${formatTime12Hour(userSettings.normalWakeTime)} - ${lightEndMoment.format('h:mm A')}`,
          icon: '☀️',
          color: '#FFF7C5',
          why: sunWhy,
          how: hasNaturalSunAdjust
            ? 'Get outside for a walk. Even just 20-30 minutes helps.'
            : 'The sun isn\'t up yet, but your body needs light. Turn on all hotel lights, use a lightbox, or look at a bright screen.',
          dateTime: wakeMoment.toISOString(),
          isDailyRoutine: false // Specific date
        });
      }

      // === 1.5 Meal Timing Logic ===
      // Encourage eating at local meal times to synchronize the gut clock.
      // Card appears 30 minutes after normal wake time.
      const mealMoment = wakeMoment.clone().add(30, 'minutes');

      cards.push({
        id: `adjust-meals-${currentDayStr}`,
        title: 'Eat at Local Meal Times',
        time: 'Breakfast, Lunch, & Dinner',
        icon: 'package',
        color: '#E6F5D0', // Pistachio Green Theme 
        why: 'Your gut has its own clock. Eating all your meals at local times reinforces the reset faster.',
        how: 'Eat breakfast, lunch, and dinner at normal local times, even if you are not hungry. Avoid snacking late at night.',
        dateTime: mealMoment.toISOString(),
        isDailyRoutine: false
      });

      // === 2. Caffeine Logic ===
      // Cutoff based on target bedtime
      const destBedMoment = safelyGetBedtimeMoment(
        currentDayStr,
        userSettings.normalBedtime,
        trip.toTz || getCityTimezone(trip.to)
      );
      const targetBedtime = destBedMoment.clone().subtract(unshiftedOffsetHours, 'hours');

      let cutoffMoment = targetBedtime.clone().subtract(9, 'hours');

      // FIX: Ensure the cutoff moment stays on the 'current' logical day tab.
      if (cutoffMoment.isBefore(currentDayMoment)) {
        cutoffMoment.add(1, 'day');
      }

      if (cutoffMoment.hour() < 12) cutoffMoment.hour(14).minute(0); // Safety floor 2PM

      cutoffMoment = roundToNearest5(cutoffMoment);
      const cutoffTimeStr = formatTime12Hour(cutoffMoment.format('HH:mm'));

      const formattedWakeTime = formatTime12Hour(wakeMoment.format('HH:mm'));

      // Only show "Caffeine OK" if wake time is efficiently before cutoff
      if (cutoffMoment.diff(wakeMoment, 'hours') > 2) {
        cards.push({
          id: `adjust-caffeine-ok-${currentDayStr}`,
          title: `Caffeine OK Until ${cutoffTimeStr}`,
          time: `${formattedWakeTime} - ${cutoffTimeStr}`,
          icon: '☕',
          color: '#92400e',
          why: 'Caffeine helps you stay alert during the day.',
          how: 'Enjoy your coffee or tea!',
          dateTime: wakeMoment.clone().add(5, 'minutes').toISOString(),
          isDailyRoutine: false
        });
      }

      cards.push({
        id: `adjust-no-caffeine-${currentDayStr}`,
        title: `Limit Caffeine After ${cutoffTimeStr}`,
        time: `After ${cutoffTimeStr}`,
        icon: '🚫',
        color: '#64748b',
        why: 'Caffeine can stay in your system for 8+ hours. Stopping early ensures deep sleep.',
        how: 'Switch to decaf, water, or herbal tea.',
        dateTime: cutoffMoment.toISOString(),
        isDailyRoutine: false
      });

      // === 3. Bedtime (Body Relative Conflict Check?) ===
      let sleepTitle = 'Sleep at Local Bedtime';
      let sleepWhy = 'Consistency is key. Stick to your local schedule.';
      const isExhaustedPhase = i === 0 && trip.arrivalRestStatus === 'exhausted';

      if (percentAdjusted < 0.3 && !isExhaustedPhase) {
        // Early days -> Hard to sleep
        sleepWhy = 'Your body might not be tired yet, but rest is important. Lie down and relax even if you can\'t sleep.';
        if (userSettings.useMelatonin) {
          sleepWhy += ' Melatonin can be particularly helpful tonight.';
        }
      }

      // LAST CARD CONTEXT: If this is the last day of the generated plan,
      // and the user still has a long way to go (e.g. Total Diff > 8 hours),
      // add a note setting expectations.
      if ((i === adjustmentDays - 1) && Math.abs(hoursDiff) > 8) {
        sleepWhy += ` Note: For larger timezone shifts, full adjustment may take several more days. Continue this routine until you feel fully adapted.`;
      }

      cards.push({
        id: `adjust-sleep-${currentDayStr}`,
        title: sleepTitle,
        time: formatTime12Hour(userSettings.normalBedtime),
        icon: '🌙',
        color: '#1C5D74',
        why: sleepWhy,
        how: `Keep room cool and dark.${userSettings.useMelatonin ? ' Melatonin optional.' : ''}`,
        dateTime: targetBedtime.toISOString(),
        isDailyRoutine: false
      });

      // Melatonin/Magnesium (Optional)
      if (userSettings.useMelatonin) {
        const melTime = targetBedtime.clone().subtract(30, 'minutes');
        cards.push({
          id: `adjust-melatonin-${currentDayStr}`,
          title: 'Melatonin',
          time: '30 min before bed (optional)',
          icon: '💊',
          color: '#8b5cf6',
          why: 'Helps signal sleep time to your body clock.',
          how: 'Take a small dose if you choose.',
          dateTime: melTime.toISOString(),
          isDailyRoutine: false
        });
      }

      // Magnesium (Optional)
      if (userSettings.useMagnesium) {
        const magTime = targetBedtime.clone().subtract(60, 'minutes'); // 1 hour before bed
        cards.push({
          id: `adjust-magnesium-${currentDayStr}`,
          title: 'Magnesium',
          time: '1 hour before bed (optional)',
          icon: '💊',
          color: '#fca5a5',
          why: 'Many travelers find magnesium helpful for winding down.',
          how: 'If you\'d like to try it, consider taking magnesium glycinate about an hour before bed.',
          dateTime: magTime.toISOString(),
          isDailyRoutine: false
        });
      }
    }
  }



  // Sort all cards chronologically before returning
  // Sort all cards: Arrival -> Priority -> Chronological
  cards.sort((a, b) => {
    // 1. 'You've Arrived' card always FIRST
    if (a.id === 'adjust-arrival') return -1;
    if (b.id === 'adjust-arrival') return 1;

    // 2. 'Priority' cards always SECOND
    const IsPriorityA = a.title.includes('Priority');
    const IsPriorityB = b.title.includes('Priority');
    if (IsPriorityA && !IsPriorityB) return -1;
    if (!IsPriorityA && IsPriorityB) return 1;

    // 3. Chronological (Cards with dateTime come first)
    if (a.dateTime && !b.dateTime) return -1;
    if (!a.dateTime && b.dateTime) return 1;
    if (!a.dateTime && !b.dateTime) return 0;

    return moment(a.dateTime).diff(moment(b.dateTime));
  });

  // FINAL FILTER: Ensure no cards conflict with next trip's prepare/travel phases
  if (nextTrip) {
    console.log('🔍 CONFLICT FILTER - Current trip landing:', landingMoment.format('YYYY-MM-DD HH:mm z'));
    console.log('🔍 Next trip:', nextTrip.from, '→', nextTrip.to, 'departs', `${nextTrip.departDate} ${nextTrip.departTime}`);

    // Calculate when the next trip's prepare phase would start
    // This is typically 1-2 days before departure depending on timezone difference
    const nextTripDepartMoment = moment.tz(
      `${nextTrip.departDate} ${nextTrip.departTime}`,
      'YYYY-MM-DD HH:mm',
      nextTrip.fromTz || getCityTimezone(nextTrip.from)
    );

    // Determine prepare phase duration for next trip
    // We need to calculate the timezone diff for the next trip to know prep days
    const nextTripTzDiff = Math.abs(calculateTimezoneDiff(
      nextTrip.from,
      nextTrip.to,
      nextTrip.departDate
    ));
    const nextTripIdealPrepDays = Math.ceil(nextTripTzDiff / 3);
    const nextTripPrepDays = Math.min(nextTripIdealPrepDays, JetLagConfig.MAX_PREP_DAYS);

    // Calculate when prepare phase starts
    const nextTripPrepareStart = nextTripDepartMoment.clone().subtract(nextTripPrepDays, 'days');

    // Check if next trip's prepare phase would be suppressed due to overlap with current adjust phase
    // Current adjust phase ends at: landingMoment + 1 day
    const currentAdjustEnd = landingMoment.clone().add(1, 'days');
    const nextPrepareWouldBeSuppressed = currentAdjustEnd.isSameOrAfter(nextTripPrepareStart);

    // Determine cutoff time:
    // - If prepare phase is suppressed: use departure time (travel phase starts immediately)
    // - If prepare phase exists: use prepare start time
    // - Always use the earlier of the two to be safe
    const cutoffTime = nextPrepareWouldBeSuppressed
      ? nextTripDepartMoment
      : moment.min(nextTripPrepareStart, nextTripDepartMoment);

    console.log('🔍 Cutoff time:', cutoffTime.format('YYYY-MM-DD HH:mm z'));
    console.log('🔍 Cards before filter:', cards.length);

    // Helpers for consistent filtering
    const getLogicalDateStr = (m: moment.Moment) => {
      const tzMom = moment.tz(m, destTz);
      return tzMom.hour() < 5 ? tzMom.clone().subtract(1, 'day').format('YYYY-MM-DD') : tzMom.format('YYYY-MM-DD');
    };
    const lastCardWithTime = [...cards].reverse().find(c => c.dateTime);
    const lastLogicalDate = lastCardWithTime && lastCardWithTime.dateTime ? getLogicalDateStr(moment(lastCardWithTime.dateTime)) : '';

    const filteredCards = cards.filter(c => {
      // Always keep info cards (like "You've Arrived" - though separators are info cards too)
      if (c.isInfo && c.id !== 'adjust-separator') return true;

      // Always keep conflict warnings and arrival cards
      if (c.id.includes('conflict') || c.id.includes('arrival')) return true;

      // Keep cards without explicit time (separators, etc. - we'll handle separators later)
      if (!c.dateTime) return true;

      const cardTime = moment(c.dateTime);

      // Special handling for sleep/bed cards - they need a minimum duration buffer
      const isSleepCard = c.title.toLowerCase().includes('bed') ||
        c.title.toLowerCase().includes('sleep');

      if (isSleepCard) {
        const minimumSleepHours = 3;
        const cardEndTime = cardTime.clone().add(minimumSleepHours, 'hours');
        const keep = cardEndTime.isBefore(cutoffTime);
        if (!keep) {
          console.log(`🔍 FILTERED OUT: "${c.title}" at ${cardTime.format('YYYY-MM-DD HH:mm z')} (would end at ${cardEndTime.format('HH:mm')}, conflicts with ${cutoffTime.format('HH:mm')} cutoff)`);
        }
        return keep;
      }

      // Check if it's a routine card
      const isRoutine =
        c.isDailyRoutine ||
        c.title.toLowerCase().includes('light') ||
        c.title.toLowerCase().includes('sunlight') ||
        c.title.toLowerCase().includes('caffeine') ||
        c.title.toLowerCase().includes('nap') ||
        c.title.toLowerCase().includes('meal') ||
        c.id.includes('adjust-separator');

      // For non-routine cards (critical advice), check if scheduled time is before cutoff
      if (!isRoutine) {
        return cardTime.isBefore(cutoffTime);
      }

      // ROUTINE CARDS:
      // Check if scheduled time is before cutoff
      const isBeforeCutoff = cardTime.isBefore(cutoffTime);

      // EXCEPTION: If the card is on the same day as the cutoff or is the last logical day
      // of this segment, keep it so the last tab doesn't look empty.
      const cutoffLogicalDate = getLogicalDateStr(cutoffTime);
      const isOnCutoffDay = getLogicalDateStr(cardTime) === cutoffLogicalDate;
      const isLastDay = getLogicalDateStr(cardTime) === lastLogicalDate;

      if (isBeforeCutoff || isOnCutoffDay || isLastDay) {
        return true;
      }

      console.log(`🔍 FILTERED OUT: Routine card "${c.title}" at ${cardTime.format('YYYY-MM-DD HH:mm z')}`);
      return false;
    });

    console.log('🔍 Cards after filter:', filteredCards.length);

    // Post-filter cleanup: Remove "Daily Routine" separator if all daily routine cards were filtered out
    const hasDailyRoutineCards = filteredCards.some(c => c.isDailyRoutine);
    const finalCards = filteredCards.filter(c => {
      // Remove the separator if there are no daily routine cards
      if (c.id === 'adjust-separator' && !hasDailyRoutineCards) {
        console.log('🔍 FILTERED OUT: Daily Routine separator (no daily cards remaining)');
        return false;
      }
      return true;
    });

    console.log('🔍 Cards after separator cleanup:', finalCards.length);
    return finalCards;
  }

  // === FILTERING STEP for Start/End Overlap ===
  if (minCardTime || endCutoffTime) {
    const startCutoff = minCardTime ? moment(minCardTime) : null;
    const endCutoff = endCutoffTime ? moment(endCutoffTime) : null;

    if (startCutoff) console.log(`[ADJUST FILTER] Start Cutoff: ${startCutoff.format('MMM D h:mm A z')}`);
    if (endCutoff) console.log(`[ADJUST FILTER] End Cutoff: ${endCutoff.format('MMM D h:mm A z')}`);

    const getLogicalDateStr = (m: moment.Moment) => {
      const tzMom = moment.tz(m, destTz);
      return tzMom.hour() < 5 ? tzMom.clone().subtract(1, 'day').format('YYYY-MM-DD') : tzMom.format('YYYY-MM-DD');
    };
    const lastCardWithTime = [...cards].reverse().find(c => c.dateTime);
    const lastLogicalDate = lastCardWithTime && lastCardWithTime.dateTime ? getLogicalDateStr(moment(lastCardWithTime.dateTime)) : '';

    const filteredCards = cards.filter(card => {
      // Always keep conflict warnings and arrival cards
      if (card.id.includes('conflict') || card.id.includes('arrival')) return true;
      if (!card.dateTime) return true;

      const cardTime = moment(card.dateTime);

      // Start Cutoff Check (filter out past events)
      if (startCutoff && cardTime.isBefore(startCutoff)) {
        console.log(`[ADJUST FILTER] Removing past card '${card.title}'`);
        return false;
      }

      // End Cutoff Check (filter out future overlaps with next trip)
      if (!endCutoff) return true;

      // Special handling for sleep/bed cards - they need a minimum duration buffer
      const isSleepCard = card.title.toLowerCase().includes('bed') ||
        card.title.toLowerCase().includes('sleep');

      if (isSleepCard) {
        const minimumSleepHours = 3;
        const cardEndTime = cardTime.clone().add(minimumSleepHours, 'hours');
        return cardEndTime.isBefore(endCutoff);
      }

      // Check if it's a routine card
      const isRoutine =
        card.isDailyRoutine ||
        card.title.toLowerCase().includes('light') ||
        card.title.toLowerCase().includes('sunlight') ||
        card.title.toLowerCase().includes('caffeine') ||
        card.title.toLowerCase().includes('nap') ||
        card.title.toLowerCase().includes('meal') ||
        card.id.includes('adjust-separator');

      // For non-routine cards (critical advice), check if scheduled time is before cutoff
      if (!isRoutine) {
        return cardTime.isBefore(endCutoff);
      }

      // ROUTINE CARDS:
      // Check if scheduled time is before cutoff
      const isBeforeCutoff = cardTime.isBefore(endCutoff);

      // EXCEPTION: If the card is on the same day as the cutoff or is the last logical day
      // of this segment, keep it so the last tab doesn't look empty.
      const cutoffLogicalDate = getLogicalDateStr(endCutoff);
      const isOnCutoffDay = getLogicalDateStr(cardTime) === cutoffLogicalDate;
      const isLastDay = getLogicalDateStr(cardTime) === lastLogicalDate;

      if (isBeforeCutoff || isOnCutoffDay || isLastDay) {
        return true;
      }

      console.log(`[ADJUST FILTER] Removing future routine card '${card.title}'`);
      return false;
    });

    return filteredCards;
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
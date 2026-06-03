// Simulate what happens when user types "BDA"
console.log('Testing BDA lookup...');

// Since we can't import from TSX directly, let's manually trace the logic:
const cityTimezones = require('city-timezones');
const airports = require('airport-codes');

const input = 'BDA';

// Step 1: Legacy IATA check
const legacyAirportMappings = {}; // Empty in our case
console.log('1. Legacy IATA:', legacyAirportMappings[input.toUpperCase()]);

// Step 2: Universal IATA
const airportMatch = airports.findWhere({ iata: input.toUpperCase() });
const airportCity = airportMatch ? airportMatch.get('city') : null;
console.log('2. Universal IATA returned:', airportCity);

// Step 3: Validate in city-timezones
if (airportCity) {
    const validated = cityTimezones.lookupViaCity(airportCity);
    console.log('3. Validation in city-timezones:', validated);
    console.log('   -> Valid?', validated && validated.length > 0);
}

// Step 4: What happens with fuzzy matching on "BDA"?
const VALID_CITIES = ['Lima', 'London', 'New York', 'Paris', 'Tokyo', 'Sydney'];
const normalized = input.toLowerCase();

// Levenshtein distance
function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

const distances = VALID_CITIES.map(city => ({
    city,
    distance: levenshteinDistance(normalized, city.toLowerCase())
}));

const sorted = distances.sort((a, b) => a.distance - b.distance);
console.log('4. Fuzzy match distances:', sorted);
console.log('   -> Closest:', sorted[0]);

const airports = require('airport-codes');

// Missing vacation destinations with timezone data
const missingDestinations = [
    { name: 'St Maarten', iata: 'SXM', city: 'Philipsburg', timezone: 'America/Lower_Princes', country: 'Sint Maarten' },
    { name: 'Punta Cana', iata: 'PUJ', city: 'Punta Cana', timezone: 'America/Santo_Domingo', country: 'Dominican Republic' },
    { name: 'Bora Bora', iata: 'BOB', city: 'Bora Bora', timezone: 'Pacific/Tahiti', country: 'French Polynesia' },
    { name: 'Santorini', iata: 'JTR', city: 'Thira', timezone: 'Europe/Athens', country: 'Greece' },
    { name: 'Mykonos', iata: 'JMK', city: 'Mykonos', timezone: 'Europe/Athens', country: 'Greece' },
    { name: 'Ibiza', iata: 'IBZ', city: 'Ibiza', timezone: 'Europe/Madrid', country: 'Spain' },
    { name: 'Turks and Caicos', iata: 'PLS', city: 'Providenciales', timezone: 'America/Grand_Turk', country: 'Turks and Caicos' },
    { name: 'Maui', iata: 'OGG', city: 'Kahului', timezone: 'Pacific/Honolulu', country: 'United States' },
    { name: 'Big Island', iata: 'KOA', city: 'Kona', timezone: 'Pacific/Honolulu', country: 'United States' },
    { name: 'Bermuda', iata: 'BDA', city: 'Hamilton', timezone: 'Atlantic/Bermuda', country: 'Bermuda' },
    { name: 'St Lucia', iata: 'UVF', city: 'Vieux Fort', timezone: 'America/St_Lucia', country: 'Saint Lucia' },
    { name: 'Seychelles', iata: 'SEZ', city: 'Victoria', timezone: 'Indian/Mahe', country: 'Seychelles' },
    { name: 'Reykjavik', iata: 'KEF', city: 'Reykjavik', timezone: 'Atlantic/Reykjavik', country: 'Iceland' }
];

console.log('=== Recommended Static Mappings for Popular Vacation Destinations ===\n');
console.log('// Add to cityTimezones object in jetLagAlgorithm.ts:\n');

missingDestinations.forEach(dest => {
    console.log(`  '${dest.city}': '${dest.timezone}',  // ${dest.name} (${dest.iata}), ${dest.country}`);
});

console.log('\n// Add to airportMappings object in AddTrips.tsx:\n');

missingDestinations.forEach(dest => {
    console.log(`  '${dest.iata}': '${dest.city}',  // ${dest.name}, ${dest.country}`);
});

console.log('\n// Add to VALID_CITIES array in AddTrips.tsx:\n');

const cities = [...new Set(missingDestinations.map(d => d.city))].sort();
cities.forEach(city => {
    const dest = missingDestinations.find(d => d.city === city);
    console.log(`  '${city}',  // ${dest.name} (${dest.iata})`);
});

console.log('\n=== Summary ===');
console.log(`Total destinations: ${missingDestinations.length}`);
console.log('These are popular vacation spots that users are likely to search for.');


const cityTimezones = require('city-timezones');

function robustLookup(input) {
    if (!input) return null;
    const clean = input.trim();
    // 1. Direct
    const direct = cityTimezones.lookupViaCity(clean);
    if (direct.length > 0) return direct[0];

    // 2. ASCII/Case-Insensitive
    const lower = clean.toLowerCase();
    const cityMap = cityTimezones.cityMapping;
    const match = cityMap.find(c =>
        (c.city_ascii && c.city_ascii.toLowerCase() === lower) ||
        (c.city && c.city.toLowerCase() === lower)
    );
    return match || null;
}

console.log('San Sebastian (Input):', robustLookup('San Sebastian'));
console.log('San Sebastián (Input):', robustLookup('San Sebastián'));
console.log('SAN SEBASTIAN (Caps):', robustLookup('SAN SEBASTIAN'));
console.log('Bilbao:', robustLookup('Bilbao'));

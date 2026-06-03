
const airports = require('airport-codes');

function findCity(iata) {
    if (!iata) return null;
    // airport-codes usage
    // It's a Backbone collection in default export? 
    // Checking node_modules/airport-codes/index.js usually reveals:
    // module.exports = new Airports(); where Airports extends Backbone.Collection

    // Safety check for findWhere
    if (airports.findWhere) {
        const match = airports.findWhere({ iata: iata });
        if (match) return match.get('city');
    } else {
        // Just in case it exports array
        const list = airports.toJSON ? airports.toJSON() : airports;
        const match = list.find(a => a.iata === iata);
        if (match) return match.city;
    }
    return null;
}

console.log('EAS:', findCity('EAS'));
console.log('ZRH:', findCity('ZRH'));
console.log('JFK:', findCity('JFK'));

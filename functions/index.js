const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Config: firebase functions:config:set rapidapi.key="YOUR_KEY"
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || (functions.config().rapidapi && functions.config().rapidapi.key) || "YOUR_RAPIDAPI_KEY";
const BASE_URL = "https://aerodatabox.p.rapidapi.com/flights/number";

/**
 * lookupFlight (AeroDataBox Version)
 * Public HTTPS Endpoint
 * 
 * Query Params:
 * - flight: "UA 261" or "UA261"
 * - date: YYYY-MM-DD (Optional, defaults to today)
 */
exports.lookupFlight = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const flightNum = req.query.flight || req.body.flight;
      const date = req.query.date || req.body.date || new Date().toISOString().split('T')[0];

      if (!flightNum) {
        return res.status(400).json({ error: "Missing 'flight' parameter." });
      }

      console.log(`Looking up flight: ${flightNum} on ${date}`);

      // Map common ICAO codes to IATA (AeroDataBox prefers IATA)
      const icaoMap = {
        'UAL': 'UA', 'AAL': 'AA', 'DAL': 'DL', 'SWA': 'WN', 'BAW': 'BA',
        'AFR': 'AF', 'Lufthansa': 'LH', 'DLH': 'LH', 'VIR': 'VS', 'QFA': 'QF',
        'KAL': 'KE', 'JAL': 'JL', 'ANA': 'NH', 'UAE': 'EK', 'ANZ': 'NZ'
      };

      let cleanFlight = flightNum.replace(/\s+/g, '').toUpperCase();

      // Check if starts with 3 letters
      const airlineCode3 = cleanFlight.substring(0, 3);
      if (icaoMap[airlineCode3]) {
        cleanFlight = icaoMap[airlineCode3] + cleanFlight.substring(3);
      }

      const options = {
        method: 'GET',
        url: `${BASE_URL}/${cleanFlight}/${date}`,
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'aerodatabox.p.rapidapi.com'
        }
      };

      const response = await axios.request(options);
      const flights = response.data || [];

      if (flights.length === 0) {
        return res.status(404).json({ error: "Flight not found." });
      }

      // AeroDataBox can return multiple flights for the same flight number on the same day
      // (e.g., UA 2641 operates both DCA->TPA and EWR->LAX on Mar 6)
      console.log(`Found ${flights.length} flight(s) for ${cleanFlight} on ${date}`);

      const getTime = (point) => {
        // API returns time as nested objects: point.scheduledTime.local
        const check = (t) => (t && t.local ? t.local : null);
        return check(point.scheduledTime) ||
          check(point.actualTime) ||
          check(point.estimatedTime) ||
          check(point.runwayTime) ||
          null;
      };

      // Map all flights to our format
      const results = flights.map(f => ({
        flightNumber: f.number,
        airline: f.airline ? f.airline.name : "Unknown Airline",
        departure: {
          airport: f.departure.airport.name,
          iata: f.departure.airport.iata,
          time: getTime(f.departure),
          timezone: f.departure.airport.timeZone
        },
        arrival: {
          airport: f.arrival.airport.name,
          iata: f.arrival.airport.iata,
          time: getTime(f.arrival),
          timezone: f.arrival.airport.timeZone
        },
        status: f.status
      }));

      // If only one flight, return it directly (backward compatible)
      if (results.length === 1) {
        return res.status(200).json(results[0]);
      }

      // Multiple flights - return array with metadata
      return res.status(200).json({
        multiple: true,
        count: results.length,
        flights: results
      });

    } catch (error) {
      console.error("Internal Error:", error.response ? error.response.data : error.message);

      // Pass through 404s from upstream
      if (error.response && error.response.status === 404) {
        return res.status(404).json({ error: "Flight not found." });
      }

      return res.status(500).json({ error: error.message || "Provider error" });
    }
  });
});

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Config: firebase functions:config:set rapidapi.key="YOUR_KEY"
const RAPIDAPI_KEY = functions.config().rapidapi ? functions.config().rapidapi.key : "YOUR_RAPIDAPI_KEY";
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

      // AeroDataBox needs structured flight info passed in URL
      // Format: /flights/number/{flightNumber}/{date}
      // Note: flightNumber should be IATA (e.g. UA261)
      const cleanFlight = flightNum.replace(/\s+/g, '').toUpperCase();

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

      // AeroDataBox returns good details. Let's map the first one.
      const f = flights[0];

      const result = {
        flightNumber: f.number,
        airline: f.airline ? f.airline.name : "Unknown Airline",
        departure: {
          airport: f.departure.airport.name,
          iata: f.departure.airport.iata,
          time: f.departure.scheduledTimeLocal,
          timezone: f.departure.airport.timeZone // specific format might differ
        },
        arrival: {
          airport: f.arrival.airport.name,
          iata: f.arrival.airport.iata,
          time: f.arrival.scheduledTimeLocal,
          timezone: f.arrival.airport.timeZone
        },
        status: f.status
      };

      return res.status(200).json(result);

    } catch (error) {
      console.error("Internal Error:", error.response ? error.response.data : error.message);
      return res.status(500).json({ error: "Provider error" });
    }
  });
});

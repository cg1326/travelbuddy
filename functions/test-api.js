const axios = require('axios');

const RAPIDAPI_KEY = "aba343b647msh980ac657e41a803p1f5937jsn7c263ff36b0a";
const BASE_URL = "https://aerodatabox.p.rapidapi.com/flights/number";
const FLIGHT = "UA2029";
const DATE = "2026-01-17"; // The user's requested date

async function testApi() {
    const options = {
        method: 'GET',
        url: `${BASE_URL}/${FLIGHT}/${DATE}`,
        headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'aerodatabox.p.rapidapi.com'
        }
    };

    try {
        console.log(`Checking ${FLIGHT} on ${DATE}...`);
        const response = await axios.request(options);
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

testApi();

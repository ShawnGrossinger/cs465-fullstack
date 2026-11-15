'use strict';
/**
 * How the customer website gets trip data: by calling the public REST API,
 * as in the original design, but at a configured address instead of a URL
 * hard-coded in the controller.
 */
function createApiTripsClient(apiBaseUrl, fetchImpl = fetch) {
    return {
        async list() {
            const response = await fetchImpl(`${apiBaseUrl}/trips`, { headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`Trips API responded with ${response.status}`);
            const body = await response.json();
            if (!Array.isArray(body)) throw new Error('Trips API returned an unexpected payload');
            return body;
        },
    };
}

module.exports = { createApiTripsClient };

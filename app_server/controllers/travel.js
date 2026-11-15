'use strict';

function createTravelController(tripsClient, log) {
    return {
        // GET travel view
        async travel(req, res, next) {
            let trips = [];
            let message = null;
            try {
                trips = await tripsClient.list();
                if (!trips.length) message = 'No trips exist in our database!';
            } catch (err) {
                // Show the page with a friendly message instead of the raw error text.
                log.error('site.trips_unavailable', { message: err.message });
                message = 'Trips are temporarily unavailable. Please try again soon.';
            }
            try {
                res.render('travel', { title: 'Travlr Getaways', trips, message });
            } catch (err) {
                next(err);
            }
        },
    };
}

module.exports = { createTravelController };

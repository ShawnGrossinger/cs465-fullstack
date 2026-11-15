'use strict';
/**
 * Trip controllers: translate HTTP to service calls and back. No validation,
 * business rules, or database access lives here any more; errors thrown by
 * the service are forwarded to the central error handler.
 */
const { asyncHandler } = require('./asyncHandler');

function createTripsController(tripService) {
    return {
        // GET /api/trips
        list: asyncHandler(async (req, res) => {
            res.status(200).json(await tripService.list());
        }),

        // GET /api/trips/:tripCode -> one trip object (previously a one-element array)
        getByCode: asyncHandler(async (req, res) => {
            res.status(200).json(await tripService.getByCode(req.validated.params.tripCode));
        }),

        // POST /api/trips -> 201 Created with a Location header
        create: asyncHandler(async (req, res) => {
            const trip = await tripService.create(req.validated.body);
            res.status(201)
                .location(`${req.baseUrl}/trips/${encodeURIComponent(trip.code)}`)
                .json(trip);
        }),

        // PUT /api/trips/:tripCode -> 200 with the updated trip (previously 201 with the old one)
        update: asyncHandler(async (req, res) => {
            const trip = await tripService.update(req.validated.params.tripCode, req.validated.body);
            res.status(200).json(trip);
        }),

        // DELETE /api/trips/:tripCode -> 204 No Content
        remove: asyncHandler(async (req, res) => {
            await tripService.remove(req.validated.params.tripCode);
            res.status(204).end();
        }),
    };
}

module.exports = { createTripsController };

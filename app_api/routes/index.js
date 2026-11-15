'use strict';
/**
 * API routes. Each route reads as its security and validation pipeline:
 *
 *   rate limit -> authenticate -> requireRole -> validate -> controller
 *
 * Authentication runs before validation so an unauthenticated caller gets a
 * 401 and learns nothing about which fields the endpoint expects.
 */
const path = require('path');
const express = require('express');
const schemas = require('../validation/schemas');
const { validate } = require('../middleware/validate');

const OPENAPI_SPEC = path.join(__dirname, '..', 'openapi.yaml');

function createApiRouter({ tripsController, authController, authenticate, requireRole, rateLimiters }) {
    const router = express.Router();
    const adminOnly = [authenticate, requireRole('admin')];
    const tripCode = validate({ params: schemas.tripCodeParams });

    router.post('/login', rateLimiters.login, validate({ body: schemas.login }), authController.login);
    router.post('/register', rateLimiters.register, validate({ body: schemas.register }), authController.register);

    router.route('/trips')
        .get(tripsController.list)
        .post(...adminOnly, validate({ body: schemas.createTrip }), tripsController.create);

    router.route('/trips/:tripCode')
        .get(tripCode, tripsController.getByCode)
        .put(...adminOnly, validate({ params: schemas.tripCodeParams, body: schemas.updateTrip }), tripsController.update)
        .delete(...adminOnly, tripCode, tripsController.remove);

    // Machine-readable API documentation (OpenAPI 3).
    router.get('/openapi.yaml', (req, res) => res.type('application/yaml').sendFile(OPENAPI_SPEC));

    return router;
}

module.exports = { createApiRouter };

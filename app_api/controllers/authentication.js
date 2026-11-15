'use strict';
const { asyncHandler } = require('./asyncHandler');

function createAuthController(authService) {
    return {
        // POST /api/register -> 201 Created with a customer token
        register: asyncHandler(async (req, res) => {
            res.status(201).json(await authService.register(req.validated.body));
        }),

        // POST /api/login -> 200 with a token
        login: asyncHandler(async (req, res) => {
            res.status(200).json(await authService.login(req.validated.body));
        }),
    };
}

module.exports = { createAuthController };

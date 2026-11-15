'use strict';
/**
 * Rate limits for the authentication endpoints, to slow down password
 * guessing and mass account creation.
 */
const { rateLimit } = require('express-rate-limit');
const { TooManyRequestsError } = require('../utils/errors');

function createAuthRateLimiters({ login, register }, securityLog) {
    const handler = (event) => (req, res, next, options) => {
        securityLog.warn(event, { ip: req.ip });
        res.set('Retry-After', String(Math.ceil(options.windowMs / 1000)));
        next(new TooManyRequestsError());
    };

    return {
        // Only failed logins count, so an administrator who logs in often is never locked out.
        login: rateLimit({
            windowMs: login.windowMs,
            limit: login.limit,
            skipSuccessfulRequests: true,
            standardHeaders: 'draft-8',
            legacyHeaders: false,
            handler: handler('auth.login_rate_limited'),
        }),
        register: rateLimit({
            windowMs: register.windowMs,
            limit: register.limit,
            standardHeaders: 'draft-8',
            legacyHeaders: false,
            handler: handler('auth.register_rate_limited'),
        }),
    };
}

module.exports = { createAuthRateLimiters };

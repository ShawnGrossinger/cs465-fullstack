'use strict';
/**
 * Application assembly.
 *
 * createApp() wires the layers together (repositories -> services ->
 * controllers -> routes) and applies the cross-cutting security middleware.
 * Dependencies are passed in rather than required globally, which is what
 * lets the test suite run the real application against in-memory
 * repositories, and bin/www run it against MongoDB.
 */
const path = require('path');
const express = require('express');
const createError = require('http-errors');
const logger = require('morgan');
const hbs = require('hbs');
const helmet = require('helmet');
const cors = require('cors');

const { createPasswordService } = require('./app_api/services/passwordService');
const { createTokenService } = require('./app_api/services/tokenService');
const { createAuthService } = require('./app_api/services/authService');
const { createTripService } = require('./app_api/services/tripService');
const { createTripsController } = require('./app_api/controllers/trips');
const { createAuthController } = require('./app_api/controllers/authentication');
const { createAuthenticate, createRequireRole } = require('./app_api/middleware/auth');
const { createAuthRateLimiters } = require('./app_api/middleware/rateLimiters');
const { apiNotFound, createApiErrorHandler } = require('./app_api/middleware/errorHandler');
const { createApiRouter } = require('./app_api/routes/index');
const { createLogger } = require('./app_api/utils/logger');
const { sanitizeDescription } = require('./app_api/utils/sanitize');

const indexRouter = require('./app_server/routes/index');
const { createTravelRouter } = require('./app_server/routes/travel');
const { createApiTripsClient } = require('./app_server/clients/tripsClient');

// Handlebars setup is global to the hbs module, so it is done once.
hbs.registerPartials(path.join(__dirname, 'app_server', 'views', 'partials'));
// Trip descriptions are rendered through the same allowlist used when they are
// saved, replacing the unescaped {{{this.description}}} in travel.hbs.
hbs.registerHelper('safeDescription', (html) => new hbs.SafeString(sanitizeDescription(html)));

/**
 * @param {object} deps
 * @param {object} deps.config        result of loadConfig()
 * @param {object} deps.repositories  { trips, users } data-access objects
 * @param {object} [deps.log]         structured logger (createLogger())
 * @param {object} [deps.tripsClient] how the customer site fetches trips
 */
function createApp({ config, repositories, log = createLogger(), tripsClient } = {}) {
    if (!config || !repositories) throw new Error('createApp requires config and repositories');

    // ----- Services -----
    const passwordService = createPasswordService(config.passwords);
    const tokenService = createTokenService(config.jwt);
    const authService = createAuthService({
        userRepository: repositories.users,
        passwordService,
        tokenService,
        securityLog: log,
    });
    const tripService = createTripService({ tripRepository: repositories.trips });

    const app = express();

    // ----- Views (customer site) -----
    app.set('views', path.join(__dirname, 'app_server', 'views'));
    app.set('view engine', 'hbs');

    // ----- Cross-cutting middleware -----
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                // Only force HTTPS sub-resources when actually deployed behind HTTPS.
                upgradeInsecureRequests: config.isProduction ? [] : null,
            },
        },
    }));
    if (config.env !== 'test') app.use(logger('dev'));
    app.use(express.json({ limit: '20kb' }));
    app.use(express.urlencoded({ extended: false, limit: '20kb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    // ----- REST API -----
    app.use('/api', cors({
        origin: config.corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 600,
    }));
    app.use('/api', createApiRouter({
        tripsController: createTripsController(tripService),
        authController: createAuthController(authService),
        authenticate: createAuthenticate(tokenService),
        requireRole: createRequireRole({ userRepository: repositories.users, securityLog: log }),
        rateLimiters: createAuthRateLimiters(config.rateLimits, log),
    }));
    app.use('/api', apiNotFound);
    app.use('/api', createApiErrorHandler(log));

    // ----- Customer website -----
    app.use('/', indexRouter);
    app.use('/travel', createTravelRouter(tripsClient || createApiTripsClient(config.apiBaseUrl), log));

    app.use((req, res, next) => next(createError(404)));

    // Website error page. Details are shown only in development.
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
        const status = err.status || 500;
        if (status >= 500) log.error('site.unhandled_error', { path: req.originalUrl, message: err.message });
        res.locals.message = status < 500 ? err.message : 'Something went wrong';
        res.locals.error = config.env === 'development' ? err : {};
        res.status(status);
        res.render('error');
    });

    return app;
}

module.exports = { createApp };

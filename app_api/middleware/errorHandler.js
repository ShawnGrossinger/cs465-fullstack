'use strict';
/**
 * Central error handling for the API.
 *
 * Every error raised anywhere in the API ends up here and leaves as the same
 * JSON shape: { status, code, message, details? }. Unexpected errors are
 * logged in full on the server but reported to the client as a generic 500,
 * so stack traces and database details never reach the caller.
 */
const { AppError, ValidationError, NotFoundError } = require('../utils/errors');

function apiNotFound(req, res, next) {
    next(new NotFoundError('No such API endpoint'));
}

function createApiErrorHandler(logger) {
    // Express recognizes error handlers by their four arguments.
    // eslint-disable-next-line no-unused-vars
    return function apiErrorHandler(err, req, res, next) {
        let error = err;

        if (err && err.type === 'entity.parse.failed') {
            error = new ValidationError('Request body is not valid JSON');
        } else if (err && err.type === 'entity.too.large') {
            error = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
        } else if (!(err instanceof AppError)) {
            logger.error('api.unhandled_error', {
                method: req.method,
                path: req.originalUrl,
                message: err && err.message,
                stack: err && err.stack,
            });
            error = new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
        }

        const body = { status: error.status, code: error.code, message: error.message };
        if (error.details) body.details = error.details;
        res.status(error.status).json(body);
    };
}

module.exports = { apiNotFound, createApiErrorHandler };

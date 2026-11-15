'use strict';
/**
 * Application error types.
 *
 * Services and repositories throw these instead of writing HTTP responses.
 * The central error handler (middleware/errorHandler.js) is the only place
 * that turns an error into a status code and a JSON body, so every endpoint
 * reports failures the same way: { status, code, message, details? }.
 */
class AppError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        if (details) this.details = details;
    }
}

class ValidationError extends AppError {
    constructor(message = 'Request validation failed', details) {
        super(400, 'VALIDATION_ERROR', message, details);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(401, 'UNAUTHORIZED', message);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(403, 'FORBIDDEN', message);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, 'NOT_FOUND', message);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(409, 'CONFLICT', message);
    }
}

class TooManyRequestsError extends AppError {
    constructor(message = 'Too many attempts. Please try again later.') {
        super(429, 'RATE_LIMITED', message);
    }
}

module.exports = {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    TooManyRequestsError,
};

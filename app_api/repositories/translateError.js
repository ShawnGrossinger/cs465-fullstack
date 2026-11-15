'use strict';
const { ConflictError, ValidationError } = require('../utils/errors');

/**
 * Convert persistence-layer errors into application errors so that nothing
 * above the repository layer needs to know MongoDB's error codes.
 */
function translateError(err, conflictMessage = 'Resource already exists') {
    if (err && err.code === 11000) {
        return new ConflictError(conflictMessage);
    }
    if (err && err.name === 'ValidationError' && err.errors) {
        const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        return new ValidationError('Request validation failed', details);
    }
    if (err && err.name === 'CastError') {
        return new ValidationError('Request validation failed', [{ field: err.path, message: `invalid value for ${err.path}` }]);
    }
    return err;
}

module.exports = { translateError };

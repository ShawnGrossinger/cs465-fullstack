'use strict';

/**
 * Express 4 does not catch rejected promises from async handlers, so a thrown
 * error would leave the request hanging. This wrapper forwards it to next().
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };

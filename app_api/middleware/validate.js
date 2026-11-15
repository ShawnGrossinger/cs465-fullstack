'use strict';
const { ValidationError } = require('../utils/errors');

const OPTIONS = { abortEarly: false, stripUnknown: true, convert: true };

/**
 * Validate request parts against Joi schemas.
 *
 *   validate({ params: schemas.tripCodeParams, body: schemas.updateTrip })
 *
 * On success the cleaned values are placed on req.validated.params and
 * req.validated.body, and controllers read only from there. On failure the
 * request stops with a 400 that lists every problem field.
 */
function validate(schemas) {
    return function validateRequest(req, res, next) {
        const validated = {};
        const details = [];

        for (const part of ['params', 'body']) {
            if (!schemas[part]) continue;
            const { value, error } = schemas[part].validate(req[part] ?? {}, OPTIONS);
            if (error) {
                details.push(
                    ...error.details.map((d) => ({
                        field: d.path.join('.') || part,
                        message: d.message.replace(/"/g, ''),
                    }))
                );
            } else {
                validated[part] = value;
            }
        }

        if (details.length) return next(new ValidationError('Request validation failed', details));
        req.validated = validated;
        return next();
    };
}

module.exports = { validate };

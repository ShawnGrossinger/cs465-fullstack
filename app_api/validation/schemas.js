'use strict';
/**
 * Request schemas.
 *
 * Every write endpoint describes exactly which fields it accepts. Unknown
 * fields (for example "_id" or "role") are stripped, values are type-checked
 * and trimmed, and trip descriptions are sanitized as part of validation.
 */
const Joi = require('joi');
const { sanitizeDescription } = require('../utils/sanitize');

const TRIP_CODE = /^[A-Z0-9]{3,20}$/;
const PRICE = /^\d{1,6}(\.\d{1,2})?$/;
const IMAGE_FILE = /^[\w-]{1,80}\.(jpe?g|png|gif|webp)$/i;

const tripCode = Joi.string().trim().uppercase().pattern(TRIP_CODE).messages({
    'string.pattern.base': '{{#label}} must be 3 to 20 letters or digits',
});

const description = Joi.string().trim().min(1).max(5000).custom((value, helpers) => {
    const clean = sanitizeDescription(value);
    return clean ? clean : helpers.error('description.empty');
}).messages({
    'description.empty': '{{#label}} must contain text after unsafe HTML is removed',
});

const tripFields = {
    name: Joi.string().trim().min(1).max(100).required(),
    length: Joi.string().trim().min(1).max(50).required(),
    start: Joi.date().iso().required(),
    resort: Joi.string().trim().min(1).max(100).required(),
    perPerson: Joi.string().trim().pattern(PRICE).required().messages({
        'string.pattern.base': '{{#label}} must be a price such as 799 or 799.00',
    }),
    image: Joi.string().trim().pattern(IMAGE_FILE).required().messages({
        'string.pattern.base': '{{#label}} must be an image file name such as reef1.jpg',
    }),
    description: description.required(),
};

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254);

module.exports = {
    tripCodeParams: Joi.object({ tripCode: tripCode.required() }),

    // POST creates a whole trip.
    createTrip: Joi.object({ code: tripCode.required(), ...tripFields }),

    // PUT replaces a whole trip; the code comes from the URL and may be repeated in the body.
    updateTrip: Joi.object({ code: tripCode, ...tripFields }),

    login: Joi.object({
        email: email.required(),
        // Upper bound keeps an attacker from forcing very expensive hashing work.
        password: Joi.string().min(1).max(1024).required(),
    }),

    register: Joi.object({
        name: Joi.string().trim().min(1).max(100).required(),
        email: email.required(),
        password: Joi.string().min(12).max(128).required(),
    }),
};

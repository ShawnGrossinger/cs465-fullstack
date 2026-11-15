'use strict';
/**
 * Trip business rules. Knows nothing about HTTP or MongoDB: it receives
 * validated data, applies the rules, and throws application errors.
 */
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');

function createTripService({ tripRepository }) {
    const notFound = (code) => new NotFoundError(`Trip ${code} not found`);

    return {
        list() {
            return tripRepository.findAll();
        },

        async getByCode(code) {
            const trip = await tripRepository.findByCode(code);
            if (!trip) throw notFound(code);
            return trip;
        },

        async create(data) {
            // Friendly early check. The unique index added in the database
            // enhancement will close the race between two simultaneous creates.
            if (await tripRepository.findByCode(data.code)) {
                throw new ConflictError(`Trip ${data.code} already exists`);
            }
            return tripRepository.create(data);
        },

        async update(code, data) {
            const { code: bodyCode, ...changes } = data;
            if (bodyCode !== undefined && bodyCode !== code) {
                throw new ValidationError('Trip code cannot be changed', [
                    { field: 'code', message: 'code must match the trip code in the URL' },
                ]);
            }
            const trip = await tripRepository.updateByCode(code, changes);
            if (!trip) throw notFound(code);
            return trip;
        },

        async remove(code) {
            const deleted = await tripRepository.deleteByCode(code);
            if (!deleted) throw notFound(code);
        },
    };
}

module.exports = { createTripService };

'use strict';
/**
 * Data-access layer for trips.
 *
 * This is the only module that talks to the trips collection. It returns
 * plain objects (never Mongoose documents) so services and controllers do not
 * depend on Mongoose, and so tests can swap in an in-memory implementation
 * with the same five methods.
 */
const { translateError } = require('./translateError');

const TRIP_FIELDS = ['code', 'name', 'length', 'start', 'resort', 'perPerson', 'image', 'description'];

function toTrip(doc) {
    const trip = { _id: String(doc._id) };
    for (const field of TRIP_FIELDS) trip[field] = doc[field];
    return trip;
}

function createTripRepository(TripModel) {
    return {
        async findAll() {
            const docs = await TripModel.find({}).sort({ _id: 1 }).lean();
            return docs.map(toTrip);
        },

        async findByCode(code) {
            const doc = await TripModel.findOne({ code: String(code) }).lean();
            return doc ? toTrip(doc) : null;
        },

        async create(data) {
            try {
                const doc = await TripModel.create(data);
                return toTrip(doc.toObject());
            } catch (err) {
                throw translateError(err, `Trip ${data.code} already exists`);
            }
        },

        // Returns the updated trip, or null if no trip has that code.
        async updateByCode(code, changes) {
            try {
                const doc = await TripModel.findOneAndUpdate(
                    { code: String(code) },
                    { $set: changes },
                    { returnDocument: 'after', runValidators: true }
                ).lean();
                return doc ? toTrip(doc) : null;
            } catch (err) {
                throw translateError(err);
            }
        },

        // Returns true if a trip was deleted.
        async deleteByCode(code) {
            const result = await TripModel.deleteOne({ code: String(code) });
            return result.deletedCount > 0;
        },
    };
}

module.exports = { createTripRepository, TRIP_FIELDS };

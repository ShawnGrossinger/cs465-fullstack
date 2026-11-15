'use strict';
/**
 * In-memory repositories with the same contract as the MongoDB ones in
 * app_api/repositories. Because the application receives its repositories as
 * a dependency, the API tests run the real routes, middleware, controllers,
 * and services without needing a database server.
 */
const crypto = require('crypto');
const { ConflictError } = require('../../app_api/utils/errors');
const { TRIP_FIELDS } = require('../../app_api/repositories/tripRepository');

const newId = () => crypto.randomBytes(12).toString('hex'); // looks like an ObjectId
const clone = (o) => (o ? structuredClone(o) : null);

function pickTrip(data, existing = {}) {
    const trip = { ...existing };
    for (const field of TRIP_FIELDS) if (data[field] !== undefined) trip[field] = data[field];
    if (trip.start instanceof Date) trip.start = new Date(trip.start);
    return trip;
}

function createMemoryTripRepository(seed = []) {
    const trips = seed.map((t) => ({ _id: newId(), ...pickTrip(t) }));
    return {
        all: () => trips.map(clone), // test helper
        async findAll() { return trips.map(clone); },
        async findByCode(code) { return clone(trips.find((t) => t.code === code)); },
        async create(data) {
            const trip = { _id: newId(), ...pickTrip(data) };
            trips.push(trip);
            return clone(trip);
        },
        async updateByCode(code, changes) {
            const i = trips.findIndex((t) => t.code === code);
            if (i < 0) return null;
            trips[i] = { _id: trips[i]._id, ...pickTrip(changes, trips[i]) };
            return clone(trips[i]);
        },
        async deleteByCode(code) {
            const i = trips.findIndex((t) => t.code === code);
            if (i < 0) return false;
            trips.splice(i, 1);
            return true;
        },
    };
}

function createMemoryUserRepository() {
    const users = [];
    const sameEmail = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    return {
        all: () => users.map(clone), // test helper
        async findByEmail(email) { return clone(users.find((u) => sameEmail(u.email, email))); },
        async findById(id) { return clone(users.find((u) => u.id === id)); },
        async create(data) {
            if (users.some((u) => sameEmail(u.email, data.email))) {
                throw new ConflictError('An account with that email already exists');
            }
            const user = { id: newId(), role: 'customer', ...data, email: String(data.email).toLowerCase() };
            users.push(user);
            return clone(user);
        },
        async updatePassword(id, { hash, salt, iterations }) {
            const user = users.find((u) => u.id === id);
            if (user) Object.assign(user, { hash, salt, iterations });
        },
        async setRole(id, role) {
            const user = users.find((u) => u.id === id);
            if (user) user.role = role;
        },
        // test helper: insert a raw record (e.g. a legacy account)
        insertRaw(record) {
            const user = { id: newId(), ...record };
            users.push(user);
            return clone(user);
        },
    };
}

module.exports = { createMemoryTripRepository, createMemoryUserRepository };

'use strict';
const Trip = require('../models/travlr');
const User = require('../models/user');
const { createTripRepository } = require('./tripRepository');
const { createUserRepository } = require('./userRepository');

/** The MongoDB-backed repositories used by the running server. */
function createMongoRepositories() {
    return {
        trips: createTripRepository(Trip),
        users: createUserRepository(User),
    };
}

module.exports = { createMongoRepositories };

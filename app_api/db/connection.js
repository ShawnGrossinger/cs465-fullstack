'use strict';
/**
 * MongoDB connection management (replaces models/db.js).
 *
 * Unlike the original module, this one does not connect as a side effect of
 * being required: the server decides when to connect, and the tests can load
 * the application without a database at all.
 */
const mongoose = require('mongoose');

// Hide credentials if the connection string contains any.
function redact(uri) {
    return String(uri).replace(/\/\/[^@/]+@/, '//***@');
}

async function connect(uri, logger = console) {
    const conn = mongoose.connection;
    conn.on('connected', () => logger.log(`Mongoose connected to ${redact(uri)}`));
    conn.on('error', (err) => logger.error(`Mongoose connection error: ${err.message}`));
    conn.on('disconnected', () => logger.log('Mongoose disconnected'));

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    return conn;
}

async function disconnect() {
    await mongoose.connection.close();
}

module.exports = { connect, disconnect, redact };

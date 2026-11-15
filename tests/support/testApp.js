'use strict';
/**
 * Build the real Travlr application for tests, backed by in-memory repositories.
 */
const { loadConfig } = require('../../app_api/config');
const { createApp } = require('../../app');
const { createPasswordService } = require('../../app_api/services/passwordService');
const { createTokenService } = require('../../app_api/services/tokenService');
const { createMemoryTripRepository, createMemoryUserRepository } = require('./memoryRepositories');
const seedTrips = require('../../data/trips.json');

const TEST_ENV = Object.freeze({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters',
    PBKDF2_ITERATIONS: '2000', // full strength is tested in passwordService.test.js
    CORS_ORIGINS: 'http://localhost:4200',
    LOGIN_RATE_LIMIT: '1000',
    REGISTER_RATE_LIMIT: '1000',
});

const STRONG_PASSWORD = 'correct-horse-battery-staple';

function buildTestApp({ env = {}, trips = seedTrips, repositories = {}, tripsClient } = {}) {
    const config = loadConfig({ ...TEST_ENV, ...env });
    const repos = {
        trips: repositories.trips || createMemoryTripRepository(trips),
        users: repositories.users || createMemoryUserRepository(),
    };
    const logs = [];
    const log = {
        info: (event, data) => logs.push({ level: 'info', event, ...data }),
        warn: (event, data) => logs.push({ level: 'warn', event, ...data }),
        error: (event, data) => logs.push({ level: 'error', event, ...data }),
    };
    const app = createApp({ config, repositories: repos, log, tripsClient });

    const passwords = createPasswordService(config.passwords);
    const tokens = createTokenService(config.jwt);

    /** Create a user directly in the repository and return it with a valid token. */
    async function createUser({ role = 'customer', email = `${role}-${Math.random().toString(36).slice(2)}@travlr.test`, password = STRONG_PASSWORD, name = `Test ${role}` } = {}) {
        const user = await repos.users.create({ name, email, role, ...(await passwords.hash(password)) });
        return { ...user, password, token: tokens.issue(user) };
    }

    return { app, config, repositories: repos, logs, createUser, tokens, passwords };
}

/** A complete, valid trip body for POST/PUT requests. */
function validTrip(overrides = {}) {
    return {
        code: 'TEST260101',
        name: 'Test Reef',
        length: '3 nights / 4 days',
        start: '2026-01-01',
        resort: 'Test Bay, 4 stars',
        perPerson: '1299.00',
        image: 'reef1.jpg',
        description: '<p>A <strong>test</strong> trip.</p>',
        ...overrides,
    };
}

module.exports = { buildTestApp, validTrip, TEST_ENV, STRONG_PASSWORD };

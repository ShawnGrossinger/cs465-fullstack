'use strict';
/**
 * Password hashing and verification.
 *
 * - PBKDF2-HMAC-SHA512 with a per-user random salt (same algorithm as before,
 *   so existing hashes stay valid).
 * - The work factor comes from config and defaults to OWASP's 220,000
 *   iterations; the original code used 1,000.
 * - Hashing runs through the asynchronous crypto.pbkdf2, which uses libuv's
 *   thread pool. The synchronous version used before would block Node's
 *   single event loop for every login at the higher work factor.
 * - Comparison uses crypto.timingSafeEqual instead of ===, so response time
 *   does not reveal how many leading characters of a hash matched.
 */
const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);

const KEY_LENGTH = 64;
const DIGEST = 'sha512';
const LEGACY_ITERATIONS = 1000; // work factor of accounts created before this change

function createPasswordService({ iterations }) {
    // Used when the email is unknown, so a login attempt costs the same time
    // whether or not the account exists (prevents account enumeration by timing).
    const dummyRecord = {
        salt: crypto.randomBytes(16).toString('hex'),
        hash: '00'.repeat(KEY_LENGTH),
        iterations,
    };

    const derive = (password, salt, iters) => pbkdf2(String(password), salt, iters, KEY_LENGTH, DIGEST);
    const iterationsOf = (record) => record.iterations || LEGACY_ITERATIONS;

    return {
        currentIterations: iterations,

        async hash(password) {
            const salt = crypto.randomBytes(16).toString('hex');
            const key = await derive(password, salt, iterations);
            return { salt, hash: key.toString('hex'), iterations };
        },

        /** True only if record exists and the password matches it. */
        async verify(password, record) {
            const target = record && record.salt && record.hash ? record : dummyRecord;
            const candidate = await derive(password, target.salt, iterationsOf(target));
            const stored = Buffer.from(target.hash, 'hex');
            const matches = stored.length === candidate.length && crypto.timingSafeEqual(candidate, stored);
            return target !== dummyRecord && matches;
        },

        /** True if the stored hash was made with a weaker work factor than the current one. */
        needsRehash(record) {
            return iterationsOf(record) < iterations;
        },
    };
}

module.exports = { createPasswordService, LEGACY_ITERATIONS };

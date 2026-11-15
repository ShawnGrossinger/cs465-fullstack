'use strict';
/**
 * Central configuration.
 *
 * Every setting the application reads from the environment is loaded,
 * defaulted, and validated here, once, at startup. The rest of the code
 * receives a frozen config object instead of reading process.env directly,
 * so a missing or unsafe setting stops the server immediately with a clear
 * message instead of failing later in the middle of a request.
 */
const Joi = require('joi');

// OWASP Password Storage Cheat Sheet: minimum work factor for PBKDF2-HMAC-SHA512.
const OWASP_MIN_PBKDF2_SHA512 = 220000;

const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().port().default(3000),

    JWT_SECRET: Joi.string().min(32).required().messages({
        'any.required': 'JWT_SECRET is required (generate one with: openssl rand -hex 32)',
        'string.min': 'JWT_SECRET must be at least 32 characters long',
    }),
    JWT_EXPIRES_IN: Joi.string().default('1h'),

    // Either a full connection string or just a host (kept for backward compatibility).
    MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }),
    DB_HOST: Joi.string().default('127.0.0.1'),

    // Comma-separated list of browser origins allowed to call the API.
    CORS_ORIGINS: Joi.string().default('http://localhost:4200'),
    // Where the customer site fetches trip data from.
    API_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }),

    PBKDF2_ITERATIONS: Joi.number().integer().min(1000).default(OWASP_MIN_PBKDF2_SHA512),

    LOGIN_RATE_LIMIT: Joi.number().integer().min(1).default(10),
    LOGIN_RATE_WINDOW_MINUTES: Joi.number().positive().default(15),
    REGISTER_RATE_LIMIT: Joi.number().integer().min(1).default(5),
    REGISTER_RATE_WINDOW_MINUTES: Joi.number().positive().default(60),
}).unknown(true); // the environment contains many unrelated variables

/**
 * Build a validated, immutable configuration object from an environment map.
 * Tests pass their own map; the server passes process.env.
 */
function loadConfig(env = process.env) {
    const { value, error } = envSchema.validate(env, { abortEarly: false, convert: true });
    if (error) {
        const problems = error.details.map((d) => `  - ${d.message.replace(/"/g, '')}`).join('\n');
        throw new Error(`Invalid configuration:\n${problems}`);
    }

    // Weakened password hashing is only acceptable inside the automated test suite,
    // where a full-strength work factor would make every test take seconds.
    if (value.NODE_ENV !== 'test' && value.PBKDF2_ITERATIONS < OWASP_MIN_PBKDF2_SHA512) {
        throw new Error(
            `Invalid configuration:\n  - PBKDF2_ITERATIONS must be at least ${OWASP_MIN_PBKDF2_SHA512} outside of tests`
        );
    }

    const port = value.PORT;
    return deepFreeze({
        env: value.NODE_ENV,
        isProduction: value.NODE_ENV === 'production',
        port,
        jwt: {
            secret: value.JWT_SECRET,
            expiresIn: value.JWT_EXPIRES_IN,
            issuer: 'travlr-api',
            audience: 'travlr',
        },
        db: {
            uri: value.MONGODB_URI || `mongodb://${value.DB_HOST}/travlr`,
        },
        corsOrigins: value.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
        apiBaseUrl: (value.API_BASE_URL || `http://localhost:${port}/api`).replace(/\/+$/, ''),
        passwords: {
            iterations: value.PBKDF2_ITERATIONS,
        },
        rateLimits: {
            login: {
                limit: value.LOGIN_RATE_LIMIT,
                windowMs: value.LOGIN_RATE_WINDOW_MINUTES * 60 * 1000,
            },
            register: {
                limit: value.REGISTER_RATE_LIMIT,
                windowMs: value.REGISTER_RATE_WINDOW_MINUTES * 60 * 1000,
            },
        },
    });
}

/** Load .env (if present) into process.env, then build the config from it. */
function loadConfigFromEnvironment() {
    require('dotenv').config({ quiet: true });
    return loadConfig(process.env);
}

function deepFreeze(obj) {
    Object.values(obj).forEach((v) => {
        if (v && typeof v === 'object') deepFreeze(v);
    });
    return Object.freeze(obj);
}

module.exports = { loadConfig, loadConfigFromEnvironment, OWASP_MIN_PBKDF2_SHA512 };

'use strict';
const { loadConfig, OWASP_MIN_PBKDF2_SHA512 } = require('../../app_api/config');
const { createPasswordService, LEGACY_ITERATIONS } = require('../../app_api/services/passwordService');
const { sanitizeDescription } = require('../../app_api/utils/sanitize');

describe('configuration', () => {
    const base = { JWT_SECRET: 'x'.repeat(32) };

    test('defaults are safe', () => {
        const config = loadConfig(base);
        expect(config.passwords.iterations).toBe(OWASP_MIN_PBKDF2_SHA512);
        expect(config.corsOrigins).toEqual(['http://localhost:4200']);
        expect(config.db.uri).toBe('mongodb://127.0.0.1/travlr');
        expect(Object.isFrozen(config.jwt)).toBe(true);
    });

    test('refuses to start without a JWT secret', () => {
        expect(() => loadConfig({})).toThrow(/JWT_SECRET is required/);
    });

    test('refuses a short JWT secret', () => {
        expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow(/at least 32 characters/);
    });

    test('refuses a weak password work factor outside of tests', () => {
        expect(() => loadConfig({ ...base, PBKDF2_ITERATIONS: '1000' })).toThrow(/PBKDF2_ITERATIONS/);
        expect(() => loadConfig({ ...base, NODE_ENV: 'test', PBKDF2_ITERATIONS: '1000' })).not.toThrow();
    });

    test('reads a comma-separated CORS allowlist', () => {
        const config = loadConfig({ ...base, CORS_ORIGINS: 'http://a.test, http://b.test' });
        expect(config.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
    });
});

describe('password service', () => {
    // Full production strength, to prove the real setting works end to end.
    const passwords = createPasswordService({ iterations: OWASP_MIN_PBKDF2_SHA512 });

    test('hashes with a random salt and the configured work factor', async () => {
        const a = await passwords.hash('same password');
        const b = await passwords.hash('same password');
        expect(a.iterations).toBe(220000);
        expect(a.salt).not.toBe(b.salt);
        expect(a.hash).not.toBe(b.hash);
    });

    test('verifies the right password and rejects the wrong one', async () => {
        const record = await passwords.hash('right password');
        await expect(passwords.verify('right password', record)).resolves.toBe(true);
        await expect(passwords.verify('wrong password', record)).resolves.toBe(false);
    });

    test('an unknown account (null record) never verifies', async () => {
        await expect(passwords.verify('anything', null)).resolves.toBe(false);
    });

    test('hashing does not block the event loop', async () => {
        let ticks = 0;
        const timer = setInterval(() => { ticks += 1; }, 1);
        await passwords.hash('password');
        clearInterval(timer);
        expect(ticks).toBeGreaterThan(0); // timers kept firing while hashing ran
    });

    test('accounts hashed by the original code still verify and are flagged for rehash', async () => {
        const legacy = await createPasswordService({ iterations: LEGACY_ITERATIONS }).hash('old password');
        delete legacy.iterations;
        await expect(passwords.verify('old password', legacy)).resolves.toBe(true);
        expect(passwords.needsRehash(legacy)).toBe(true);
        expect(passwords.needsRehash(await passwords.hash('new'))).toBe(false);
    });
});

describe('description sanitizer', () => {
    test.each([
        ['<script>alert(1)</script><p>hi</p>', '<p>hi</p>'],
        ['<p onclick="x()">hi</p>', '<p>hi</p>'],
        ['<img src=x onerror=alert(1)>', ''],
        ['<a href="javascript:alert(1)">click</a>', 'click'],
        ['<p style="background:url(evil)">hi</p>', '<p>hi</p>'],
        ['<ul><li><strong>a</strong></li><li><em>b</em></li></ul>', '<ul><li><strong>a</strong></li><li><em>b</em></li></ul>'],
        ['<svg><script>alert(1)</script></svg>text', 'text'],
    ])('%s -> %s', (input, expected) => {
        expect(sanitizeDescription(input)).toBe(expected);
    });
});

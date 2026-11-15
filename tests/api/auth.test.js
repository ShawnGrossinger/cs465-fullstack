'use strict';
/**
 * Registration and login.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildTestApp, STRONG_PASSWORD } = require('../support/testApp');
const { createPasswordService } = require('../../app_api/services/passwordService');

const decode = (token) => jwt.decode(token);

describe('POST /api/register', () => {
    let ctx;
    beforeEach(() => { ctx = buildTestApp(); });

    test('creates a customer account and returns 201 with a token', async () => {
        const res = await request(ctx.app).post('/api/register')
            .send({ name: 'Ada', email: 'Ada@Example.com ', password: STRONG_PASSWORD });
        expect(res.status).toBe(201);
        expect(decode(res.body.token)).toMatchObject({ email: 'ada@example.com', role: 'customer' });
    });

    test('a caller cannot register themselves as an admin', async () => {
        const res = await request(ctx.app).post('/api/register')
            .send({ name: 'Mallory', email: 'mallory@example.com', password: STRONG_PASSWORD, role: 'admin' });
        expect(res.status).toBe(201);
        expect(decode(res.body.token).role).toBe('customer');
        expect((await ctx.repositories.users.findByEmail('mallory@example.com')).role).toBe('customer');
    });

    test('passwords are never stored in plain text', async () => {
        await request(ctx.app).post('/api/register').send({ name: 'Ada', email: 'ada@example.com', password: STRONG_PASSWORD });
        const [user] = ctx.repositories.users.all();
        expect(JSON.stringify(user)).not.toContain(STRONG_PASSWORD);
        expect(user.hash).toHaveLength(128);
        expect(user.iterations).toBe(ctx.config.passwords.iterations);
    });

    test('a duplicate email returns 409', async () => {
        await ctx.createUser({ email: 'ada@example.com' });
        const res = await request(ctx.app).post('/api/register')
            .send({ name: 'Ada', email: 'ADA@example.com', password: STRONG_PASSWORD });
        expect(res.status).toBe(409);
    });

    test('weak or missing fields return 400 with details', async () => {
        const res = await request(ctx.app).post('/api/register').send({ email: 'not-an-email', password: 'short' });
        expect(res.status).toBe(400);
        expect(res.body.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
    });
});

describe('POST /api/login', () => {
    let ctx;
    let user;
    beforeEach(async () => {
        ctx = buildTestApp();
        user = await ctx.createUser({ role: 'admin', email: 'admin@travlr.test' });
    });

    test('valid credentials return 200 and a token with the account role', async () => {
        const res = await request(ctx.app).post('/api/login').send({ email: 'admin@travlr.test', password: user.password });
        expect(res.status).toBe(200);
        const claims = decode(res.body.token);
        expect(claims).toMatchObject({ sub: user.id, role: 'admin', iss: 'travlr-api', aud: 'travlr' });
        expect(claims.exp - claims.iat).toBe(3600);
    });

    test('email matching is case-insensitive', async () => {
        const res = await request(ctx.app).post('/api/login').send({ email: 'ADMIN@travlr.test', password: user.password });
        expect(res.status).toBe(200);
    });

    test('a wrong password and an unknown email get the same 401 response', async () => {
        const wrongPassword = await request(ctx.app).post('/api/login').send({ email: 'admin@travlr.test', password: 'wrong' });
        const unknownEmail = await request(ctx.app).post('/api/login').send({ email: 'nobody@travlr.test', password: 'wrong' });
        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.body).toEqual(unknownEmail.body);
        expect(ctx.logs.filter((l) => l.event === 'auth.login_failed')).toHaveLength(2);
    });

    test('query-operator injection in the email field is rejected', async () => {
        const res = await request(ctx.app).post('/api/login').send({ email: { $ne: null }, password: 'x' });
        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('email');
    });

    test('an overly long password is rejected before any hashing work', async () => {
        const res = await request(ctx.app).post('/api/login').send({ email: 'admin@travlr.test', password: 'a'.repeat(5000) });
        expect(res.status).toBe(400);
    });

    test('a legacy 1,000-iteration hash is upgraded on the next successful login', async () => {
        // Simulate an account created by the original code.
        const legacy = createPasswordService({ iterations: 1000 });
        const record = await legacy.hash('old-but-valid-password');
        delete record.iterations; // the original schema had no iterations field
        const old = ctx.repositories.users.insertRaw({ name: 'Old Admin', email: 'old@travlr.test', role: 'admin', ...record });

        const res = await request(ctx.app).post('/api/login').send({ email: 'old@travlr.test', password: 'old-but-valid-password' });
        expect(res.status).toBe(200);

        const upgraded = await ctx.repositories.users.findById(old.id);
        expect(upgraded.iterations).toBe(ctx.config.passwords.iterations);
        expect(upgraded.hash).not.toBe(record.hash);
        expect(upgraded.salt).not.toBe(record.salt);

        // and the account still works afterwards
        const again = await request(ctx.app).post('/api/login').send({ email: 'old@travlr.test', password: 'old-but-valid-password' });
        expect(again.status).toBe(200);
    });
});

describe('rate limiting', () => {
    test('repeated failed logins from one address are blocked with 429', async () => {
        const ctx = buildTestApp({ env: { LOGIN_RATE_LIMIT: '3' } });
        await ctx.createUser({ email: 'admin@travlr.test' });
        const attempt = () => request(ctx.app).post('/api/login').send({ email: 'admin@travlr.test', password: 'guess' });

        for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
        const blocked = await attempt();
        expect(blocked.status).toBe(429);
        expect(blocked.body.code).toBe('RATE_LIMITED');
        expect(blocked.headers['retry-after']).toBeDefined();
    });

    test('successful logins do not count toward the limit', async () => {
        const ctx = buildTestApp({ env: { LOGIN_RATE_LIMIT: '2' } });
        const user = await ctx.createUser({ email: 'admin@travlr.test' });
        for (let i = 0; i < 5; i++) {
            const res = await request(ctx.app).post('/api/login').send({ email: 'admin@travlr.test', password: user.password });
            expect(res.status).toBe(200);
        }
    });

    test('registration is rate limited', async () => {
        const ctx = buildTestApp({ env: { REGISTER_RATE_LIMIT: '2' } });
        const register = (n) => request(ctx.app).post('/api/register')
            .send({ name: 'Bot', email: `bot${n}@example.com`, password: STRONG_PASSWORD });
        expect((await register(1)).status).toBe(201);
        expect((await register(2)).status).toBe(201);
        expect((await register(3)).status).toBe(429);
    });
});

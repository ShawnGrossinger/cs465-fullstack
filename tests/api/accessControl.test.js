'use strict';
/**
 * Access control on the trip write endpoints.
 *
 * Before this enhancement, any registered account could create, edit, and
 * delete trips. These tests pin down the new rule: only administrators can.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildTestApp, validTrip, TEST_ENV } = require('../support/testApp');

const WRITE_ROUTES = [
    ['post', '/api/trips', validTrip()],
    ['put', '/api/trips/GALR210214', validTrip({ code: 'GALR210214' })],
    ['delete', '/api/trips/GALR210214', undefined],
];

describe('trip write endpoints: access control', () => {
    let ctx;
    beforeEach(() => { ctx = buildTestApp(); });

    test.each(WRITE_ROUTES)('%s %s without a token returns 401', async (method, url, body) => {
        const res = await request(ctx.app)[method](url).send(body);
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    });

    test.each(WRITE_ROUTES)('%s %s with a malformed Authorization header returns 401', async (method, url, body) => {
        const res = await request(ctx.app)[method](url).set('Authorization', 'Token abc').send(body);
        expect(res.status).toBe(401);
    });

    test('a token signed with the wrong secret is rejected', async () => {
        const forged = jwt.sign({ role: 'admin', sub: 'x' }, 'not-the-real-secret-not-the-real-secret', {
            issuer: 'travlr-api', audience: 'travlr', expiresIn: '1h',
        });
        const res = await request(ctx.app).post('/api/trips').set('Authorization', `Bearer ${forged}`).send(validTrip());
        expect(res.status).toBe(401);
    });

    test('an expired token is rejected', async () => {
        const admin = await ctx.createUser({ role: 'admin' });
        const expired = jwt.sign({ role: 'admin' }, TEST_ENV.JWT_SECRET, {
            subject: admin.id, issuer: 'travlr-api', audience: 'travlr', expiresIn: -10,
        });
        const res = await request(ctx.app).post('/api/trips').set('Authorization', `Bearer ${expired}`).send(validTrip());
        expect(res.status).toBe(401);
    });

    test('an unsigned ("alg: none") token is rejected', async () => {
        const unsigned = jwt.sign({ role: 'admin', sub: 'x' }, null, { algorithm: 'none', issuer: 'travlr-api', audience: 'travlr' });
        const res = await request(ctx.app).post('/api/trips').set('Authorization', `Bearer ${unsigned}`).send(validTrip());
        expect(res.status).toBe(401);
    });

    test.each(WRITE_ROUTES)('%s %s with a customer token returns 403 and changes nothing', async (method, url, body) => {
        const customer = await ctx.createUser({ role: 'customer' });
        const before = ctx.repositories.trips.all();

        const res = await request(ctx.app)[method](url).set('Authorization', `Bearer ${customer.token}`).send(body);

        expect(res.status).toBe(403);
        expect(res.body.code).toBe('FORBIDDEN');
        expect(ctx.repositories.trips.all()).toEqual(before);
        expect(ctx.logs).toContainEqual(expect.objectContaining({ event: 'authz.denied', userId: customer.id }));
    });

    test('a customer who edits their token payload to say admin is still rejected', async () => {
        // Re-signing is impossible without the secret, so the only option is tampering,
        // which breaks the signature.
        const customer = await ctx.createUser({ role: 'customer' });
        const [header, , signature] = customer.token.split('.');
        const payload = Buffer.from(JSON.stringify({ sub: customer.id, role: 'admin', iss: 'travlr-api', aud: 'travlr' })).toString('base64url');
        const res = await request(ctx.app).delete('/api/trips/GALR210214').set('Authorization', `Bearer ${header}.${payload}.${signature}`);
        expect(res.status).toBe(401);
    });

    test('an admin who is demoted loses access immediately, even with an unexpired token', async () => {
        const admin = await ctx.createUser({ role: 'admin' });
        await ctx.repositories.users.setRole(admin.id, 'customer');

        const res = await request(ctx.app).delete('/api/trips/GALR210214').set('Authorization', `Bearer ${admin.token}`);
        expect(res.status).toBe(403);
    });

    test('authentication is checked before validation (no schema details leak to anonymous callers)', async () => {
        const res = await request(ctx.app).post('/api/trips').send({ nonsense: true });
        expect(res.status).toBe(401);
        expect(res.body.details).toBeUndefined();
    });

    test('reads stay public', async () => {
        const res = await request(ctx.app).get('/api/trips');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

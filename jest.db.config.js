// Database integration tests: these run against a real MongoDB server.
// Set MONGO_TEST_URI or start MongoDB locally (see README, "Running the tests").
module.exports = {
    ...require('./tests/support/jest.shared'),
    roots: ['<rootDir>/tests/db'],
    testTimeout: 30000,
};

// Default test run: no database required. The application receives its
// repositories as a dependency, so these tests run the real routes,
// middleware, and services against in-memory repositories.
// Database tests live in tests/db and run with `npm run test:db`.
module.exports = {
    ...require('./tests/support/jest.shared'),
    roots: ['<rootDir>/tests'],
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/db/'],
    collectCoverageFrom: ['app.js', 'app_api/**/*.js', 'app_server/**/*.js', '!app_api/models/seed.js'],
};

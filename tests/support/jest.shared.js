// Settings shared by jest.config.js (no database) and jest.db.config.js (MongoDB).

// sanitize-html 2.18+ depends on an HTML parser that is published only as
// ES modules. Node loads it natively, but Jest's module loader does not (before
// Node 24.9), so Jest transpiles just those packages to CommonJS.
const ESM_ONLY = ['htmlparser2', 'domhandler', 'domutils', 'dom-serializer', 'domelementtype', 'entities'];

module.exports = {
    testEnvironment: 'node',
    transform: {
        '\\.m?js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
    },
    transformIgnorePatterns: [`/node_modules/(?!(${ESM_ONLY.join('|')})/)`],
};

#!/usr/bin/env node
'use strict';
/**
 * Create an administrator account, or promote an existing account.
 *
 * Administrators can no longer be created through the public /api/register
 * endpoint, which only makes customer accounts. Run this on the server:
 *
 *   npm run create-admin -- --email admin@example.com --name "Site Admin"
 *   npm run create-admin -- --email existing@example.com --promote
 *
 * The password is typed at a hidden prompt (it never appears in shell history),
 * or read from the ADMIN_PASSWORD environment variable for automated setups.
 */
const readline = require('readline');
const Joi = require('joi');

const { loadConfigFromEnvironment } = require('../app_api/config');
const { connect, disconnect } = require('../app_api/db/connection');
const { createMongoRepositories } = require('../app_api/repositories');
const { createPasswordService } = require('../app_api/services/passwordService');
const schemas = require('../app_api/validation/schemas');

function parseArgs(argv) {
    const args = { promote: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--promote') args.promote = true;
        else if (arg === '--email') args.email = argv[++i];
        else if (arg === '--name') args.name = argv[++i];
        else if (arg === '--help' || arg === '-h') args.help = true;
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return args;
}

function promptHidden(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl._writeToOutput = (text) => {
            // Echo the prompt itself but nothing that is typed after it.
            if (text.includes(question)) rl.output.write(text);
        };
        rl.question(question, (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
    });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || !args.email) {
        console.log('Usage: npm run create-admin -- --email <email> [--name "<name>"] [--promote]');
        process.exit(args.help ? 0 : 1);
    }

    const config = loadConfigFromEnvironment();
    await connect(config.db.uri, { log: () => {}, error: console.error });
    const { users } = createMongoRepositories();

    try {
        const email = Joi.attempt(args.email, schemas.register.extract('email'));
        const existing = await users.findByEmail(email);

        if (existing) {
            if (!args.promote) {
                throw new Error(`${email} already exists. Re-run with --promote to make it an administrator.`);
            }
            await users.setRole(existing.id, 'admin');
            console.log(`${existing.email} is now an administrator.`);
            return;
        }

        const name = Joi.attempt(args.name || 'Administrator', schemas.register.extract('name'));
        const password = process.env.ADMIN_PASSWORD || (await promptHidden('Password (12+ characters): '));
        Joi.assert(password, schemas.register.extract('password'), 'Password');

        const passwords = createPasswordService(config.passwords);
        const user = await users.create({ name, email, role: 'admin', ...(await passwords.hash(password)) });
        console.log(`Created administrator ${user.email}.`);
    } finally {
        await disconnect();
    }
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});

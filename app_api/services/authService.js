'use strict';
/**
 * Account registration and login rules.
 */
const { ConflictError, UnauthorizedError } = require('../utils/errors');

const LOGIN_FAILED = 'Incorrect email or password';

function createAuthService({ userRepository, passwordService, tokenService, securityLog }) {
    return {
        /**
         * Public registration always creates a customer. The role is set here,
         * never taken from the request, so a caller cannot register as an admin.
         */
        async register({ name, email, password }) {
            if (await userRepository.findByEmail(email)) {
                throw new ConflictError('An account with that email already exists');
            }
            const credentials = await passwordService.hash(password);
            const user = await userRepository.create({ name, email, role: 'customer', ...credentials });
            securityLog.info('auth.registered', { userId: user.id, role: user.role });
            return { token: tokenService.issue(user) };
        },

        async login({ email, password }) {
            const user = await userRepository.findByEmail(email);
            const valid = await passwordService.verify(password, user);

            if (!valid) {
                // Same message whether the email or the password was wrong.
                securityLog.warn('auth.login_failed', { email });
                throw new UnauthorizedError(LOGIN_FAILED);
            }

            // Upgrade hashes created with an older, weaker work factor. This is the
            // only moment the plain-text password is available to rehash.
            if (passwordService.needsRehash(user)) {
                await userRepository.updatePassword(user.id, await passwordService.hash(password));
                securityLog.info('auth.password_rehashed', { userId: user.id });
            }

            return { token: tokenService.issue(user) };
        },
    };
}

module.exports = { createAuthService, LOGIN_FAILED };

'use strict';
/**
 * Authentication and authorization middleware.
 *
 *   authenticate      - who is calling? (verifies the Bearer token)
 *   requireRole(role) - are they allowed to do this? (checks the role)
 *
 * The original API only had the first check, so any registered account
 * could create, edit, and delete trips.
 */
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

function createAuthenticate(tokenService) {
    return function authenticate(req, res, next) {
        const header = req.get('authorization') || '';
        const parts = header.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
            return next(new UnauthorizedError());
        }
        try {
            req.auth = tokenService.verify(parts[1]);
            return next();
        } catch (err) {
            return next(new UnauthorizedError('Invalid or expired token'));
        }
    };
}

function createRequireRole({ userRepository, securityLog }) {
    return function requireRole(requiredRole) {
        return async function checkRole(req, res, next) {
            try {
                if (!req.auth) throw new UnauthorizedError();

                const deny = (reason) => {
                    securityLog.warn('authz.denied', {
                        userId: req.auth.sub,
                        requiredRole,
                        reason,
                        method: req.method,
                        path: req.originalUrl,
                    });
                    return new ForbiddenError();
                };

                if (req.auth.role !== requiredRole) throw deny('token role');

                // The role in a token is only a claim made when it was issued. Confirm
                // against the database so a deleted or demoted account loses access
                // immediately instead of when its token expires.
                const user = await userRepository.findById(req.auth.sub);
                if (!user || user.role !== requiredRole) throw deny('account role');

                return next();
            } catch (err) {
                return next(err);
            }
        };
    };
}

module.exports = { createAuthenticate, createRequireRole };

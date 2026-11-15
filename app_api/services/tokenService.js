'use strict';
/**
 * JSON Web Token issuing and verification.
 *
 * Tokens are signed with HS256 and carry an issuer and audience, and
 * verification pins all three, so a token signed with a different algorithm
 * or minted for another service is rejected.
 */
const jwt = require('jsonwebtoken');

function createTokenService({ secret, expiresIn, issuer, audience }) {
    return {
        issue(user) {
            return jwt.sign(
                { email: user.email, name: user.name, role: user.role },
                secret,
                { algorithm: 'HS256', expiresIn, issuer, audience, subject: String(user.id) }
            );
        },

        /** Returns the verified claims; throws if the token is invalid or expired. */
        verify(token) {
            const claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
            return { sub: claims.sub, email: claims.email, name: claims.name, role: claims.role };
        },
    };
}

module.exports = { createTokenService };

'use strict';
/**
 * Data-access layer for user accounts.
 */
const mongoose = require('mongoose');
const { translateError } = require('./translateError');

// Case-insensitive comparison, so accounts registered before emails were
// normalized to lowercase can still log in.
const EMAIL_COLLATION = { locale: 'en', strength: 2 };

function toUser(doc) {
    return {
        id: String(doc._id),
        email: doc.email,
        name: doc.name,
        role: doc.role || 'customer',
        hash: doc.hash,
        salt: doc.salt,
        iterations: doc.iterations,
    };
}

function createUserRepository(UserModel) {
    return {
        async findByEmail(email) {
            // String() guarantees a query operator object can never reach MongoDB.
            const doc = await UserModel.findOne({ email: String(email) }).collation(EMAIL_COLLATION).lean();
            return doc ? toUser(doc) : null;
        },

        async findById(id) {
            if (!mongoose.isValidObjectId(id)) return null;
            const doc = await UserModel.findById(id).lean();
            return doc ? toUser(doc) : null;
        },

        async create({ name, email, role, hash, salt, iterations }) {
            try {
                const doc = await UserModel.create({ name, email, role, hash, salt, iterations });
                return toUser(doc.toObject());
            } catch (err) {
                throw translateError(err, 'An account with that email already exists');
            }
        },

        async updatePassword(id, { hash, salt, iterations }) {
            await UserModel.updateOne({ _id: id }, { $set: { hash, salt, iterations } });
        },

        async setRole(id, role) {
            try {
                await UserModel.updateOne({ _id: id }, { $set: { role } }, { runValidators: true });
            } catch (err) {
                throw translateError(err);
            }
        },
    };
}

module.exports = { createUserRepository };

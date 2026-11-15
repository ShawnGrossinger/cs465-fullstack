const mongoose = require('mongoose');

// Roles a user account can hold. Public registration only ever creates
// customers; administrators are created with scripts/create-admin.js.
const ROLES = Object.freeze(['customer', 'admin']);

// The user model is now data only. Password hashing and token creation moved
// to services/passwordService.js and services/tokenService.js so they can be
// tested on their own and changed without touching the schema.
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ROLES,
        default: 'customer',
        required: true,
    },
    hash: String,
    salt: String,
    // PBKDF2 work factor used for this user's hash. Accounts created before
    // this field existed were hashed with 1,000 iterations and are upgraded
    // automatically the next time they log in.
    iterations: {
        type: Number,
        min: 1000,
    },
});

const User = mongoose.models.users || mongoose.model('users', userSchema);
module.exports = User;
module.exports.ROLES = ROLES;

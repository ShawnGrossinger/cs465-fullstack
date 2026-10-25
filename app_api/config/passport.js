const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const Users = require('../models/user');
const User = mongoose.model('users');

passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
        },
        async (username, password, done) => {
            try {
                const q = await User.findOne({ email: username }).exec();

                // Same message for a wrong email or a wrong password, so the
                // response doesn't reveal which email addresses have accounts
                if (!q || !q.validPassword(password)) {
                    return done(null, false, {
                        message: 'Incorrect email or password.',
                    });
                }

                return done(null, q);
            } catch (err) { // Database error
                return done(err);
            }
        }
    )
);

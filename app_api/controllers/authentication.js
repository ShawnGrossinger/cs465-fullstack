const mongoose = require('mongoose');
const passport = require('passport');
const User = require('../models/user');

// POST: /register - Creates a user and returns a JWT
const register = async (req, res) => {
    // Validate message to ensure that all parameters are present
    if (!req.body.name || !req.body.email || !req.body.password) {
        return res
            .status(400)
            .json({ "message": "All fields required" });
    }

    const user = new User(
        {
            name: req.body.name,   // Set User name
            email: req.body.email, // Set e-mail address
            password: ''           // Start with empty password
        });
    user.setPassword(req.body.password); // Set user password

    try {
        await user.save();

        // Return new user token
        const token = user.generateJWT();
        return res
            .status(200)
            .json({ token });
    } catch (err) {
        // 11000 is MongoDB's duplicate-key error (the email is already registered)
        return res
            .status(400)
            .json({ "message": err.code === 11000 ? "Email already registered" : err.message });
    }
};

// POST: /login - Checks the credentials and returns a JWT
const login = (req, res) => {
    // Validate message to ensure that email and password are present.
    if (!req.body.email || !req.body.password) {
        return res
            .status(400)
            .json({ "message": "All fields required" });
    }

    // Delegate authentication to passport module
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            // Error in Authentication Process
            return res
                .status(404)
                .json(err);
        }

        if (user) { // Auth succeeded - generate JWT and return to caller
            const token = user.generateJWT();
            res
                .status(200)
                .json({ token });
        } else { // Auth failed return error
            res
                .status(401)
                .json(info);
        }
    })(req, res);
};

// Export methods that drive endpoints.
module.exports = {
    register,
    login
};

const express = require('express'); // Express app
const router = express.Router();    // Router logic
const jwt = require('jsonwebtoken'); // Enable JSON Web Tokens

// This is where we import the controllers we will route
const tripsController = require('../controllers/trips');
const authController = require('../controllers/authentication');

// Method to authenticate our JWT
function authenticateJWT(req, res, next) {
    // console.log('In Middleware');

    const authHeader = req.headers['authorization'];
    // console.log('Auth Header: ' + authHeader);

    if (authHeader == null) {
        console.log('Auth Header Required but NOT PRESENT!');
        return res.sendStatus(401);
    }

    // Header must look like: Bearer <token>
    const headers = authHeader.split(' ');
    if (headers.length < 2 || headers[0] !== 'Bearer') {
        console.log('Auth Header is not in the form "Bearer <token>"');
        return res.sendStatus(401);
    }

    const token = headers[1];
    // console.log('Token: ' + token);

    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, verified) => {
        if (err) {
            console.log('Token Validation Error: ' + err.message);
            return res
                .status(401)
                .json({ "message": "Token Validation Error!" });
        }

        req.auth = verified; // Set the auth param to the decoded object
        next();              // Continue only after the token has been verified
    });
}

// define route for login endpoint
router
    .route('/login')
    .post(authController.login);

// define route for registration endpoint
router
    .route('/register')
    .post(authController.register);

// define route for our trips endpoint
router
    .route('/trips')
    .get(tripsController.tripsList)                      // GET Method routes tripsList
    .post(authenticateJWT, tripsController.tripsAddTrip); // POST Method Adds a Trip

// GET Method routes tripsFindByCode - requires parameter
// PUT Method routes tripsUpdateTrip - requires parameter
// DELETE Method routes tripsDeleteTrip - requires parameter
router
    .route('/trips/:tripCode')
    .get(tripsController.tripsFindByCode)
    .put(authenticateJWT, tripsController.tripsUpdateTrip)
    .delete(authenticateJWT, tripsController.tripsDeleteTrip);

module.exports = router;

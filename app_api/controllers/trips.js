const mongoose = require('mongoose');
const Trip = require('../models/travlr'); // Register model
const Model = mongoose.model('trips');

// GET: /trips - lists all the trips
// Regardless of outcome, response must include HTML status code
// and JSON message to the requesting client
const tripsList = async (req, res) => {
    const q = await Model
        .find({}) // No filter, return all records
        .exec();

    // Uncomment the following line to show results of query on the console
    // console.log(q);

    if (!q) { // Database returned no data
        return res
            .status(404)
            .json(err);
    } else { // Return resulting trip list
        return res
            .status(200)
            .json(q);
    }
};

// GET: /trips/:tripCode - lists a single trip
// Regardless of outcome, response must include HTML status code
// and JSON message to the requesting client
const tripsFindByCode = async (req, res) => {
    const q = await Model
        .find({ 'code': req.params.tripCode }) // Return single record
        .exec();

    // Uncomment the following line to show results of query on the console
    // console.log(q);

    if (!q) { // Database returned no data
        return res
            .status(404)
            .json(err);
    } else { // Return resulting trip list
        return res
            .status(200)
            .json(q);
    }
};

// POST: /trips - Adds a new Trip
// Regardless of outcome, response must include HTML status code
// and JSON message to the requesting client
const tripsAddTrip = async (req, res) => {
    const newTrip = new Trip({
        code: req.body.code,
        name: req.body.name,
        length: req.body.length,
        start: req.body.start,
        resort: req.body.resort,
        perPerson: req.body.perPerson,
        image: req.body.image,
        description: req.body.description
    });

    try {
        const q = await newTrip.save();

        // Uncomment the following line to show results of operation on the console
        // console.log(q);

        return res // Return new trip
            .status(201)
            .json(q);
    } catch (err) { // Validation failed or database error
        return res
            .status(400)
            .json({ message: err.message });
    }
};

// PUT: /trips/:tripCode - Updates a Trip
// Regardless of outcome, response must include HTML status code
// and JSON message to the requesting client
const tripsUpdateTrip = async (req, res) => {
    // Uncomment for debugging
    // console.log(req.params);
    // console.log(req.body);

    try {
        const q = await Model
            .findOneAndUpdate(
                { 'code': req.params.tripCode },
                {
                    code: req.body.code,
                    name: req.body.name,
                    length: req.body.length,
                    start: req.body.start,
                    resort: req.body.resort,
                    perPerson: req.body.perPerson,
                    image: req.body.image,
                    description: req.body.description
                }
            )
            .exec();

        if (!q) { // No trip with that code
            return res
                .status(404)
                .json({ message: 'Trip not found: ' + req.params.tripCode });
        }

        // Uncomment the following line to show results of operation on the console
        // console.log(q);

        return res // Return the trip as it was before the update
            .status(201)
            .json(q);
    } catch (err) { // Bad data or database error
        return res
            .status(400)
            .json({ message: err.message });
    }
};

// DELETE: /trips/:tripCode - Deletes a Trip
// Regardless of outcome, response must include HTML status code
// and JSON message to the requesting client
const tripsDeleteTrip = async (req, res) => {
    try {
        const q = await Model
            .findOneAndDelete({ 'code': req.params.tripCode })
            .exec();

        if (!q) { // No trip with that code
            return res
                .status(404)
                .json({ message: 'Trip not found: ' + req.params.tripCode });
        }

        return res // Return the trip that was deleted
            .status(200)
            .json(q);
    } catch (err) { // Database error
        return res
            .status(400)
            .json({ message: err.message });
    }
};

module.exports = {
    tripsList,
    tripsFindByCode,
    tripsAddTrip,
    tripsUpdateTrip,
    tripsDeleteTrip
};
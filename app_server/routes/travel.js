var express = require('express');
var { createTravelController } = require('../controllers/travel');

function createTravelRouter(tripsClient, log) {
    var router = express.Router();
    var controller = createTravelController(tripsClient, log);

    /* GET travel page */
    router.get('/', controller.travel);

    return router;
}

module.exports = { createTravelRouter };

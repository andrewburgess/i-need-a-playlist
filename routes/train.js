'use strict';

var queue = require('../lib/queue.js');

module.exports = function (server) {
    server.post('/train', function (req, res, next) {
        queue.process(req.body);

        res.json(200, {
            success: true,
            message: 'playlist added to queue'
        });
        return next();
    });
};

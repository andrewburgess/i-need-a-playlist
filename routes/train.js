'use strict';

var queue = require('../lib/queue.js');

module.exports = function (server) {
    server.post('/train', function (req, res, next) {
        queue.process(req.body);

        res.status(200).json({
            success: true,
            message: 'playlist added to queue'
        });
        return next();
    });
};

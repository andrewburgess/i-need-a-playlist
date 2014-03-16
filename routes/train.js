'use strict';

var db = require('../lib/data.js');

module.exports = function (server) {
    server.post('/train', function (req, res, next) {
        return next();
    });
};

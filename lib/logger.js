'use strict';

require('colors');
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: 'debug',
            colorize: true,
            handleExceptions: false,
            timestamp: true
        })
    ]
});

module.exports = logger;

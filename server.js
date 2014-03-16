'use strict';

var restify = require('restify');

var logger = require('./lib/logger');
var config = require('./config.js');
var db = require('./lib/data.js');
var routes = require('./routes');
var queue = require('./lib/queue.js');

var server = restify.createServer({
    name: 'i-need-a-playlist',
    version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

routes.initializeRoutes(server);

server.listen(8000, function () {
    logger.info('server listening on 8000');

    queue.start();
});

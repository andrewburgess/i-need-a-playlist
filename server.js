'use strict';

var restify = require('restify');

var server = restify.createServer({
    name: 'i-need-a-playlist',
    version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/echo/:message', function (req, res, next) {
    res.send(req.params);
    return next();
});

server.listen(8000, function () {
    console.log('server listening on 8000');
});
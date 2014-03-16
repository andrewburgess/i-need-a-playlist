'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var logger = require('./logger.js');
var db = require('./data.js');
var spotify = require('./spotify.js');

var processingQueue = {
    queue: []
};
var running = false;

var cachePath = path.join(path.dirname(require.main.filename), 'data', 'queue.txt');

var eventLoop = function () {
    if (!running) {
        return;
    }

    if (processingQueue.queue.length === 0) {
        console.log('empty queue');

        setTimeout(eventLoop, 1000);
        return;
    }

    // Pop an item off of the queue and process it
    processItem(processingQueue.queue.pop())
    .then(function () {
        setTimeout(eventLoop, 1000);
    });
};

/**
 * Process the passed in playlist
 *
 * @param {Object} playlist The playlist to process
 * @return {Promise}
 */
function processItem(playlist) {
    logger.info('processing ' + playlist.name);
    return db.findByUri(playlist.uri)
    .then(function (playlistResults) {
        if (playlistResults.length === 0) {
            return db.create({
                name: playlist.name,
                uri: playlist.uri
            });
        } else {
            playlistResults.map(function (item) {
                console.log(item.obj._data.data.name);
                console.log(JSON.stringify(item, null, 4));
            });
        }
    })
    .then(function () {
        return spotify.getTrackData(playlist.tracks);
    })
    .then(function (results) {
    })
    .fail(function (err) {
        logger.error('processItem error');
        logger.error(err);
    });
}

function start () {
    running = true;
    logger.debug('reading from ' + cachePath);
    fs.readFile(cachePath, { encoding: 'utf8' }, function (err, data) {
        if (err) {
            setTimeout(eventLoop, 1000);
            return;
        }

        logger.debug(data);
        processingQueue = JSON.parse(data);
        setTimeout(eventLoop, 1000);
    });
}

module.exports = {
    start: start
};

process.on('SIGINT', function () {
    running = false;
    if (!fs.existsSync(path.join(path.dirname(require.main.filename), 'data'))) {
        fs.mkdirSync(path.join(path.dirname(require.main.filename), 'data'));
    }

    //fs.writeFileSync(cachePath, JSON.stringify(processingQueue));
    process.exit();
});

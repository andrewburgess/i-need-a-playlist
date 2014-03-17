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
    processPlaylist(processingQueue.queue.pop())
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
function processPlaylist(spotifyPlaylist) {
    logger.info('processing ' + spotifyPlaylist.name);
    return db.findByUri(spotifyPlaylist.uri)
    .then(function (playlist) {
        if (!playlist) {
           return importPlaylist(spotifyPlaylist);
        } else {
            console.log(playlist);
        }
    })
    .fail(function (err) {
        logger.error('processItem error');
        console.log(err);
        logger.error(err);
        logger.error(err.stack);
    });
}

function importPlaylist(playlist) {
    return db.create({
        name: playlist.name,
        uri: playlist.uri
    })
    .then(function (node) {
        return db.addLabel(node.id, 'Playlist');
    })
    .then(function () {
        return spotify.getTrackData(playlist.tracks);
    })
    .then(function processPlaylistItems (tracks) {

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

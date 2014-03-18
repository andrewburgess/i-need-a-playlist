'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Q = require('q');

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
            return importPlaylist(spotifyPlaylist);
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
        return db.addLabel(node.id, 'Playlist')
        .then(function () {
            return spotify.getTrackData(playlist.tracks);
        })
        .then(function processPlaylistItems (tracks) {
            if (tracks.length === 0) {
                return;
            }

            var processItem = function (track) {
                return importPlaylistTrack(track)
                .then(function (trackNode) {
                    return db.createRelationship(node, trackNode, 'MEMBER', {})
                    .then(function () {
                        if (tracks.length === 0) {
                            return;
                        } else {
                            console.log('keep going');
                            return processItem(tracks.pop().track);
                        }
                    });
                })
            }

            return processItem(tracks.pop().track);
        });
    });
}

function importPlaylistTrack(track) {
    var artists = track.artists;
    var album = track.album;

    return importArtists(artists)
    .then(function (artistNodes) {
        return importAlbum(album, artistNodes)
        .then(function (albumNode) {
            return importTrack(track, artistNodes, albumNode);
        });
    });
}

function importArtists(artists) {
    var nodes = [];

    var importArtist = function (artist) {
        return db.importObject({
            name: artist.name,
            uri: artist.href
        }, 'Artist')
        .then(function (artistNode) {
            nodes.push(artistNode);
            if (artists.length === 0) {
                return nodes;
            } else {
                return importArtist(artists.pop());
            }
        });
    };

    return importArtist(artists.pop());
}

function importAlbum(album, artistNodes) {
    return db.importObject({
        name: album.name,
        released: album.released,
        uri: album.href
    }, 'Album')
    .then(function (albumNode) {
        var promises = [];

        _.each(artistNodes, function (artistNode) {
            promises.push(db.createRelationship(artistNode, albumNode, 'RELEASED'));
        });

        return Q.allSettled(promises)
        .then(function (results) {
            return albumNode;
        });
    });
}

function importTrack(track, artistNodes, albumNode) {
    return db.importObject({
        name: track.name,
        explicit: track.explicit,
        trackNumber: track['track-number'] || 1,
        length: track.length,
        uri: track.href
    }, 'Track')
    .then(function (trackNode) {
        var promises = [];

        _.each(artistNodes, function (artistNode) {
            promises.push(db.createRelationship(artistNode, trackNode, 'TRACK'));
        });

        promises.push(db.createRelationship(albumNode, trackNode, 'TRACK'));

        return Q.allSettled(promises)
        .then(function (results) {
            return trackNode;
        });
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

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
        setTimeout(eventLoop, 1000);
        return;
    }

    // Pop an item off of the queue and process it
    var nextPlaylist = processingQueue.queue.shift();
    processPlaylist(nextPlaylist)
    .then(function () {
        logger.info(nextPlaylist.name + ' processed');
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
    return importPlaylist(spotifyPlaylist)
    .fail(function (err) {
        logger.error('processItem error');
        logger.error(err);
        logger.error(err.stack);
    });
}

function importPlaylist(playlist) {
    return db.create('Playlist', {
        name: playlist.name,
        uri: playlist.uri
    })
    .then(function (node) {
        return spotify.getTrackData(playlist.tracks)
        .then(function processPlaylistItems (tracks) {
            var counter = 1;
            var promises = [];
            if (tracks.length === 0) {
                return;
            }

            var addToPlaylist = function (trackNode, index) {
                return db.createRelationship(node, trackNode, 'MEMBER', { position: index});
            };

            var processItem = function (track, index) {
                return importPlaylistTrack(track)
                .then(function (trackNode) {
                    return db.createRelationship(node, trackNode, 'MEMBER', { position: index});
                });
            };

            _.each(tracks, function (track) {
                // Spotify returns each track in it's own `track` object
                if (!track.exists) {
                    logger.info('track doesnt exist');
                    promises.push(processItem(track.track, counter));
                } else {
                    logger.info('track exists');
                    promises.push(addToPlaylist(track.node, counter));
                }
                counter++;
            });

            return Q.allSettled(promises);
        });
    })
    .fail(function (err) {
        logger.error(err);
    });
}

function importPlaylistTrack(track) {
    var artists = track.artists;
    var album = track.album;

    var promises = [];

    promises.push(importArtists(artists));
    promises.push(importAlbum(album));
    promises.push(importTrack(track));

    return Q.all(promises)
    .spread(function (artistNodes, albumNode, trackNode) {
        var relationPromises = [];

        _.each(artistNodes, function (artistNode) {
            relationPromises.push(db.createRelationship(artistNode, trackNode, 'TRACK'));
        });

        relationPromises.push(db.createRelationship(albumNode, trackNode, 'TRACK'));

        relationPromises.push(spotify.lookup(album.href)
            .then(function (spotifyAlbum) {
                var uri = '';

                if (spotifyAlbum.exists) {
                    uri = spotifyAlbum.node.data.uri;
                } else {
                    uri = spotifyAlbum.album['artist-id'];
                }

                return db.findByUri(uri)
                .then(function (albumArtistNode) {
                    return db.createRelationship(albumArtistNode, albumNode, 'RELEASED');
                });
            })
        );

        return Q.all(relationPromises)
        .then(function () {
            return trackNode;
        });
    });
}

function importArtists(artists) {
    var promises = [];

    _.each(artists, function (artist) {
        promises.push(db.create('Artist', {
            name: artist.name,
            uri: artist.href
        }));
    });

    return Q.all(promises);
}

function importAlbum(album) {
    return db.create('Album', {
        name: album.name,
        released: album.released,
        uri: album.href
    });
}

function importTrack(track) {
    if (typeof track.explicit === 'undefined') {
        track.explicit = true;
    }

    return db.create('Track', {
        name: track.name,
        explicit: track.explicit,
        trackNumber: track['track-number'] || 1,
        length: track.length,
        uri: track.href
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

        processingQueue = JSON.parse(data);
        setTimeout(eventLoop, 1000);
    });
}

module.exports.start = start;
module.exports.process = function (playlist) {
    processingQueue.queue.push(playlist);
};

process.on('SIGINT', function () {
    running = false;
    if (!fs.existsSync(path.join(path.dirname(require.main.filename), 'data'))) {
        fs.mkdirSync(path.join(path.dirname(require.main.filename), 'data'));
    }

    //fs.writeFileSync(cachePath, JSON.stringify(processingQueue));
    process.exit();
});

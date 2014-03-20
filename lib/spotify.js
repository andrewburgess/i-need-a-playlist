'use strict';

var util = require('util');
var spotify = require('spotify-data');
var _ = require('lodash');
var Q = require('q');

var logger = require('./logger.js');
var db = require('./data.js');

var lookup = function (uri) {
    var deferred = Q.defer();

    try {

        db.findByUri(uri)
        .then(function (result) {
            if (result) {
                deferred.resolve({
                    exists: true,
                    href: uri,
                    node: result
                });
                return;
            } else {
                spotify.lookup(uri, function (err, result) {
                    if (err) {
                        logger.error('spotify lookup failed - ' + uri);
                        logger.error(err);

                        err.uri = uri;
                        deferred.reject(err);
                        return;
                    }

                    logger.debug('spotify lookup succeeded - ' + uri);
                    deferred.resolve(result);
                });
            }
        })
        .fail(function (err) {
            logger.error(err);
        });
    } catch (err) {
        deferred.reject(err);
    }

    return deferred.promise;
};

/**
 * Loads the track data from Spotify's metadata API
 *
 * @param {Array} tracks Array of Spotify URIs
 * @return {Promise}
 */
var getTrackData = function (uris, depth) {
    var promises = [];
    depth = depth || 0;

    if (depth >= 3) {
        return Q.fcall(function () {
            return [];
        });
    }

    _.each(uris, function (item) {
        promises.push(lookup(item));
    })

    return Q.allSettled(promises)
    .then(function processTracks(tracks) {
        var failed = [];
        var succeeded = [];
        _.each(tracks, function (item) {
            if (item.state === 'fulfilled') {
                succeeded.push(item.value);
            } else if (item.state === 'rejected') {
                failed.push(item.reason.uri);
            }
        });

        if (failed.length === 0) {
            return succeeded;
        } else {
            return getTrackData(failed, depth + 1)
            .then(function joinResults(results) {
                return sortTracks(succeeded.concat(results), uris);
            });
        }
    });
};

module.exports.lookup = lookup;
module.exports.getTrackData = getTrackData;

/**
 * Sorts tracks based on the URI List to put them back in the playlist order
 *
 * @param {Array} tracks Array of track data retrieved from Spotify
 * @param {Array} uriList Array of URIs in order from the playlist
 * @returns {Array} Returns the sorted track list
 */
function sortTracks(tracks, uriList) {
    var sortFunction = function (a, b) {
        var leftIndex = uriList.indexOf(a.exists ? a.href : a.track.href);
        var rightIndex = uriList.indexOf(b.exists ? b.href : b.track.href);

        if (leftIndex === rightIndex) {
            return 0;
        }

        if (leftIndex < rightIndex) {
            return -1;
        }

        if (leftIndex > rightIndex) {
            return 1;
        }
    };

    return tracks.sort(sortFunction);
};

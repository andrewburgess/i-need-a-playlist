'use strict';

var util = require('util');
var spotify = require('spotify-data');
var _ = require('lodash');
var Q = require('q');

var logger = require('./logger.js');

var lookupTrack = function (uri) {
    var deferred = Q.defer();

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

    logger.debug('error depth ' + depth);

    if (depth >= 3) {
        return Q.fcall(function () {
            return [];
        });
    }

    _.each(uris, function (item) {
        promises.push(lookupTrack(item));
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
        var leftIndex = uriList.indexOf(a.track.href);
        var rightIndex = uriList.indexOf(b.track.href);

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

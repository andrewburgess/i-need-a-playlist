'use strict';

var util = require('util');
var spotify = require('spotify-data');
var _ = require('lodash');
var Q = require('q');

var lookupTrack = function (uri) {
    var deferred = Q.defer();

    spotify.lookup(uri, function (err, result) {
        if (err) {
            deferred.reject(err);
            return;
        }

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
var getTrackData = function (tracks) {
    var promises = [];

    _.each(tracks, function (item) {
        promises.push(lookupTrack(item));
    })

    return Q.allSettled(promises);
};

module.exports.getTrackData = getTrackData;

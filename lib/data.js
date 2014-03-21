'use strict';

var neo4j = require('neo4j');
var restify = require('restify');
var _ = require('lodash');
var config = require('../config.js');
var logger = require('./logger.js');
var db = new neo4j.GraphDatabase(config.database.url);
var Q = require('q');
var util = require('util');

var client = restify.createJsonClient({
    url: config.database.url,
    version: '*'
});

var queryCount = 0;
var MAX_QUERIES = 25;

var initialize = function () {
    var q = ['CREATE CONSTRAINT ON (artist:Artist) ASSERT artist.uri IS UNIQUE'];
    return query(q);
};

var query = function (q, parameters) {
    var deferred = Q.defer();
    logger.debug('queries: ' + queryCount);

    var performQuery = function () {

        if (queryCount >= MAX_QUERIES) {
            setTimeout(function () {
                performQuery();
            }, _.random(200, 2000));

            return;
        }

        queryCount++;
        parameters = parameters || {};

        if (_.isArray(q)) {
            q = q.join(' ');
        }

        logger.debug(q);
        logger.debug(parameters);

        db.query(q, parameters, function (err, results) {
            queryCount--;
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(results);
            }
        });
    };

    performQuery();

    return deferred.promise;
};

var createNode = function (label, properties) {
    var q = 'MERGE (node:' + label + ' {';
    var params = {};
    _.forIn(properties, function (value, key) {
        params[key] = value;
        q += key + ': {' + key + '}, '
    });

    q = q.substring(0, q.lastIndexOf(', '));
    q += '}) ON MATCH SET node._found = TRUE RETURN node';

    return query(q, properties)
    .then(function (results) {
        if (results.length === 0) {
            return null;
        } else {
            return results[0].node;
        }
    });
}

/**
 * Finds an item by its Spotify URI
 *
 * @param {String} uri Spotify URI
 * @returns {Promise} Returns undefined if no results were found
 */
var findByUri = function (uri) {
    var q = ['MATCH (item { uri: {uri} })',
             'RETURN item'];
    var parameters = {
        uri: uri
    };

    return query(q.join(' '), parameters)
    .then(function (results) {
        if (results.length > 0) {
            return results[0].item;
        } else {
            return;
        }
    });
}

var createRelationship = function (from, to, type, data) {
    var q = ['START from=node(' + from.id + '), to=node(' + to.id + ')',
             'CREATE UNIQUE (from)-[r:' + type + ' { properties }]->(to)',
             'RETURN r'];

    data = data || {};

    return query(q, { properties: data });
};

/**
 * Updates the RELATED relationship between two nodes, creating it if it doesn't exist
 * It will add the `score` parameter to the relationship's `score` property
 * i.e. this function is ADDITIVE. It doesn't not replace the value
 *
 * @param {Node} from
 * @param {Node} to
 * @param {Integer} score
 * @param {Node} playlist Node representing the playlist to see if everything is related or not
 * @returns {Promise}
 */
var updateScore = function (from, to, score, playlist) {
    var playlistRelationship = [
        'START from=node(' + from.id + '), to=node(' + to.id + '), playlist=node(' + playlist.id + ')',
        'MATCH (from)-[r]-(to)',
        'MATCH (from)-[rfrom]-(playlist)',
        'MATCH (to)-[rto]-(playlist)',
        'RETURN r, rfrom, rto'
    ];

    var trackRelationship = [
        'START from=node(' + from.id + '), to=node(' + to.id + ')',
        'MATCH (from)-[r]-(to)',
        'RETURN r'
    ];

    return query(playlistRelationship)
    .then(function (matches) {
        if (matches.length > 0 && matches[0].r && matches[0].rfrom && matches[0].rto) {
            logger.debug('playlist tracks already related: %d -> %d', from.id, to.id);
            return;
        } else {
            return query(trackRelationship)
            .then(function (trackMatches) {
                if (trackMatches.length > 0 && trackMatches[0].r) {
                    logger.debug('ensuring relationship direction: %d -> %d', trackMatches[0].r.start.id, trackMatches[0].r.end.id);
                    from = trackMatches[0].r.start;
                    to = trackMatches[0].r.end;
                }

                logger.debug('creating relationship between %d and %d', from.id, to.id);
                var q = ['START from=node(' + from.id + '), to=node(' + to.id + ')',
                         'CREATE UNIQUE (from)-[r:RELATED]->(to)',
                         'SET r.score = coalesce(r.score, 0) + ' + score,
                         'RETURN r'];

                return query(q);
            });
        }
    });
};

module.exports.initialize = initialize;
module.exports.query = query;
module.exports.findByUri = findByUri;
module.exports.create = createNode;
module.exports.createRelationship = createRelationship;
module.exports.updateScore = updateScore;
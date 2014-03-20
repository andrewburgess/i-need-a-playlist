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

var initialize = function () {
    var q = ['CREATE CONSTRAINT ON (artist:Artist) ASSERT artist.uri IS UNIQUE'];
    return query(q);
};

var query = function (q, parameters) {
    var deferred = Q.defer();

    parameters = parameters || {};

    if (_.isArray(q)) {
        q = q.join(' ');
    }

    logger.debug(q);
    logger.debug(parameters);

    db.query(q, parameters, function (err, results) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(results);
        }
    });

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

module.exports.initialize = initialize;
module.exports.query = query;
module.exports.findByUri = findByUri;
module.exports.create = createNode;
module.exports.createRelationship = createRelationship;
'use strict';

var neo4j = require('neo4j');
var config = require('../config.js');
var logger = require('./logger.js');
var db = new neo4j.GraphDatabase(config.database.url);
var Q = require('q');

var query = function (q, parameters) {
    var deferred = Q.defer();

    parameters = parameters || {};

    logger.debug('querying db');
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

var createNode = function (obj) {
    var deferred = Q.defer();

    var node = db.createNode(obj);

    logger.debug('creating node');
    logger.debug(obj);

    node.save(function (err, results) {
        if (err) {
            logger.error('error creating node');
            logger.error(err);
            deferred.reject(err);
        } else {
            logger.debug('node created');
            deferred.resolve(results);
        }
    });

    return deferred.promise;
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
            return results[0].item._data.data;
        } else {
            return;
        }
    });
}

module.exports.query = query;
module.exports.findByUri = findByUri;
module.exports.create = createNode;

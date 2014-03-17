'use strict';

var neo4j = require('neo4j');
var restify = require('restify');
var config = require('../config.js');
var logger = require('./logger.js');
var db = new neo4j.GraphDatabase(config.database.url);
var Q = require('q');
var util = require('util');

var client = restify.createJsonClient({
    url: config.database.url,
    version: '*'
});

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

    node.save(function (err, result) {
        if (err) {
            logger.error('error creating node');
            logger.error(err);
            deferred.reject(err);
        } else {
            logger.debug('node created');
            deferred.resolve(result);
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
            var data = results[0].item.data;
            data.id = results[0].item.id;
            return data;
        } else {
            return;
        }
    });
}

var addLabel = function (id, label) {
    var deferred = Q.defer();

    client.put('/db/data/node/' + id + '/labels', [label], function (err, req, res) {
        if (err) {
            deferred.reject(err);
            return;
        }

        if (res.statusCode === 200 || res.statusCode === 204) {
            deferred.resolve(true);
        } else {
            deferred.reject(res.statusCode + ' ' + res.status);
        }
    });

    return deferred.promise;
};

module.exports.query = query;
module.exports.findByUri = findByUri;
module.exports.create = createNode;
module.exports.addLabel = addLabel;

client.write = function write(options, body, callback) {
    body = JSON.stringify(body !== null ? body : {});
    return (this._super.write.call(this, options, body, callback));
};
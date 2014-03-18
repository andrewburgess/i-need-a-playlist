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

var query = function (q, parameters) {
    var deferred = Q.defer();

    parameters = parameters || {};

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
            return results[0].item;
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

var importObject = function (obj, label) {
    logger.debug('importing obj ' + label + ' ' + obj.uri);
    return findByUri(obj.uri)
    .then(function (node) {
        if (node) {
            logger.debug('obj found ' + node.id + ' ' + obj.uri);
            return node;
        } else {
            logger.debug('creating obj ' + label + ' ' + obj.uri);
            return createNode(obj)
            .then(function (node) {
                return addLabel(node.id, label)
                .then(function () {
                    return node;
                });
            });
        }
    });
};

var createRelationship = function (from, to, type, data) {
    var deferred = Q.defer();

    data = data || {};

    from.getRelationships(type, function (err, relationships) {
        var found = false;

        _.each(relationships, function (relationship) {
            if (relationship.end.id === to.id) {
                found = true;
                console.log('relationship found');
                return false;
            }
        })

        if (found) {
            deferred.resolve({});
            return;
        }

        from.createRelationshipTo(to, type, data, function (err, result) {
            if (err) {
                logger.error('relationship fail');
                logger.error(from.id + ' -> ' + to.id + ' (' + type + ')');
                deferred.reject(err);
            } else {
                deferred.resolve(result);
            }
        });
    });

    return deferred.promise;
};

module.exports.query = query;
module.exports.findByUri = findByUri;
module.exports.create = createNode;
module.exports.addLabel = addLabel;
module.exports.importObject = importObject;
module.exports.createRelationship = createRelationship;

client.write = function write(options, body, callback) {
    body = JSON.stringify(body !== null ? body : {});
    return (this._super.write.call(this, options, body, callback));
};
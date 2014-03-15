'use strict';

var neo4j = require('neo4j');
var config = require('./config');
var db = new neo4j.GraphDatabase(config.database.url);

module.exports = db;

'use strict';

var data = require('../lib/data.js');

data.initialize()
.then(function () {
    return data.create('Test', { name: 'Test Object', value: 1 })
    .then(function (createdNode) {
        console.log('Created Node: ' + createdNode.id);
        console.log(createdNode);
    })
    .fail(function (err) {
        console.error(err);
    });
})
.fail(function (err) {
    console.error(err);
});
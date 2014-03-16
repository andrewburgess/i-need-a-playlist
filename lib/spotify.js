'use strict';

var util = require('util');
var spotify = require('spotify-data');

spotify.lookup('spotify:track:21ZFkD8Rtxypf8MHu0cCTZ', function (err, result) {
    console.log(util.inspect(result, { showHidden: true, depth: null }));
});

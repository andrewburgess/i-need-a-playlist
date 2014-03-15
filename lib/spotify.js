'use strict';

var path = require('path');
var appkey = path.join(path.dirname(require.main.filename), 'spotify_appkey.key');
var spotify = require('node-spotify')({
    appkeyFile: appkey
});
var config = require('../config.js');

spotify.ready(function (){
    console.log('spotify ready');
    var playlist = spotify.createFromLink('spotify:user:deceptacle:playlist:31tQ4mE2ciAQ8SK5yMD1K9');
    var tracks = playlist.getTracks();
    console.log(tracks);
});

spotify.login(config.spotify.username, config.spotify.password);

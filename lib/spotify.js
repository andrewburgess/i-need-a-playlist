'use strict';

var path = require('path');
var Q = require('q');
var appkey = path.join(path.dirname(require.main.filename), 'spotify_appkey.key');
var spotify = require('node-spotify')({
    appkeyFile: appkey
});
var config = require('../config.js');

function loadPlaylist(uri) {
    var deferred = Q.defer();
    var playlist = spotify.createFromLink(uri);
    var checker = function () {
        if (playlist.isLoaded) {
            deferred.resolve(playlist);
        } else {
            setTimeout(checker, 100);
        }
    };

    checker();

    return deferred.promise;
}

spotify.ready(function (){
    console.log('spotify ready');
    loadPlaylist('spotify:user:deceptacle:playlist:31tQ4mE2ciAQ8SK5yMD1K9')
    .then(function (playlist) {
        console.log('playlist loaded');
        console.log(playlist);

        var tracks = playlist.getTracks();
        console.log(tracks[0]);
    });
});

spotify.login(config.spotify.username, config.spotify.password);

process.on('SIGINT', function () {
    spotify.logout();
    console.log('exiting');
    setTimeout(function (){
        process.exit();
    }, 5000);
});

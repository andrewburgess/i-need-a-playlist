'use strict';

module.exports = {
    initializeRoutes: function (server) {
        require('./train.js')(server);
    }
};

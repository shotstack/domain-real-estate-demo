'use strict';

const response = require('../../shared/response');
const address = require('./lib/address');

module.exports.search = (event, context, callback) => {
    const search = decodeURIComponent(event.pathParameters.search);

    address.search(search).then((res) => {
        console.log('Success');
        callback(null, response.format(200, 'success', 'OK', res));
    }).catch(function(res) {
        console.log('Fail: ', res);
        callback(null, response.format(400, 'fail', 'Bad Request', res));
    });
};

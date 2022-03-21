'use strict';

const response = require('../../shared/response');
const domain = require('./lib/domain');

module.exports.search = (event, context, callback) => {
    const search = decodeURIComponent(event.pathParameters.search);

    domain.search(search).then((res) => {
        console.log('Success');
        callback(null, response.format(200, 'success', 'OK', res));
    }).catch(function(res) {
        console.log('Fail: ', res);
        callback(null, response.format(400, 'fail', 'Bad Request', res));
    });
};

module.exports.property = (event, context, callback) => {
    const id = decodeURI(event.pathParameters.id);

    domain.property(id).then((res) => {
        console.log('Success');
        callback(null, response.format(200, 'success', 'OK', res));
    }).catch(function(res) {
        console.log('Fail: ', res);
        callback(null, response.format(400, 'fail', 'Bad Request', res));
    });
};

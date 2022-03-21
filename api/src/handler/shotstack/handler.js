'use strict';

const response = require('../../shared/response');
const shotstack = require('./lib/shotstack');

module.exports.submit = async (event, context, callback) => {
    const data = JSON.parse(event.body);
    const json = await shotstack.createJson(data);

    await shotstack.submit(json).then((res) => {
        console.log('Success');
        callback(null, response.format(201, 'success', 'OK', res));
    }).catch(function(res) {
        console.log('Fail: ', res);
        callback(null, response.format(400, 'fail', 'Bad Request', res));
    });
};

module.exports.status = async (event, context, callback) => {
    const id = event.pathParameters.id;

    await shotstack.status(id).then((res) => {
        console.log('Success');
        callback(null, response.format(200, 'success', 'OK', res));
    }).catch(function(res) {
        console.log('Fail: ', res);
        callback(null, response.format(400, 'fail', 'Bad Request', res));
    });
};

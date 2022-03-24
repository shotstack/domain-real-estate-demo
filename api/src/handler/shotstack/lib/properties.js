'use strict';

const request = require('request');
const Joi = require('@hapi/joi');

const domainUrl = 'https://api.domain.com.au/v1/';
const domainApiKey = process.env.DOMAIN_API_KEY;

/**
 * Domain property lookup of previously-found id using the search call.
 * - https://developer.domain.com.au/docs/v1/apis/pkg_properties_locations/references/properties_get
 *
 * @params id {string} - property identifier
 *
 * @returns {any} - response from Domain
 */
module.exports.get = (id) => {
    const schema = {
        id: Joi.string().regex(/^[a-zA-Z0-9 -]*$/).min(2).max(100).required(),
    };

    const valid = Joi.validate({
        id: id,
    }, schema);

    return new Promise((resolve, reject) => {
        if (valid.error) {
            return reject(valid.error);
        }

        request({
            url: domainUrl + 'properties/' + encodeURIComponent(id),
            method: 'GET',
            headers: {
                'x-api-key': domainApiKey
            },
            json: true
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                return reject(error);
            }

            if (body.message) {
                return reject(body.message.replace(/['"]+/g, ''));
            }

            if (!body.photos.length) {
                return reject('This property has no photos.');
            }

            return resolve(body);
        });
    });
};

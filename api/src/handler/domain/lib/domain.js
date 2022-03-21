'use strict';

const request = require('request');
const Joi = require('@hapi/joi');

const domainUrl = 'https://api.domain.com.au/v1/';
const domainApiKey = process.env.DOMAIN_API_KEY;

/**
 * Domain suggestions based on a human-readable address:
 * - https://developer.domain.com.au/docs/v1/apis/pkg_address_suggestion/references/properties_suggest
 *
 * @params search {string} - human-readable address
 *
 * @returns {any} - response body from Domain
 */
module.exports.search = (search) => {
    const schema = {
        search: Joi.string().regex(/^[a-zA-Z0-9 ,-\/]*$/).min(2).max(100).required(),
    };

    const valid = Joi.validate({
        search: search
    }, schema);

    return new Promise((resolve, reject) => {
        if (valid.error) {
            return reject(valid.error);
        }

        request({
            url: domainUrl + 'properties/_suggest?terms=' + encodeURIComponent(search),
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

            return resolve(body);
        });
    });
};

/**
 * Domain property lookup of previously-found id using the search call.
 * - https://developer.domain.com.au/docs/v1/apis/pkg_properties_locations/references/properties_get
 *
 * @params id {string} - property identifier
 *
 * @returns {any} - response from Domain
 */
module.exports.property = (id) => {
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

            return resolve(body);
        });
    });
};

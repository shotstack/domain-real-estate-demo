'use strict';

const request = require('request');
const Joi = require('@hapi/joi');
const fs = require('fs');

const shotstackUrl = process.env.SHOTSTACK_HOST;
const shotstackApiKey = process.env.SHOTSTACK_API_KEY;

const TRACK_PROPERTY = 0;
const TRACK_FEATURES = 1;
const PHOTO_FIXATION_DURATION = 6;  // seconds

const validateBody = (body) => {
    const schema = {
        property: Joi.object({
            streetAddress: Joi.string().required(),
            suburb: Joi.string().required(),
            state: Joi.string().required(),
            postcode: Joi.string().required(),
            photos: Joi.array().items({
                fullUrl: Joi.string().required(),
            }).min(1).required(),
        }),
    };

    const valid = Joi.validate({
        property: body.property,
    }, schema, {
        allowUnknown: true,
    });

    return valid;
};

/**
 * Update the JSON for the video, based on what the Domain API returned.
 *
 * @param body {any} - the data from Domain
 *
 * @returns {Promise} - a promise that resolves to the JSON for the video
 */
module.exports.createJson = (body) => {
    /**
     * Clean the response from Domain to satisfy Shotstack template requirements.
     *
     * The photos fields returned from Domain includes fullUrl, a path to a
     * photograph. Some properties use a link to a video instead (eg:
     * ES-8535-JD). We can't submit video as an image in our template for
     * rendering, so remove anything that does not come from Domain's image
     * buckets. See:
     * - https://developer.domain.com.au/docs/v1/conventions/image-resizing
     *
     * @param body {any} - full JSON response from Domain
     *
     * @returns {any} - cleaned JSON response
     */
    const processDomainResponse = (property) => {
        const re = new RegExp(/https:\/\/bucket-api.(domain|commercialrealestate).com.au\/v1/);

        property.photos = property.photos
            .filter((photo) => re.test(photo.fullUrl));

        return property;
    };

    /**
     * Some properties do not return any bedrooms, bathrooms or carSpaces.
     * Remove these from the features track in the timeline if they are not
     * found in the JSON. If all are removed, remove the track as well.
     *
     * @params jsonParsed {any} - the JSON object we are working with
     * @params body {any} - the property object from Domain
     */
    const updateFeaturesTrack = (jsonParsed, property) => {
        /*
         * Remove features from the bottom-most clip up to the top. This preserves
         * index ordering for subsequent splice()ing.
         */
        if (property.carSpaces === '') {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips.splice(5, 1);
        } else {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips[5].asset.html = `<p>${property.carSpaces}</p>`;
        }
        if (property.bathrooms === '') {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips.splice(4, 1);
        } else {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips[4].asset.html = `<p>${property.bathrooms}</p>`;
        }
        if (property.bedrooms === '') {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips.splice(3, 1);
        } else {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips[3].asset.html = `<p>${property.bedrooms}</p>`;
        }

        /*
         * Remove the icons if there are no values for the corresponding feature.
         */
        if (property.carSpaces === '') {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips.splice(2, 1);
        }
        if (property.bathrooms === '') {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips.splice(1, 1);
        }
        if (property.bedrooms === '') {
            jsonParsed.timeline.tracks[TRACK_FEATURES].clips.splice(0, 1);
        }

        /*
         * Clear the entire track if there are no clips.
         */
        if (jsonParsed.timeline.tracks[TRACK_FEATURES].clips.length === 0) {
            jsonParsed.timeline.tracks.splice(TRACK_FEATURES, 1);
        }
    };

    /**
     * Update the photos. The list of photos may be fewer than what is in the
     * template, so it may be necessary to remove unused clips between the
     * intro clip and the outro clip, as well as adjust track timing.
     *
     * @params jsonParsed {any} - the JSON object we are working with
     * @params property {any} - the property object from Domain
     */
    const updatePhotos = (jsonParsed, property) => {
        // Recalculate track indexes in case the feature track was removed.
        const trackPhotoIndex = jsonParsed.timeline.tracks.length - 1;
        const trackTransitionIndex = trackPhotoIndex - 1;
        const trackAgencyLogoIndex = trackTransitionIndex - 1;
        const trackAgencyTextIndex = trackAgencyLogoIndex - 1;
        const trackAgencyPhotoIndex = trackAgencyTextIndex - 1;

        const numTemplatePhotos = jsonParsed.timeline.tracks[trackPhotoIndex].clips.length;
        const numPhotos = Math.min(property.photos.length, jsonParsed.timeline.tracks[trackPhotoIndex].clips.length-1);
        const numRemove = numTemplatePhotos - numPhotos - 1;

        const removeStart = numTemplatePhotos - numRemove - 1;
        const outroStart = PHOTO_FIXATION_DURATION * numPhotos;

        // Remove unnecessary clips from video and transitions tracks.
        jsonParsed.timeline.tracks[trackTransitionIndex].clips.splice(removeStart, numRemove);
        jsonParsed.timeline.tracks[trackPhotoIndex].clips.splice(removeStart, numRemove);

        const lastClipIndex = jsonParsed.timeline.tracks[trackPhotoIndex].clips.length - 1;

        // Update last clip length for photos.
        jsonParsed.timeline.tracks[trackPhotoIndex].clips[lastClipIndex].start = outroStart;

        // Update last transition start to one second before last photo.
        jsonParsed.timeline.tracks[trackTransitionIndex].clips[lastClipIndex].start = outroStart - 1;

        // Update the agency tracks.
        jsonParsed.timeline.tracks[trackAgencyPhotoIndex].clips[0].start = outroStart;
        jsonParsed.timeline.tracks[trackAgencyPhotoIndex].clips[1].start = outroStart;
        jsonParsed.timeline.tracks[trackAgencyTextIndex].clips[0].start = outroStart;
        jsonParsed.timeline.tracks[trackAgencyTextIndex].clips[1].start = outroStart;
        jsonParsed.timeline.tracks[trackAgencyLogoIndex].clips[0].start = outroStart;

        // Overwrite the photos in the template with those from Domain.
        let i;
        for (i = 0; i < numPhotos; i++) {
            jsonParsed.timeline.tracks[trackPhotoIndex].clips[i].asset.src = property.photos[i].fullUrl;
        }

        // Set outro photo to be the same as the intro photo.
        jsonParsed.timeline.tracks[trackPhotoIndex].clips[lastClipIndex].asset.src = property.photos[0].fullUrl;
    };

    /**
     * Update the property information.
     *
     * @params jsonParsed {any} - the JSON object we are working with
     * @params property {any} - the property object from Domain
     */
    const updatePropertyTrack = (jsonParsed, property) => {
        const unit = property.flatNumber ? (property.flatNumber !== '' ? `${property.flatNumber}/` : '') : '';
        const address = (unit + property.streetAddress).toUpperCase();
        const category = property.propertyCategory ? property.propertyCategory.toUpperCase() : '';

        jsonParsed.timeline.tracks[TRACK_PROPERTY].clips[0].asset.html = `<p>${address}</p>`;
        jsonParsed.timeline.tracks[TRACK_PROPERTY].clips[1].asset.html =
            `<p>${property.suburb.toUpperCase()}, ${property.state.toUpperCase()} ${property.postcode}</p>`;

        jsonParsed.timeline.tracks[TRACK_PROPERTY].clips[3].asset.html = `<p>${category}</p>`;
    };

    return new Promise((resolve, reject) => {
        const cleanedBody = processDomainResponse(body);
        const valid = validateBody(cleanedBody);

        if (valid.error) {
            return reject(valid.error);
        }

        fs.readFile(__dirname + '/template.json', 'utf-8', function (err, data) {
            if (err) {
                console.error(err);
                return reject(err);
            }

            const jsonParsed = JSON.parse(data);

            updatePropertyTrack(jsonParsed, cleanedBody);
            updateFeaturesTrack(jsonParsed, cleanedBody);
            updatePhotos(jsonParsed, cleanedBody);

            return resolve(jsonParsed);
        });
    });
};

module.exports.submit = (data) => {
    return new Promise((resolve, reject) => {
        request({
            url: shotstackUrl + 'render',
            method: 'POST',
            headers: {
                'x-api-key': shotstackApiKey
            },
            json: true,
            body: data
        }, function (error, response, body){
            if (error) {
                console.log(error);
                return reject(error);
            }

            return resolve(body.response);
        });
    });
};

module.exports.status = (id) => {
    const schema = {
        id: Joi.string().guid({
            version: [
                'uuidv4',
                'uuidv5'
            ]
        })
    };

    const valid = Joi.validate({
        id: id
    }, schema);

    return new Promise((resolve, reject) => {
        if (valid.error) {
            return reject(valid.error);
        }

        request({
            url: shotstackUrl + 'render/' + id,
            method: 'GET',
            headers: {
                'x-api-key': shotstackApiKey
            },
            json: true
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                return reject(error);
            }

            return resolve(body.response);
        });
    });
};

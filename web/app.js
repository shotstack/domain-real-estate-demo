var apiUrl = 'http://localhost:3000/demo/'; // 'https://dsgyryplcg.execute-api.ap-southeast-2.amazonaws.com/demo/';
var apiEndpoint = apiUrl + 'shotstack';
var domainEndpoint = apiUrl + 'domain';
var progress = 0;
var progressIncrement = 10;
var pollIntervalSeconds = 10;
var unknownError = 'An unknown error has occurred.';
var player;

var maxProperties = 5;
var niceProperties = [
    '6 Lucania Court, Tamborine Mountain',
    '14 Bennets Ash Road, Noosa Heads',
    '192 Ocean Parade, Burleigh Heads',

    '19 Taylor Street, Darlinghurst',
    '8 Roosevelt Avenue, Allambie Heights',
    '24 Philip Road, Mona Vale',

    '368 Cardigan Street, Carlton',
    '31 Pardalote Rise, Red Hill',
    '10 Erica Street, Windsor',

    '11 Hood Street, Linden Park',
    '95 Kingfisher Circuit, Flagstaff Hill',
    '1 Piccadilly Road, Crafers',

    '23 Brookman Street, Perth',
    '25 Beatrice Road, Dalkeith',
    '28 Templetonia Crescent, City Beach',

    '38 Coolabah Road, Sandy Bay',
    '8 Tiersen Place, Sandy Bay',
    '121 Emmett Street, Smithton',
];

var keyUpTimer;
var keySearchTimeout = 250; // ms
var chosenPropertyId = '';

/**
 * Initialise and play the video
 *
 * @param {String} src  the video URL
 */
function initialiseVideo(src) {
    player = new Plyr('#player');

    player.source = {
        type: 'video',
        sources: [{
            src: src,
            type: 'video/mp4',
        }]
    };

    $('#status').removeClass('d-flex').addClass('d-none');
    $('#player').show();

    player.play();
}

/**
 * Check the render status of the video
 *
 * @param {String} id  the render job UUID
 */
function pollVideoStatus(id) {
    $.get({
        url: apiEndpoint + '/' + id,
        dataType: 'json',
    }, function(response) {
        updateStatus(response.data.status);
        if (!(response.data.status === 'done' || response.data.status === 'failed')) {
            setTimeout(function () {
                pollVideoStatus(id);
            }, pollIntervalSeconds * 1000);
        } else if (response.data.status === 'failed') {
            updateStatus(response.data.status);
        } else {
            initialiseVideo(response.data.url);
            initialiseJson(response.data.data);
        }
    });
}

/**
 * Update status message and progress bar
 *
 * @param {String} status  the status text
 */
function updateStatus(status) {
    if (progress <= 90) {
        progress += progressIncrement;
    }

    if (status === 'submitted') {
        $('#status .fas').attr('class', 'fas fa-spinner fa-spin fa-2x');
        $('#status p').text('SUBMITTED');
    } else if (status === 'queued') {
        $('#status .fas').attr('class', 'fas fa-history fa-2x');
        $('#status p').text('QUEUED');
    } else if (status === 'fetching') {
        $('#status .fas').attr('class', 'fas fa-cloud-download-alt fa-2x');
        $('#status p').text('DOWNLOADING ASSETS');
    } else if (status === 'rendering') {
        $('#status .fas').attr('class', 'fas fa-server fa-2x');
        $('#status p').text('RENDERING VIDEO');
    } else if (status === 'saving') {
        $('#status .fas').attr('class', 'fas fa-save fa-2x');
        $('#status p').text('SAVING VIDEO');
    } else if (status === 'done') {
        $('#status .fas').attr('class', 'fas fa-check-circle fa-2x');
        $('#status p').text('READY');
        progress = 100;
    } else {
        $('#status .fas').attr('class', 'fas fa-exclamation-triangle fa-2x');
        $('#status p').text('SOMETHING WENT WRONG');
        $('#submit-video').prop('disabled', false);
        progress = 0;
    }

    $('.progress-bar').css('width', progress + '%').attr('aria-valuenow', progress);
}

/**
 * Display form field and general errors returned by API
 *
 * @param error
 */
function displayError(error) {
    updateStatus(null);

    if (error.status === 400) {
        var response = error.responseJSON;

        if (response.data.isJoi) {
            $.each(response.data.details, function(index, error) {
                if (error.context.key === 'id') {
                    $('.search-group, #search').addClass('text-danger is-invalid');
                    $('.search-group').append('<div class="d-block invalid-feedback">The property search is invalid</div>').show();
                }
            });
        } else if (typeof response.data === 'string') {
            $('#errors').text(response.data).removeClass('d-hide').addClass('d-block');
        } else {
            $('#errors').text(unknownError).removeClass('d-hide').addClass('d-block');
        }
    } else if (typeof error.message === 'string') {
        $('#errors').text(error.message).removeClass('d-hide').addClass('d-block');
    } else {
        $('#errors').text(unknownError).removeClass('d-hide').addClass('d-block');
    }
}

/**
 * Reset errors
 */
function resetErrors() {
    $('input, label, select').removeClass('text-danger is-invalid');
    $('.invalid-feedback').remove();
    $('#errors').text('').removeClass('d-block').addClass('d-hide');
}

/**
 * Reset form
 */
function resetForm() {
    $('form').trigger("reset");
    $('#submit-video').prop('disabled', false);
    $('#property')
        .find('option')
        .remove().end()
        .prop('disabled', true);
}

/**
 * Reset and delete video
 */
function resetVideo() {
    if (player) {
        player.destroy();
        player = undefined;
    }

    progress = 0;

    $('.json-container').html('');
    $('#json').hide();
}

/**
 * Submit the form with data to create a Shotstack edit
 */
async function submitVideoEdit() {
    $('#submit-video').prop('disabled', true);

    try {
        $('#instructions').hide();
        $('#status').removeClass('d-none').addClass('d-flex');
        updateStatus('submitted');

        var formData = {
            'propertyId': chosenPropertyId,
        };

        $.ajax({
            type: 'POST',
            url: apiEndpoint,
            data: JSON.stringify(formData),
            dataType: 'json',
            crossDomain: true,
            contentType: 'application/json'
        }).done(function(response) {
            if (response.status !== 'success') {
                displayError(response.message);
                $('#submit-video').prop('disabled', false);
            } else {
                pollVideoStatus(response.data.id);
            }
        }).fail(function(error) {
            displayError(error);
            $('#submit-video').prop('disabled', false);
        });
    } catch (err) {
        displayError(err);
    }
}

/**
 * Ask Domain to look up a property, and return the results to autocomplete to
 * render a dropdown list.
 *
 * @param query {string} - query to pass to Domain.
 * @param callback {function} - autocomplete render function
 */
function submitPropertySearch(query, callback) {
    $.get({
        url: domainEndpoint + '/search/' + encodeURIComponent(query),
        dataType: 'json',
    }, function(response) {
        if (response.status !== 'success') {
            displayError(response.message);
        } else {
            var properties = response.data;

            var maxPropertiesToShow = Math.min(properties.length, maxProperties);
            properties = properties.slice(0, maxPropertiesToShow);

            callback(properties.map((property) => ({
                id: property.id,
                text: property.address
            })));
        }
    }).fail(function(error) {
        displayError(error);
    });
}

/**
 * Colour and style JSON
 *
 * @param match
 * @param pIndent
 * @param pKey
 * @param pVal
 * @param pEnd
 * @returns {*}
 */
function styleJson(match, pIndent, pKey, pVal, pEnd) {
    var key = '<span class=json-key>"';
    var val = '<span class=json-value>';
    var str = '<span class=json-string>';
    var r = pIndent || '';
    if (pKey)
        r = r + key + pKey.replace(/[": ]/g, '') + '"</span>: ';
    if (pVal)
        r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
    return r + (pEnd || '');
}

/**
 * Pretty print JSON object on screen
 *
 * @param obj
 * @returns {string}
 */
function prettyPrintJson(obj) {
    var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
    return JSON.stringify(obj, null, 3)
        .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(jsonLine, styleJson);
}

/**
 * Show the JSON display button
 *
 * @param json
 */
function initialiseJson(json) {
    $('.json-container').html(prettyPrintJson(json));
    $('#json').show();
}

$(document).ready(function() {
    $('#recent-properties').append(
        niceProperties
            .map((address) => ({ address, index: Math.random() }))
            .sort((a, b) => a.index - b.index)
            .map((property) => `<li><a href="#">${property.address}</li>`)
            .slice(0, maxProperties)
    );

    $('#recent-properties').on('click', 'a', function(event) {
        resetErrors();
        $('#search').val(event.target.text);
        $('#search').autoComplete('show');
    });

    $('#search').autoComplete({
        preventEnter: true,
        resolver: 'custom',
        events: {
            search: function (query, callback) {
                $('#submit-video').prop('disabled', true);
                if (keyUpTimer) {
                    clearTimeout(keyUpTimer);
                }

                keyUpTimer = setTimeout(function () {
                    submitPropertySearch(query, callback);
                }, keySearchTimeout);
            },
        },
    });

    $('#search').on('autocomplete.select', function (event, item) {
        resetErrors();
        $('#submit-video').prop('disabled', false);
        chosenPropertyId = item.id;
    });

    $('#search').change(function(event) {
        resetErrors();
    });

    $('#submit-search-form').submit(function(event) {
        resetErrors();
        resetVideo();
        submitVideoEdit();

        event.preventDefault();
    });
});

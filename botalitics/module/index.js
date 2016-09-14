'use strict';

const requestp = require('request-promise');
const Promise = require('bluebird');

function logEvent(payload) {
    var options = {
        method: 'POST',
        uri: 'http://localhost:8081/track',
        body: payload,
        json: true // Automatically stringifies the body to JSON
    };

    requestp(options)
        .then(function (parsedBody) {
            // POST succeeded...
            console.log(parsedBody);
        })
        .catch(function (err) {
            // POST failed...
        });
}

function logIncomingMessage(message) {
    const payload = { 
        type: 'incoming-message',
        message: message 
    };

    logEvent(payload);
}

function logOutgoingMessage(message) {
    const payload = { 
        type: 'outgoing-message',
        message: message 
    };

    logEvent(payload);
}

function logOutgoingResponse(response) {
    const payload = { 
        type: 'outgoing-response',
        message: response 
    };

    logEvent(payload);
}


module.exports = {
    logIncoming: logIncomingMessage,
    logOutgoing: logOutgoingMessage,
    logResponse: logOutgoingResponse
}
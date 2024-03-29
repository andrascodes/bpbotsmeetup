'use strict';

const requestp = require('request-promise');
const Promise = require('bluebird');
const moment = require('moment');

const getMeetupInfo = require('./getMeetupInfo');

module.exports = function getCompletedMessage(messageText, chat) {
    const templateRegex = /\{{2}([^}]*)\}{2}/g;
    const substitutesArray = [];
    const plugins = new Set();
    let myArray = null;
    while ((myArray = templateRegex.exec(messageText)) !== null) {
        const match = myArray[0];
        const capture = myArray[1];

        plugins.add(capture.split('.')[0]);
        const matchObject = {
            match: match,
            capture: capture
        }
        substitutesArray.push(matchObject);
    }

    if(!plugins.size) {
        return Promise.resolve(messageText);
    }

    const pluginPromises = {};
    if(plugins.has('meetup')) {
        pluginPromises.meetup = getMeetupInfo(chat.getDB());
    } else {
        pluginPromises.meetup = null;
    }

    if(plugins.has('fb')) {     
        pluginPromises.fb = chat.getUserProfile();
    } else {
        pluginPromises.fb = null;
    }

    return Promise.all([pluginPromises.meetup, pluginPromises.fb]).then((results) => {
        let completeMessage = messageText;
        //console.log(results);
        let meetupResults = results[0];
        let fbResults = results[1];

        substitutesArray.forEach(function(substitute){
            if(meetupResults) {
                if(!meetupResults.error) {
                    if(substitute.capture === 'meetup.date') {
                        completeMessage = completeMessage.replace(substitute.match, 
                        moment(meetupResults.time).format('MMMM D'));
                    }
                    else if(substitute.capture.includes('meetup.month')) {
                        const options = substitute.capture.split('.')[2];
                        if(options === ('long')) {
                            completeMessage = completeMessage.replace(substitute.match, 
                            moment(meetupResults.time).format('MMMM'));
                        }
                    }
                    else if(substitute.capture.includes('meetup.day')) {
                        const options = substitute.capture.split('.')[2];
                        if(options === ('num')) {
                            completeMessage = completeMessage.replace(substitute.match, 
                            moment(meetupResults.time).format('D'));
                        }
                        
                    }
                    else if(substitute.capture === 'meetup.start') {
                        completeMessage = completeMessage.replace(substitute.match, 
                        moment(meetupResults.time).format('HH[:]mm'));
                    }
                    else if(substitute.capture === 'meetup.end') {
                        completeMessage = completeMessage.replace(substitute.match, 
                        moment(meetupResults.endtime).format('HH[:]mm'));
                    }
                    else if(substitute.capture === 'meetup.url') {
                        completeMessage = completeMessage.replace(substitute.match, meetupResults.link);
                    }
                    else if(substitute.capture === 'meetup.locationUrl') {
                        completeMessage = completeMessage.replace(substitute.match, meetupResults.locationUrl);
                    }
                    else if(substitute.capture === 'meetup.locationName') {
                        completeMessage = completeMessage.replace(substitute.match, meetupResults.venue.name);
                    }
                    else if(substitute.capture.includes('meetup.location')) {
                        const options = substitute.capture.split('.')[2];
                        if(options === ('address')) {
                            completeMessage = completeMessage.replace(substitute.match, meetupResults.venue['address_1']);
                        }
                        else if(options === ('city')) {
                            completeMessage = completeMessage.replace(substitute.match, meetupResults.venue.city);
                        }
                    }
                    else if(substitute.capture === 'meetup.calendarUrl') {
                        const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&` + 
                            `text=${meetupResults.name}`+
                            `&dates=${moment(meetupResults.time).utc().format('YYYYMMDD[T]HHmmss[Z]').toString()}/` +
                            `${moment(meetupResults.endtime).utc().format('YYYYMMDD[T]HHmmss[Z]').toString()}` +
                            `&details=For details click here: ${meetupResults.link}` +
                            `&location=${meetupResults.venue.name}, ${meetupResults.venue['address_1']}, ${meetupResults.venue.city}` +
                            `&sf=true&output=xml`;
                        completeMessage = completeMessage.replace(substitute.match, googleCalendarUrl);
                    }
                    else if(substitute.capture === 'meetup.title') {
                        completeMessage = completeMessage.replace(substitute.match, meetupResults.name);
                    }
                    // else if(substitute.capture === 'meetup.location'){}
                }
                else {
                    return meetupResults.error;
                }
            }

            if(fbResults) {
                if(substitute.capture === 'fb.first_name') {
                    completeMessage = completeMessage.replace(substitute.match, fbResults.first_name);
                }
                // other profile info
            }
        });

        //console.log(completeMessage);
        return completeMessage;
    }).catch((error) => { console.log(`Error completing Message: ${error}`);});
}
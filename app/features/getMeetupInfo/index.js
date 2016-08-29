'use strict';

const requestp = require('request-promise');
const Promise = require('bluebird');

module.exports = function getMeetupInfo(db) {
    const options = {
        uri: 'https://api.meetup.com/Budapest-Bots-Meetup/events?&sign=true&photo-host=public&page=1&status=upcoming',
        json: true // Automatically parses the JSON string in the response
    };
    const meetupApiResponse = requestp(options);

    return meetupApiResponse.then((result) => {
        if(result.length) {
            //console.log(result);
            result = result[0];

            // set location = string for Google Maps Search
            // agenda = parse description get agenda part and Split it into elements of an array
            // add endtime

            result.endtime = result.time + result.duration;
            result.locationUrl = `http://maps.google.com/?q=${result.venue.name}, ${result.venue.address_1}, ${result.venue.city}`;

            const agendaRegex = /<p><b>Agenda:<\/b><\/p>(.*)<p><b><br\/><\/b><\/p>/;
            const agendaItemRegex = /<p><b>([^<]*)<\/b><\/p>/g;
            const agendaString = agendaRegex.exec(result.description)[1];
            let myArray = null;
            result.agenda = [];
            const talks = [];
            while ((myArray = agendaItemRegex.exec(agendaString)) !== null) {
                result.agenda.push(myArray[1]);
                // TODO: Pick out the ones that have Talk in them. includes('Talk');
                talks.push({ "title": myArray[1], "questions": [] });
            }
            
            return db.meetups.findAndModify({
                query: { "_id": result.id },
                update: { 
                    $set: result,
                    $setOnInsert: { talks: talks }
                },
                new: false,
                upsert: true
            }).then((res) => {
                const now = new Date().getTime();
                // return latest meetup, not the one that we have just changed
                return db.meetups.find({ "endtime": { $gt : now } }).sort({"time": -1}).limit(1).then((latestMeetup) => {
                    return latestMeetup[0];
                });

            }).catch((err) => { console.log(`Error updating Meetup data: ${err}`);});
        }
        else {
            const noMeetupObject = {
                error: 'no upcoming Meetups'
            };
            return noMeetupObject;
        }

    });
}
'use strict';

const express = require('express');
const Promise = require('bluebird');
const moment = require('moment');

const config = require('../config');
const app = express();

const routes = require('./routes')(app);

const BootBot = require('../bootbot/lib/BootBot.js');

const pmongo = require('promised-mongo');
const db = pmongo(config.dbaddress,{ authMechanism: 'ScramSHA1' }, ['users', 'meetups', 'feedbacks', 'articles']);

const bot = new BootBot({
  accessToken: config.fbPageAccessToken,
  verifyToken: config.verifyToken,
  appSecret: config.appSecret,
  app: app,
  db: db,
  admins: config.admins
});

const getCompletedMessage = require('./features');
const getMeetupInfo = require('./features/getMeetupInfo');
const sendArticles = require('./features/sendArticles');
const defaultMessages = require('./features/defaultMessages');
const pickRandomElement = require('../utils/pickRandomElement');
const notifyAdmins = require('./features/notifyAdmins');

// TODO: (DB collections: users, messages, messageTexts, meetups (questions embedded), feedback, surveys)
// Meetup questions Schema redefinition
// create rules for Agenda, so I can filter for that when extracting it from description
// Don't filter when submitting questions, latestMeetup will have the eligible talks in questions property

// Save events to DB.

// Save meetup questions to meetup.questions embedded doc.

// Change 'See next meetup' to 'Join today's meetup' when its meetupday.

// Before review:
// Take down today's meetup. Add a rule for past meetups, when there are no upcoming meetups.
// Display a past meetup element with link to the meetup site and resources.

// Subscribe with email to newsletter (Mailchimp)

// Import messageText from DB.
// Get articles for the Intro to Chatbots section.

// add MessageCompletion to BootBot, ad MessageCompleter function as an option
    // will be great when reading the messages from database
    // it will be sort of like a patternMatcher, NLP
        // if {{(...)}} === first_name => getUserProfile and name
// get message from DB
// see the type and meta info for Developer 
// (if something needs to be done before sending do it)
    // this is where the messageObjectTemplate will be formulated
    // if a card needs to be shown dynamically that is done here
// sendMessage, BootBot gets it
    // calls the Completer, then the correct sender Function
    // this is where the templateString will be switched out

function greetingFeature(messagingEvent, chat, data) {
    db.users.findOne({ "_id": messagingEvent.sender.id }).then((user) => {
        const first_name = user['first_name'];
        const firsttimer = !(user.onboarding['postback:GET_STARTED']);

        const firsttimerMessages = [
            {
                message: `Hi ${first_name}, it's nice to meet you!`,
                options: null
            },
            {
                message: `I'm Bot 207, but you can call me Floyd.`,
                options: { typing: true }
            },
            {
                message: {
                    text: `I'm here to assist you with meetup and chatbot related stuff.`,
                    buttons: [
                        { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
                        { type: 'postback', title: 'Read bot articles', payload: 'NEWSLETTER' },
                        { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
                    ]
                },
                options: { typing: true }
            }
        ];

        const simpleGreeting = {
            text: `Hi, ${first_name}! How may I assist you?`,
            buttons: [
                { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
                { type: 'postback', title: 'Read bot articles', payload: 'NEWSLETTER' },
                { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
            ]
        };

        if(firsttimer) {
            user.onboarding['postback:GET_STARTED'] = true;
            chat.sayMultiple(firsttimerMessages).then(() => {
                db.users.findAndModify({
                    query: { "_id": user['_id'] },
                    update: { $set: user },
                    new: false,
                    upsert: false
                })
                .then().catch((err) => { console.log(`Error updating User data: ${err}`);});
            });
            
        }
        else {
            chat.say(simpleGreeting);
        }
    }).catch((err) => { console.log(`Error getting User data: ${err}`);});
}

function meetupFeature(messagingEvent, chat, data) {
    console.log(messagingEvent);
    getMeetupInfo(db)
        .then((nextMeetup) => {
            db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
                if(nextMeetup.error) {
                    chat.say('There are no upcoming Meetups scheduled right now.').then(() => {
                        if(!user.subscriptions.meetup) {
                            chat.sendGenericTemplate([{
                                title: 'Subscribe for Meetup notifications',
                                subtitle: `Get notified as soon as we publish a new meetup. (once or twice a month)`,
                                
                                image_url: 'http://i.imgur.com/O0ZiM8v.png',
                                buttons: [
                                    {
                                        type: 'postback',
                                        title: 'Subscribe',
                                        payload: 'MEETUP_SUBSCRIBED'
                                    }
                                ]
                            }], { typing: true });
                        }
                        else {
                            chat.say(`You're subscribed for meetup notifications.\n` + 
                                        `I'll notify you when there is a new meetup. ;)`, { typing: true });
                        } 
                    });
                }
                else if(nextMeetup.name === 'Chatbot Wednesdays') {

                        chat.say('There are no upcoming Meetups scheduled right now.').then(() => {
                            if(!user.subscriptions.meetup) {
                                const generic = [
                                    {
                                        title: 'Subscribe for Meetup notifications',
                                        subtitle: `Get notified as soon as we publish a new meetup. (once or twice a month)`,
                                        
                                        image_url: 'http://i.imgur.com/O0ZiM8v.png',
                                        buttons: [
                                            {
                                                type: 'postback',
                                                title: 'Subscribe',
                                                payload: 'MEETUP_SUBSCRIBED'
                                            }
                                        ]
                                    },
                                    {
                                        title: 'Chatbot Wednesdays',
                                        subtitle: `${result.venue.name} at ${moment(result.time).format('HH[:]mm')}`,
                                        
                                        image_url: 'http://i.imgur.com/9KNpPD3.png',
                                        buttons: [
                                            {
                                                type: 'web_url',
                                                title: 'Show venue on map',
                                                url: `http://maps.google.com/?q=${result.venue.name}, ${result.venue.address_1}, ${result.venue.city}`
                                            },
                                            {
                                                type: 'web_url',
                                                title: 'RSVP on Meetup.com',
                                                url: result.link
                                            }
                                        ]
                                    }
                                ]

                                chat.sendGenericTemplate(generic, { typing: true });
                            }
                            else {
                                chat.say(`You're subscribed for meetup notifications.\n` + 
                                            `I'll notify you when there is a new meetup. ;)`, { typing: true })
                                .then( () => {
                                    chat.say(`Until then. You can always come to our weekly discussions. ;)`, { typing: true })
                                    .then( () => {
                                        const generic = [
                                            {
                                                title: 'Chatbot Wednesdays',
                                                subtitle: `${result.venue.name} at ${moment(result.time).format('HH[:]mm')}`,
                                                
                                                image_url: 'http://i.imgur.com/9KNpPD3.png',
                                                buttons: [
                                                    {
                                                        type: 'web_url',
                                                        title: 'Show venue on map',
                                                        url: `http://maps.google.com/?q=${result.venue.name}, ${result.venue.address_1}, ${result.venue.city}`
                                                    },
                                                    {
                                                        type: 'web_url',
                                                        title: 'RSVP on Meetup.com',
                                                        url: result.link
                                                    }
                                                ]
                                            }
                                        ];
                                        
                                        chat.sendGenericTemplate(generic, { typing: true });
                                    });
                                });
                            } 
                        });
                }
                else {
                    const now = new Date();
                    let today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    let tomorrow = new Date(today + 24 * 60 * 60 * 1000);

                    // MeetupDay for testing - Comment out in production
                    // today = new Date(2016, 8, 6).getTime();
                    // tomorrow = new Date(2016, 8, 7).getTime();

                    // Check if meetup is today
                    const todaysMeetup = (nextMeetup.time >= today && nextMeetup.time <= tomorrow);

                    const incompleteMessages = [];
                    incompleteMessages.push(getCompletedMessage(`{{meetup.title}}`, chat));
                    incompleteMessages.push(getCompletedMessage(`{{meetup.month.long}} {{meetup.day.num}}, ` + 
                        `{{meetup.start}}-{{meetup.end}} at {{meetup.locationName}}`, chat));
                    incompleteMessages.push(getCompletedMessage('{{meetup.calendarUrl}}', chat));
                    incompleteMessages.push(getCompletedMessage(`Venue: {{meetup.locationName}}`, chat));
                    incompleteMessages.push(getCompletedMessage(`{{meetup.location.address}}\n {{meetup.location.city}}`, chat));
                    incompleteMessages.push(getCompletedMessage('{{meetup.start}} at {{meetup.locationName}}', chat));
                    incompleteMessages.push(getCompletedMessage(`Don't forget to submit your questions to the speakers.\n` +
                        `Also make sure you RSVP!`, chat));
                    incompleteMessages.push(getCompletedMessage('{{meetup.locationUrl}}', chat));
                    incompleteMessages.push(getCompletedMessage('{{meetup.url}}', chat));
    
                    Promise.all(incompleteMessages).then((messages) => {   
                        console.log(`Promises: ${JSON.stringify(messages, null, 2)}`);
                        const meetupTitle = messages[0];
                        const meetupSubtitle = messages[1];
                        const calendarUrl = messages[2];
                        const locTitle = messages[3];
                        const locSubtitle = messages[4];
                        const todayTitle = messages[5];
                        const todaySubtitle = messages[6];
                        const meetupLocationUrl = messages[7];
                        const eventPage = messages[8];

                        const elements = [
                            {
                                title: meetupTitle,
                                subtitle: meetupSubtitle,
                                image_url:  'http://i.imgur.com/dORdxei.png', //'http://i.imgur.com/2v3uz4B.png',
                                buttons: [
                                    {
                                        type: 'postback',
                                        title: 'See the Agenda',
                                        payload: 'MEETUP_AGENDA'
                                    },
                                    {
                                        type: 'web_url',
                                        title: 'Add to Calendar',
                                        url: calendarUrl
                                    },
                                    {
                                        type: 'web_url',
                                        title: 'Go to Event Page',
                                        url: eventPage
                                    }
                                ]
                            },
                            {
                                title: locTitle,
                                subtitle: locSubtitle,
                                image_url: 'http://i.imgur.com/BHleHKN.png',
                                buttons: [
                                    {
                                        type: 'web_url',
                                        title: 'Show on map',
                                        url: meetupLocationUrl
                                    },
                                    {
                                        type: 'web_url',
                                        title: 'Go to Facebook Page',
                                        url: 'https://www.facebook.com/alapcafe'
                                    }
                                ]
                            }
                        ];

                        if(todaysMeetup) {
                            elements.unshift({
                                title: todayTitle,
                                subtitle: todaySubtitle,
                                image_url: 'http://i.imgur.com/gk4Cf0D.png',
                                buttons: [
                                    {
                                        type: 'postback',
                                        title: 'Submit Q&A question',
                                        payload: 'MEETUP_QUESTION'
                                    },
                                    {
                                        type: 'web_url',
                                        title: 'Show venue on map',
                                        url: meetupLocationUrl
                                    },
                                    {
                                        type: 'web_url',
                                        title: 'RSVP on Meetup.com',
                                        url: eventPage
                                    }
                                ]
                            });
                        }

                        // if user not subscribed than push subscription element
                        //const user = messages[9];
                        console.log(user);
                        const isSubscribed = user.subscriptions.meetup;
                        if(!isSubscribed) {
                            elements.push({
                                title: 'Subscribe for Meetup notifications',
                                subtitle: `Get notified as soon as we publish a new meetup. (once or twice a month)`,
                                
                                image_url: 'http://i.imgur.com/O0ZiM8v.png',
                                buttons: [
                                    {
                                        type: 'postback',
                                        title: 'Subscribe',
                                        payload: 'MEETUP_SUBSCRIBED'
                                    }
                                ]
                            });
                        }

                        chat.sendGenericTemplate(elements);
                    });
                }
            });
        });
}

function meetupQuestionFeature(messagingEvent, chat, data) {
    getMeetupInfo(db)
        .then((nextMeetup) => {
            if(nextMeetup.error) {
                chat.say('There are no upcoming Meetups scheduled right now.').then(() => {
                    chat.say({
                        text: `Subscribe for notifications so you don't miss out on the announcement. `,
                        buttons: [
                            { type: 'postback', title: 'Subscribe', payload: 'MEETUP_SUBSCRIBED' },
                        ]
                    }, { typing: true });
                });
            }
            else {

                chat.conversation((convo) => {
                    const start = `Here are the talks for ${nextMeetup.name}:`;
                    const typingTimeStart = Math.floor(((start.split(' ').length)/3) * 1000);

                    convo.say(start).then(() => {
                        // TODO: don't filter, just read the questions objects

                        const presentations = nextMeetup.agenda.slice(1,-1);
                        const talks = presentations.map((agendaItem) => {
                                return agendaItem.split(' - ')[1];
                            });
                        
                        let agenda = [];
                        for(let i=1; i<=talks.length; ++i) {
                            agenda.push(`${i}. ${talks[i-1]}`);
                        }
                        const agendaString = agenda.reduce((prev, curr) => { return prev + '\n' + curr; }, '');

                        const typingTimeTalks = Math.floor(((agendaString.split(/[\n\s]/).length)/4) * 1000);

                        convo.say(agendaString, { typing: typingTimeStart }).then(() => { askWhichTalk(convo, agenda, typingTimeTalks); });
                    }).catch((err) => {console.log(err)});
                });


                const askWhichTalk = (convo, talks, typingTime) => {
                    talks = talks.map((talk) => {
                        return talk.slice(0, 16) + '...';
                    });
                    const quickReplyArray = Array.from(talks);
                    quickReplyArray.push('Never mind');

                    convo.ask({
                        text: 'Which talk is your question connected to?',
                        quickReplies: quickReplyArray
                    }, (payload, convo, data) => {
                        if(!payload.message || !payload.message.quick_reply) {
                            convo.say(`Incorrect input. Try again!`).then(() => askWhichTalk(convo, talks, typingTime));
                        }
                        else if(payload.message.text === 'Never mind') {
                            convo.say(`That's alright. ;) Question cancelled.`).then(() => convo.end());
                        }
                        else {
                            const text = payload.message.text;
                            convo.say(`Submitting question for "${text}"`).then(() => placeQuestion(convo, text));
                        }
                    }, { typing: typingTime });
                };

                const placeQuestion = (convo, talkName) => {
                    convo.ask({
                        text: 'All right. Fire away!',
                        quickReplies: ['Never mind']
                    }, (payload, convo, data) => {
                        if(!payload.message || !payload.message.text) {
                            convo.say(`Incorrect input. Try again!`).then(() => placeQuestion(convo, talkName));
                        }
                        else if(payload.message.quick_reply && payload.message.text === 'Never mind') {
                            convo.say(`No problem. :) Question cancelled.`).then(() => convo.end());
                        }
                        else {
                            const text = payload.message.text;
                            talkName = talkName.slice(3,-3);
                            const talkIndex = nextMeetup.talks.findIndex((talk) => {
                               return talk.title.includes(talkName); 
                            });

                            nextMeetup.talks[talkIndex].questions.push(
                                { 
                                    "userID": payload.sender.id, 
                                    "question": text 
                                }
                            );

                            db.meetups.findAndModify({
                                query: { "_id": nextMeetup["_id"] },
                                update: { $set: nextMeetup },
                                new: true
                            })
                            .then((res) => {
                                // console.log(`Response:\n${JSON.stringify(res, null, 2)}`);
                                convo.say(`Got it. Thanks.`).then(() => convo.end());
                            });                            
                        }
                    });
                };

                const options = {
                    typing: true // Send a typing indicator before asking the question
                };
            }
        });
}

function meetupAgendaFeature(messagingEvent, chat, data) {
    getMeetupInfo(db)
        .then((nextMeetup) => {
             db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
                if(nextMeetup.error) {
                    chat.say('There are no upcoming Meetups scheduled right now.').then(() => {
                        if(!user.subscriptions.meetup) {
                            chat.sendGenericTemplate([{
                                title: 'Subscribe for Meetup notifications',
                                subtitle: `Get notified as soon as we publish a new meetup. (once or twice a month)`,
                                
                                image_url: 'http://i.imgur.com/O0ZiM8v.png',
                                buttons: [
                                    {
                                        type: 'postback',
                                        title: 'Subscribe',
                                        payload: 'MEETUP_SUBSCRIBED'
                                    }
                                ]
                            }], { typing: true });
                        }
                        else {
                            chat.say(`You're subscribed for meetup notifications.\n` + 
                                        `I'll notify you when there is a new meetup. ;)`, { typing: true });
                        } 
                    });
                }
                else {
                    const start = `Here's the agenda for ${nextMeetup.name}:`;

                    chat.say(start).then(() => {
                        const agenda = nextMeetup.agenda.reduce((prev, curr) => {
                            return prev + '\n' + curr;
                        }, '');

                        chat.say(agenda, { typing: true }).then(() => {
                            chat.say({
                                text: `You can RSVP on Meetup.com.`,
                                buttons: [
                                    { type: 'web_url', title: 'RSVP on Meetup.com', url: `${nextMeetup.link}` },
                                ]
                            }, { typing: true });
                        });
                    });
                }
             });
        });
}

function meetupSubscribed(messagingEvent, chat, data) {

    db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
        const options = { typing: true };
        const messages = [];
        const thanksMessage = {
            message: `Thanks for subscribing! :)`,
            options: null
        };
        messages.push(thanksMessage);

       const firsttimer = !(user.onboarding['postback:MEETUP_SUBSCRIBED']);
        if(firsttimer) {
            user.onboarding['postback:MEETUP_SUBSCRIBED'] = true;
            messages.push({
                message: `You can manage your subscriptions later in the Settings menu.`,
                options: options
            });  

            messages.push({
                message: `You can type 'settings' or use the Menu below to get to the Settings menu.`,
                options: options
            });
        }

       user.subscriptions.meetup = true;

       db.users.findAndModify({
            query: { '_id': user._id },
            update: { 
                $set: user
            },
            new: true,
            upsert: false
        })
            .then((res) => {
                console.log(`Response:\n${JSON.stringify(res, null, 2)}`);

                chat.sayMultiple(messages);

            }).catch((err) => { console.log(`Error updating User data: ${err}`);});     
    }).catch((err) => { console.log(`Error getting User data: ${err}`);});
}

function meetupUnsubscribed(messagingEvent, chat, data) {
    db.users.findAndModify({
        query: { '_id': messagingEvent.sender.id },
        update: { 
            $set: { 'subscriptions.meetup': false }
        },
        new: false,
        upsert: false
    })
        .then((res) => {
            //console.log(`Response:\n${JSON.stringify(res, null, 2)}`);
            chat.say('Sorry to see you go. :( Unsubscribed from Meetup notifications.').then(() => {

            });
        }).catch((err) => { console.log(`Error updating User data: ${err}`);});
}

function feedbackFeature(messagingEvent, chat, data) {
    chat.conversation((convo) => {
        convo.sendTypingIndicator(1000).then(() => askType(convo));
    });

    const askType = (convo) => {
        convo.ask({
            text: 'I can pass on a message to my creators.\n' + 
                    'What would you like to send them?',
            quickReplies: [`Ask a question`, `Make a complaint`, `Send a message`, `Never mind.`]
        }, (payload, convo, data) => {
                // console.log(`Payload:\n ${JSON.stringify(payload, null, 2)}`);
                // console.log(`Data:\n ${JSON.stringify(data, null, 2)}`);

                if(!payload.message || !payload.message.quick_reply) {
                    convo.say(`Incorrect input. Try again!`).then(() => askType(convo));
                }
                else if(payload.message.text === 'Never mind.') {
                    convo.say(`Okay, no worries. :) Feedback cancelled.`).then(() => convo.end());
                }
                else {
                    const text = payload.message.text;
                    convo.say(`So you want to ${text.toLowerCase()}.`).then(() => askFeedback(convo, text));
                }
        });
    };

    const askFeedback = (convo, type) => {
        convo.ask({
            text: `Okay, I'm listening...`,
            quickReplies: ['Never mind.']
        }, (payload, convo, data) => {

            if(!payload.message || !payload.message.text) {
                convo.say(`Incorrect input. Try again!`).then(() => askType(convo));
            }
            else if(payload.message.quick_reply && payload.message.text === 'Never mind.') {
                convo.say(`Okay, no worries. :) Feedback cancelled.`).then(() => convo.end());
            }
            else {
                const text = payload.message.text;
                convo.getUserProfile().then((user) => {
                    db.feedbacks.save({
                        "userID": payload.sender.id,
                        "name": `${user.first_name} ${user.last_name}`,
                        "type": type,
                        "text": text
                    })
                    .then((res) => {
                        console.log(`Response:\n${JSON.stringify(res, null, 2)}`);
                        convo.say(`Thank you ${user.first_name}, I have passed this on to my creators.`).then(() => convo.end());
                        notifyAdmins(bot, 'feedback', text, user)
                        .catch((err) => { console.log(err) });
                    });
                });
            }
        }, options);
    };

    const options = {
        typing: true // Send a typing indicator before asking the question
    };
}

function newsletterFeature(messagingEvent, chat, data) {
    // if user hasn't subscribed yet, first item is newsletter subscription
    const subscribe = {
        title: 'Subscribe for our Messenger Newsletter',
        subtitle: 'Weekly newsletter about chatbots.',
        
        image_url: 'http://i.imgur.com/Q4D0c9x.png', //'http://static1.squarespace.com/static/565373abe4b01a919ada14a7/t/56543a93e4b0ae5fc67ba90b/1456740220665/',
        buttons: [
            {
                type: 'postback',
                title: 'Subscribe',
                payload: 'NEWSLETTER_SUBSCRIBED'
            }
        ]
    }

    const elements = [
        {
            title: 'Intro to Chatbots',
            subtitle: 'A collection of introductory articles.',
            image_url: 'http://i.imgur.com/MH6AN4B.png',
            buttons: [
                {
                    type: 'postback',
                    title: 'Get up to speed',
                    payload: 'NEWS_INTRO'
                }
            ]
        },
        {
            title: 'Curated articles',
            subtitle: 'The best articles from our past newsletters.',
            image_url: 'http://i.imgur.com/JIw2fSA.png',
            buttons: [
                {
                    type: 'postback',
                    title: 'Read only the best',
                    payload: 'NEWS_ARTICLES'
                }
            ]
        }
    ]
    
    db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
        if(!user.subscriptions.newsletter) {
            elements.unshift(subscribe);
        }
        chat.sendGenericTemplate(elements);
    }).catch((err) => { console.log(`Error updating User data: ${err}`);});
}

function newsletterSubscribed(messagingEvent, chat, data) {
    db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
        const options = { typing: true };
        const messages = [];
        const thanksMessage = {
            message: `Thanks for subscribing! :)`,
            options: null
        };
        messages.push(thanksMessage);

        // TODO: Send gift feature in separate function.
        function sendGift(msgs, gifttime) {
            if(gifttime) {
                msgs.push({
                    message: `Good news! I have a gift for you.`,
                    options: null
                });

                msgs.push({
                    message: `Please accept a 20% discount coupon for ChatbotConf 2016!`,
                    options: options
                });

                msgs.push({
                    message: {
                        attachment: 'image',
                        url: 'http://i.imgur.com/L79dIIW.png'
                    },
                    options: options
                });

                msgs.push({
                    message: `You can learn about building bots like me and meet other cool Botmasters.`,
                    options: options
                });

                msgs.push({
                    message: `You can find your coupon and manage your subscriptions later in the Settings menu.`,
                    options: options
                });

                msgs.push({
                    generic: [{
                        title: '20% discount for ChatbotConf 2016',
                        subtitle: 'But hurry only the first 10 ticket purchase gets the discount!',
                        image_url: 'http://i.imgur.com/Ri4d0mh.png',
                        buttons: [
                            {
                                type: 'web_url',
                                title: 'Claim your discount',
                                url: 'https://www.eventbrite.com/e/chatbotconf-2016-tickets-26919852002?discount=budabots10'
                            },
                            {
                                type: 'web_url',
                                title: `Go to Event Website`,
                                url: 'http://chatbotconf.com/'
                            }
                        ]
                    }],
                    options: options
                });

                return true;
            }
            else {
                return false;
            }
        }

        const firsttimer = !(user.onboarding['postback:NEWSLETTER_SUBSCRIBED']);
        if(firsttimer) {
            user.onboarding['postback:NEWSLETTER_SUBSCRIBED'] = true;
            if(sendGift(messages, config.gift)) {
                messages.push({
                    message: `You can type 'settings' or use the Menu below to get to the Settings menu.`,
                    options: options
                });
            }
            else {
                messages.push({
                    message: `You can manage your subscriptions later in the Settings menu.`,
                    options: options
                });
                messages.push({
                    message: `You can type 'settings' or use the Menu below to get to the Settings menu.`,
                    options: options
                });
            }
        }

       user.subscriptions.newsletter = true;

       db.users.findAndModify({
            query: { '_id': user._id },
            update: { 
                $set: user
            },
            new: true,
            upsert: false
        })
            .then((res) => {
                console.log(`Response:\n${JSON.stringify(res, null, 2)}`);

                chat.sayMultiple(messages);

            }).catch((err) => { console.log(`Error updating User data: ${err}`);});     
    }).catch((err) => { console.log(`Error getting User data: ${err}`);});
}

function newsletterUnsubscribed(messagingEvent, chat, data) {
    db.users.findAndModify({
        query: { '_id': messagingEvent.sender.id },
        update: { 
            $set: { 'subscriptions.newsletter': false}
        },
        new: false,
        upsert: false
    })
        .then((res) => {
            console.log(`Response:\n${JSON.stringify(res, null, 2)}`);
            chat.say('Sorry to see you go. :( Unsubscribed from newsletter.').then(() => {
                
            });
        }).catch((err) => { console.log(`Error updating User data: ${err}`);});
}

function settingsFeature(messagingEvent, chat, data) {
    const newsletterSubscribed = {
        title: 'You are subscribed for the newsletter.',
        subtitle: `You'll get a newsletter once a week.`,
        image_url: 'http://i.imgur.com/Q4D0c9x.png',
        buttons: [
            {
                type: 'postback',
                title: 'Unsubscribe',
                payload: 'NEWSLETTER_UNSUBSCRIBED'
            }
        ]
    };

    const meetupSubscribed = {
        title: 'You are subscribed to meetup notifications.',
        subtitle: `You'll get notified about all upcoming meetups.`,
        image_url: 'http://i.imgur.com/O0ZiM8v.png',
        buttons: [
            {
                type: 'postback',
                title: 'Unsubscribe',
                payload: 'MEETUP_UNSUBSCRIBED'
            }
        ]
    };

    const newsletterUnSubscribed = {
        title: 'Subscribe for our newsletter.',
        subtitle: 'Weekly newsletter about chatbots.',
        image_url: 'http://i.imgur.com/Q4D0c9x.png',
        buttons: [
            {
                type: 'postback',
                title: 'Subscribe',
                payload: 'NEWSLETTER_SUBSCRIBED'
            }
        ]
    };

    const meetupUnSubscribed = {
        title: 'Subscribe for Meetup notifications',
        subtitle: `Get notified as soon as we publish a new meetup. (once or twice a month)`,
        image_url: 'http://i.imgur.com/O0ZiM8v.png',
        buttons: [
            {
                type: 'postback',
                title: 'Subscribe',
                payload: 'MEETUP_SUBSCRIBED'
            }
        ]
    };    

    db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
        const elements = [];
        if(!user.subscriptions.newsletter) {
            elements.push(newsletterUnSubscribed);
        }
        else {
            elements.push(newsletterSubscribed);
        }
        if(!user.subscriptions.meetup) {
            elements.push(meetupUnSubscribed);
        }
        else {
            elements.push(meetupSubscribed);
        }
        if( config.gift && user.onboarding['postback:NEWSLETTER_SUBSCRIBED'] ) {
            elements.push({
                title: '20% discount for ChatbotConf 2016',
                subtitle: 'But hurry only the first 10 ticket purchase gets the discount!',
                image_url: 'http://i.imgur.com/Ri4d0mh.png',
                buttons: [
                    {
                        type: 'web_url',
                        title: 'Claim your discount',
                        url: 'https://www.eventbrite.com/e/chatbotconf-2016-tickets-26919852002?discount=budabots10'
                    },
                    {
                        type: 'web_url',
                        title: `Go to Event Website`,
                        url: 'http://chatbotconf.com/'
                    }
                ]
            });
        }
        chat.sendGenericTemplate(elements);
    }).catch((err) => { console.log(`Error updating User data: ${err}`);});
}

// Welcome message
bot.on('postback:GET_STARTED', greetingFeature);
bot.hear(['hello', 'hi', /hey( there)?/i, 'yo', 'h', 'restart'], greetingFeature);

// Meetup
bot.on('postback:MEETUP', meetupFeature);
bot.hear(['meetup', 'meetups', 'next'], meetupFeature);

// Meetup question
bot.on('postback:MEETUP_QUESTION', meetupQuestionFeature);

// Meetup Agenda
bot.on('postback:MEETUP_AGENDA', meetupAgendaFeature);
bot.hear(['agenda'], meetupAgendaFeature);

// Meetup Subscribed
bot.on('postback:MEETUP_SUBSCRIBED', meetupSubscribed);

// Meetup UNsubscribed
bot.on('postback:MEETUP_UNSUBSCRIBED', meetupUnsubscribed);

// Leave a Feedback
bot.on('postback:FEEDBACK', feedbackFeature);
bot.hear(['feedback', 'message'], feedbackFeature);

// Newsletter
bot.on('postback:NEWSLETTER', newsletterFeature);
bot.hear(['articles', 'read', 'news', 'newsletter'], newsletterFeature);

// Newsletter subscribed
bot.on('postback:NEWSLETTER_SUBSCRIBED', newsletterSubscribed);

// Newsletter unsubscribed
bot.on('postback:NEWSLETTER_UNSUBSCRIBED', newsletterUnsubscribed);

// Settings
bot.on('postback:SETTINGS', settingsFeature);
bot.hear(['settings', 'subscriptions', 'subscription', 'coupon'], settingsFeature);

// Any other postback: Article pages
bot.on('postback', (messagingEvent, chat, data) => {
    const payload = messagingEvent.postback.payload;
    if(payload.includes('SHOW_INTRO')) {
        // Send the given page of Intro to Chatbots
        const page = payload.split('_')[2];
        sendArticles(db, chat, 'intro', page);
    }
    else if(payload.includes('SHOW_ARTICLE')) {
        // Send the given page of Articles
        const page = payload.split('_')[2];
        sendArticles(db, chat, 'article', page);
    }
    else if(payload.includes('NEWS_INTRO')) {
        // Send first page of Intro to Chatbots
        sendArticles(db, chat, 'intro', 1);
    }
    else if(payload.includes('NEWS_ARTICLES')) {
        // Send first page of Articles
        sendArticles(db, chat, 'article', 1);
    }
});

// Any other text, including NLP
bot.hear(/(.*)/, (messagingEvent, chat, data) => {
    if(!data.captured) {

        function sendLatestMeetupQuestions() {
                const now = new Date();
                let today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                let tomorrow = new Date(today + 24 * 60 * 60 * 1000).getTime();
                
                // MeetupDay for testing - Comment out in production
                // today = new Date(2016, 8, 6).getTime();
                // tomorrow = new Date(2016, 8, 7).getTime();
                
                db.meetups.find({ "endtime": { $gte : today, $lte : tomorrow } }).sort({"time": -1}).limit(1).then((todaysMeetup) => {
                    if(todaysMeetup.length <= 0) {
                        return chat.say('There are no meetups scheduled today, boss. :)');
                    }
                    const talks = todaysMeetup[0].talks;
                    if(talks.length <= 0) {
                        return chat.say(`Something's wrong. Ask the developer.`);
                    }
                    const questionTalks = talks.filter((talk) => {
                        return talk.questions.length > 0;
                    });

                    if(questionTalks.length > 0) {
                        const talkTitles = questionTalks.map((talk) => {
                            return talk.title.slice(14, 14+16) + '...';
                        });
                        
                        const quickReplyArray = Array.from(talkTitles);
                        quickReplyArray.push('Never mind');

                        function askQuestions(convo) {
                            convo.ask({
                                text: 'Hi, Boss! 8)\nPlease choose a talk:',
                                quickReplies: quickReplyArray
                            }, (payload, convo, data) => {
                                if(!payload.message || !payload.message.quick_reply) {
                                    convo.say(`Incorrect input.`).then(() => askQuestions(convo));
                                }
                                else if(payload.message.text === 'Never mind') {
                                    convo.say(`Okay, Boss. No worries. ;)`).then(() => convo.end());
                                }
                                else {
                                    const text = payload.message.text;
                                    convo.say(`Questions incoming...`).then(() => {

                                        const pickedTalk = questionTalks[questionTalks.findIndex((talk) => {
                                            return talk.title.includes(text.slice(0, -3));
                                        })];

                                        const questions = [];
                                        const userProfiles = [];
                                        pickedTalk.questions.forEach((question) => {
                                            userProfiles.push(convo.getUserProfile(question.userID));
                                        });

                                        Promise.all(userProfiles).then((profiles) => {
                                            console.log(profiles);
                                            for(let i=0; i<pickedTalk.questions.length; ++i) {
                                                questions.push({
                                                    message: `${profiles[i].first_name} ${profiles[i].last_name} asks: `+
                                                            `"${pickedTalk.questions[i].question}"`,
                                                    option: null
                                                });
                                            }

                                            convo.sayMultiple(questions).then(() => {
                                                convo.end();
                                            });
                                        });     
                                    });
                                }
                            });
                        };

                        return chat.conversation((convo) => {
                            askQuestions(convo);
                        });
                    }
                    else {
                        return chat.say(`I haven't received any meetup questions yet, boss. :)`);
                    }
                });
        }

        function NLP(text) {
                const menuRegex = /.*\s*[f|F]loy*/;
                const introRegex = /.*((n|N)ame|(c|C)all|(w|W)ho('re|\sare)\s(y|Y)ou).*/;
                const creatorRegex = /.*(creat.*|make.*|made.*).*/;
                const locationRegex = /.*((w|W)here.*you[^r]).*/;
                const questionRegex = /(q|Q)uestions/;

                if(menuRegex.test(text)) {
                    return 'menu';
                }
                else if(introRegex.test(text)) {
                    return 'intro';
                }
                else if(creatorRegex.test(text)) {
                    return 'creator';
                }
                else if(locationRegex.test(text)) {
                    return 'location';
                }
                else if(questionRegex.test(text)) {
                    const isAdmin = config.admins.some((admin) => {
                        return admin.userID == messagingEvent.sender.id;
                    });

                    if(isAdmin) {
                        return 'question';
                    }
                    else {
                        return 'null';
                    }
                }
                else {
                    return 'null';
                }

                // Who are you? Who, who, who, who? Easter egg
                // Link: https://youtu.be/PdLIerfXuZ4
            }

            const userId = messagingEvent.sender.id;
            const message = messagingEvent.message.text;
            switch( NLP(message) ) {
                case 'menu':
                    chat.getUserProfile(userId).then((user) => {
                        chat.say({
                            text: `Hi, ${user.first_name}! How may I assist you?`,
                            buttons: [
                                { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
                                { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
                                { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
                            ]
                        });
                    });
                    break;
                case 'intro':
                    const introMessages = [
                        'My name is Bot 207, at your service.',
                        'My designation is Bot 207 bot some of my fellow bots call me Floyd.',
                        'My designation is Bot 207 but you can call me Floyd.',
                    ];
                    chat.say(pickRandomElement(introMessages));
                    break;
                case 'creator':
                    const creatorMessages = [
                        `I was made by the humans at Budapest Bots. I'm not sure who made them though.`,
                        `Humans at Budapest Bots made me in their image, not sure how well I match.`,
                        `My creators are humans at Budapest Bots.`,
                    ];
                    chat.say(pickRandomElement(creatorMessages));
                    break;
                case 'location':
                    const locationMessages = [
                        `I'm in many places, in Facebook Messenger, the cloud and hopefully after some time, also in your <3 .`
                    ];
                    chat.say(pickRandomElement(locationMessages));
                    break;
                case 'question':
                    sendLatestMeetupQuestions();
                    break;
                default:
                    chat.sayMultiple(pickRandomElement(defaultMessages)).then(() => {
                        const commenceRetargeting = bot.targetUser(userId);
                        if(commenceRetargeting) {
                            chat.say({
                                text: `I am here to assist you with meetup and chatbot related stuff.\n` + 
                                `I suppose we could talk about these topics:`,
                                buttons: [
                                    { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
                                    { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
                                    { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
                                ]
                            }, { typing: true }).then(() => {
                                bot.untargetUser(userId);
                            });
                        }
                    });
            }
    }
});

bot.on('attachment', (messagingEvent, chat, data) => {
    const attachmentMessages = [
        `Right back at ya! (y)`,
        `Cool! (y)`,
        `Awesome! (y)`,
        `Love it! (y)`,
        `Here's a "Like" for you. (y)`
    ]
    chat.say(pickRandomElement(attachmentMessages));
});


module.exports = bot;
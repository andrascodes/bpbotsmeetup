'use strict';

const express = require('express');
const Promise = require('bluebird');

const config = require('../config');
const app = express();

const BootBot = require('../bootbot/lib/BootBot.js');

const pmongo = require('promised-mongo');
const db = pmongo(config.dbaddress,{ authMechanism: 'ScramSHA1' }, ['users', 'meetups', 'feedbacks', 'articles']);

const bot = new BootBot({
  accessToken: config.fbPageAccessToken,
  verifyToken: config.verifyToken,
  appSecret: config.appSecret,
  app: app,
  db: db
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

// Change images and texts so they are production ready.
// Use leave feedback to contact the organizers. Maybe ask for their contacts...


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
                        { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
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
                { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
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
                const now = new Date();
                let today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                let tomorrow = new Date(today + 24 * 60 * 60 * 1000);

                // MeetupDay for testing - Comment out in production
                today = new Date(2016, 8, 6).getTime();
                tomorrow = new Date(2016, 8, 7).getTime();

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
                incompleteMessages.push(db.users.findOne({ '_id': messagingEvent.sender.id }));
   
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
                            image_url: 'https://fbcdn-sphotos-a-a.akamaihd.net/hphotos-ak-xpl1/v/t1.0-9/13887109_643758782447215_5350140108993128253_n.jpg?oh=e45418ff3db383f90cd4586a0974fe96&oe=5848A9CE&__gda__=1480421954_4fd7a72409ee195e60e86b2a8dd96fb7',
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
                            image_url: 'http://faninfo.hu/library/images/0x6368/thumbnail/714.jpg',
                            buttons: [
                                {
                                    type: 'web_url',
                                    title: 'Show on map',
                                    url: meetupLocationUrl
                                },
                            ]
                        }
                    ];

                    if(todaysMeetup) {
                        elements.unshift({
                            title: todayTitle,
                            subtitle: todaySubtitle,
                            image_url: 'http://i.giphy.com/MTclfCr4tVgis.gif',
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
                    const user = messages[9];
                    console.log(user);
                    const isSubscribed = user.subscriptions.meetup;
                    if(!isSubscribed) {
                        elements.push({
                            title: 'Subscribe for Meetup notifications',
                            subtitle: 'You get notified as soon as we publish a new meetup.',
                            
                            image_url: 'http://i.giphy.com/l41m4CnsZLzlYYbT2.gif', //'http://static1.squarespace.com/static/565373abe4b01a919ada14a7/t/56543a93e4b0ae5fc67ba90b/1456740220665/',
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
                        const talks = nextMeetup.agenda
                            .filter((agendaItem) => {
                                return agendaItem.includes('Presentation') || agendaItem.includes('demo');
                            })
                            .map((agendaItem) => {
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
                            convo.say(`Question cancelled...`).then(() => convo.end());
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
                            convo.say(`Question cancelled...`).then(() => convo.end());
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
}

function meetupSubscribed(messagingEvent, chat, data) {
    db.users.findAndModify({
        query: { '_id': messagingEvent.sender.id },
        update: { 
            $set: { 'subscriptions.meetup': true }
        },
        new: false,
        upsert: false
    })
        .then((res) => {
            //console.log(`Response:\n${JSON.stringify(res, null, 2)}`);
            chat.say('Thanks for subscribing!').then(() => {
                chat.say({
                    attachment: 'image',
                    url: 'http://i.giphy.com/3o85xqwxtzdcX5c5Zm.gif'
                });
            });
        }).catch((err) => { console.log(`Error updating User data: ${err}`);});
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
            chat.say('Sorry to see you go. :( ').then(() => {
                chat.say({
                    attachment: 'image',
                    url: 'http://i.giphy.com/3oEduQoZbu9hX1x720.gif'
                });
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
        }, options);
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
                        notifyAdmins(bot, 'feedback', text, `${user.first_name} ${user.last_name}`)
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
        
        image_url: 'http://i.giphy.com/l41m4CnsZLzlYYbT2.gif', //'http://static1.squarespace.com/static/565373abe4b01a919ada14a7/t/56543a93e4b0ae5fc67ba90b/1456740220665/',
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
            image_url: 'https://cdn-images-1.medium.com/max/2000/1*VEjac4_01wYvknGu3k4DNw.png',
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
            image_url: 'https://cdn-images-1.medium.com/max/2000/1*VEjac4_01wYvknGu3k4DNw.png',
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

       const firsttimer = !(user.onboarding['postback:NEWSLETTER_SUBSCRIBED']);
        if(firsttimer) {
            user.onboarding['postback:NEWSLETTER_SUBSCRIBED'] = true;
            messages.push({
                message: `Good news! I have a gift for you.`,
                options: null
            });
            messages.push({
                message: `Please accept a 20% discount coupon for ChatbotConf 2016!`,
                options: options
            });
            messages.push({
                message: {
                    attachment: 'image',
                    url: 'http://i.imgur.com/L79dIIW.png'
                },
                options: options
            });
            messages.push({
                message: `You can learn about building bots like me and meet other cool Botmasters.`,
                options: options
            });

            messages.push({
                message: `You can find your coupon and manage your subscription later in the Settings menu.`,
                options: options
            });

            messages.push({
                generic: [{
                    title: '20% discount for ChatbotConf 2016',
                    subtitle: 'But hurry only the first 10 ticket purchase gets the discount!',
                    image_url: 'https://fbcdn-sphotos-a-a.akamaihd.net/hphotos-ak-xaf1/t31.0-8/13661900_1175443692476186_1569793387566369106_o.png',
                    buttons: [
                        {
                            type: 'web_url',
                            title: 'Claim your discount',
                            url: 'https://www.eventbrite.com/e/chatbotconf-2016-tickets-26919852002?discount=budabots10'
                        }
                    ]
                }],
                options: options
            });   
        }

        if(!firsttimer) {
            messages.push({
                message: `You can manage your subscription later in the Settings menu.`,
                options: options
            });
        }

        messages.push({
            message: `You can type 'settings or use the Menu below to get to the Settings menu.`,
            options: options
        });
        

       user.subscriptions.newsletter = true;
       console.log(user);

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
            chat.say('Sorry to see you go. :( ').then(() => {
                chat.say({
                    attachment: 'image',
                    url: 'http://i.giphy.com/3oEduQoZbu9hX1x720.gif'
                });
            });
        }).catch((err) => { console.log(`Error updating User data: ${err}`);});
}

function settingsFeature(messagingEvent, chat, data) {
    const newsletterSubscribed = {
        title: 'You are subscribed for the newsletter.',
        subtitle: 'Weekly newsletter about chatbots.',
        image_url: 'http://i.giphy.com/3oEduM0FOpx8IrbSEw.gif',
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
        subtitle: 'You get notified about upcoming meetups.',
        image_url: 'http://i.giphy.com/3oEduM0FOpx8IrbSEw.gif',
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
        image_url: 'http://i.giphy.com/3oEduM0FOpx8IrbSEw.gif',
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
        subtitle: `You get notified as soon as we publish a new meetup.`,
        image_url: 'http://i.giphy.com/3oEduM0FOpx8IrbSEw.gif',
        buttons: [
            {
                type: 'postback',
                title: 'Subscribe',
                payload: 'MEETUP_SUBSCRIBED'
            }
        ]
    };

    const chatbotConfDiscount = {
        title: '20% discount for ChatbotConf 2016',
        subtitle: 'But hurry only the first 10 ticket purchase gets the discount!',
        image_url: 'https://fbcdn-sphotos-a-a.akamaihd.net/hphotos-ak-xaf1/t31.0-8/13661900_1175443692476186_1569793387566369106_o.png',
        buttons: [
            {
                type: 'web_url',
                title: 'Claim your discount',
                url: 'https://www.eventbrite.com/e/chatbotconf-2016-tickets-26919852002?discount=budabots10'
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
        if(user.onboarding['postback:NEWSLETTER_SUBSCRIBED']) {
            elements.push(chatbotConfDiscount);
        }
        chat.sendGenericTemplate(elements);
    }).catch((err) => { console.log(`Error updating User data: ${err}`);});
}

// Welcome message
bot.on('postback:GET_STARTED', greetingFeature);
bot.hear(['hello', 'hi', /hey( there)?/i, 'yo', 'h'], greetingFeature);
    
    // db.users.findOne({ "_id": messagingEvent.sender.id }).then((user) => {
    //     const first_name = user['first_name'];
    //     const firsttimer = !(user.onboarding['postback:GET_STARTED']);

    //     const firsttimerMessages = [
    //         {
    //             message: `Hi ${first_name}, it's nice to meet you!`,
    //             options: null
    //         },
    //         {
    //             message: `I am Bot 207, but you can call me Floyd.`,
    //             options: { typing: true }
    //         },
    //         {
    //             message: {
    //                 text: `I am here to assist you with meetup and chatbot related stuff.`,
    //                 buttons: [
    //                     { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
    //                     { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
    //                     { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
    //                 ]
    //             },
    //             options: { typing: true }
    //         }
    //     ];

    //     const simpleGreeting = {
    //         text: `Hi, ${first_name}! How may I assist you?`,
    //         buttons: [
    //             { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
    //             { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
    //             { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
    //         ]
    //     };

    //     if(firsttimer) {
    //         user.onboarding['postback:GET_STARTED'] = true;
    //         chat.sayMultiple(firsttimerMessages).then(() => {
    //             db.users.findAndModify({
    //                 query: { "_id": user['_id'] },
    //                 update: { $set: user },
    //                 new: false,
    //                 upsert: false
    //             })
    //             .then().catch((err) => { console.log(`Error updating User data: ${err}`);});
    //         });
            
    //     }
    //     else {
    //         chat.say(simpleGreeting);
    //     }
    // }).catch((err) => { console.log(`Error getting User data: ${err}`);});

// Meetup
bot.on('postback:MEETUP', meetupFeature);
bot.hear(['meetup', 'Meetup', 'meetups'], meetupFeature);

// Meetup question
bot.on('postback:MEETUP_QUESTION', meetupQuestionFeature);

// Meetup Agenda
bot.on('postback:MEETUP_AGENDA', meetupAgendaFeature);

// Meetup Subscribed
bot.on('postback:MEETUP_SUBSCRIBED', meetupSubscribed);

// Meetup UNsubscribed
bot.on('postback:MEETUP_UNSUBSCRIBED', meetupUnsubscribed);

// Leave a Feedback
bot.on('postback:FEEDBACK', feedbackFeature);

// Newsletter
bot.on('postback:NEWSLETTER', newsletterFeature);

// Newsletter subscribed
bot.on('postback:NEWSLETTER_SUBSCRIBED', newsletterSubscribed);

// Newsletter unsubscribed
bot.on('postback:NEWSLETTER_UNSUBSCRIBED', newsletterUnsubscribed);

// Settings
bot.on('postback:SETTINGS', settingsFeature);
bot.hear(['settings', 'Settings'], settingsFeature);

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
        function NLP(text) {
            const menuRegex = /.*\s*[f|F]loy*/;
            const introRegex = /.*((n|N)ame|(c|C)all|(w|W)ho('re|\sare)\s(y|Y)ou).*/;
            const creatorRegex = /.*(creat.*|make.*|made.*).*/;
            const locationRegex = /.*((w|W)here.*you[^r]).*/;

            if(menuRegex.test(text)) {
                console.log('Floyd');
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


module.exports = bot;
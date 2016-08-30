'use strict';

const express = require('express');
const Promise = require('bluebird');

const config = require('../config');
const app = express();

const BootBot = require('../bootbot/lib/BootBot.js');

const pmongo = require('promised-mongo');
const db = pmongo(config.dbaddress, ['users', 'meetups', 'feedbacks', 'articles']);

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

// TODO: (DB collections: users, messages, messageTexts, meetups (questions embedded), feedback, surveys)
// Meetup questions Schema redefinition
// create rules for Agenda, so I can filter for that when extracting it from description
// Don't filter when submitting questions, latestMeetup will have the eligible talks in questions property

// Save events to DB
// Save feedback to DB.
// Read survey questions from DB and save answers to DB.
    // only display survey if we have some.
// Save meetup questions to meetup.questions embedded doc.

// Change 'See next meetup' to 'Join today's meetup' when its meetupday.
// Subscribe with email to newsletter (Mailchimp)

// Import messageText from DB.
// Get articles for the Intro to Chatbots section.

// Welcome message
bot.on('postback:GET_STARTED', (messagingEvent, chat) =>{
    // Send a text message with buttons
    chat.getUserProfile().then((user) => {
        chat.say({
            text: `Hi, ${user.first_name}! How can I help you?`,
            buttons: [
                { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
                { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
                { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
            ]
        });
    });
});

bot.hear(['hello', 'hi', /hey( there)?/i], (messagingEvent, chat) => {
    // Send a text message with buttons
    chat.getUserProfile().then((user) => {
        chat.say({
            text: `Hi, ${user.first_name}! How can I help you?`,
            buttons: [
                { type: 'postback', title: 'See next meetup', payload: 'MEETUP' },
                { type: 'postback', title: 'Read chatbot news', payload: 'NEWSLETTER' },
                { type: 'postback', title: 'Leave feedback', payload: 'FEEDBACK' },
                
            ]
        });
    });
});

// Meetup
bot.on('postback:MEETUP', (messagingEvent, chat) =>{
    
                        // getMeetupInfo(db) gets latest meetup object
                        // if no upcoming meetups, then 
                                    //      send no upcoming meetups yet, subscribe message
                        // then check if it is today
                        //      if yes unshift meetupDay elements
                        //      if not send with
                        // MeetupInfo element: name, date, time, locationname, agenda postback, Event Page link
                        // Location element: Location name, address, url
    // if !user.meetupSubscribed: push Subscribe for Notis element

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
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const tomorrow = new Date(today + 24 * 60 * 60 * 1000);

                const meetupDay = new Date(2016, 8, 6).getTime();
                const meetupNextDay = new Date(2016, 8, 7).getTime();
                // Check if meetup is today
                const todaysMeetup = (nextMeetup.time >= meetupDay && nextMeetup.time <= meetupNextDay);

                const incompleteMessages = [];
                incompleteMessages.push(getCompletedMessage(`{{meetup.title}}`, chat));
                incompleteMessages.push(getCompletedMessage(`{{meetup.month.long}} {{meetup.day.num}}, ` + 
                    `{{meetup.start}}-{{meetup.end}} at {{meetup.locationName}}`, chat));
                incompleteMessages.push(getCompletedMessage('{{meetup.calendarUrl}}', chat));
                incompleteMessages.push(getCompletedMessage(`Venue: {{meetup.locationName}}`, chat));
                incompleteMessages.push(getCompletedMessage(`{{meetup.location.address}}\n {{meetup.location.city}}`, chat));
                if(todaysMeetup) {
                    incompleteMessages.push(getCompletedMessage('{{meetup.start}} at {{meetup.locationName}}', chat));
                    incompleteMessages.push(getCompletedMessage(`Don't forget to submit your questions to the speakers.\n` +
                        `Also make sure you RSVP!`, chat));
                    incompleteMessages.push(getCompletedMessage('{{meetup.locationUrl}}', chat));
                    incompleteMessages.push(getCompletedMessage('{{meetup.url}}', chat));
                }
                incompleteMessages.push(db.users.findOne({ '_id': messagingEvent.sender.id }));
   
                Promise.all(incompleteMessages).then((messages) => {   
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
});

// Meetup question
bot.on('postback:MEETUP_QUESTION', (messagingEvent, chat) =>{
    // TODO: Cancel buttons
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
                    quickReplyArray.push('Cancel');

                    convo.ask({
                        text: 'Which talk is your question connected to?',
                        quickReplies: quickReplyArray
                    }, (payload, convo, data) => {
                        if(!payload.message || !payload.message.quick_reply) {
                            convo.say(`Incorrect input. Try again!`).then(() => askWhichTalk(convo, talks, typingTime));
                        }
                        else if(payload.message.text === 'Cancel') {
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
                        quickReplies: ['Cancel']
                    }, (payload, convo, data) => {
                        if(!payload.message || !payload.message.text) {
                            convo.say(`Incorrect input. Try again!`).then(() => placeQuestion(convo, talkName));
                        }
                        else if(payload.message.quick_reply && payload.message.text === 'Cancel') {
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
});

// Meetup Agenda
bot.on('postback:MEETUP_AGENDA', (messagingEvent, chat) =>{
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
                const typingTimeStart = Math.floor(((start.split(' ').length)/3) * 1000);

                chat.say(start).then(() => {
                    const agenda = nextMeetup.agenda.reduce((prev, curr) => {
                        return prev + '\n' + curr;
                    }, '');

                    const typingTimeAgenda = Math.floor(((agenda.split(/[-\n\s]/).length)/4) * 1000);

                    chat.say(agenda, { typing: typingTimeStart }).then(() => {
                        chat.say({
                            text: `You can RSVP on Meetup.com.`,
                            buttons: [
                                { type: 'web_url', title: 'RSVP on Meetup.com', url: `${nextMeetup.link}` },
                            ]
                        }, { typing: typingTimeAgenda });
                    });
                });
            }
        });
});

// Meetup Subscribed
bot.on('postback:MEETUP_SUBSCRIBED', (messagingEvent, chat) =>{
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
});

// Meetup UNsubscribed
bot.on('postback:MEETUP_UNSUBSCRIBED', (messagingEvent, chat) =>{
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
});

// Leave a Feedback
bot.on('postback:FEEDBACK', (messagingEvent, chat) => {

    chat.conversation((convo) => {
        convo.sendTypingIndicator(1000).then(() => askType(convo));
    });

    const askType = (convo) => {
        convo.ask({
            text: 'How can we help you?',
            quickReplies: [`Ask a question`, `Make a complaint`, `Send a message`, `Cancel`]
        }, (payload, convo, data) => {
                // console.log(`Payload:\n ${JSON.stringify(payload, null, 2)}`);
                // console.log(`Data:\n ${JSON.stringify(data, null, 2)}`);

                if(!payload.message || !payload.message.quick_reply) {
                    convo.say(`Incorrect input. Try again!`).then(() => askType(convo));
                }
                else if(payload.message.text === 'Cancel') {
                    convo.say(`Feedback cancelled...`).then(() => convo.end());
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
            quickReplies: ['Cancel']
        }, (payload, convo, data) => {

            if(!payload.message || !payload.message.text) {
                convo.say(`Incorrect input. Try again!`).then(() => askType(convo));
            }
            else if(payload.message.quick_reply && payload.message.text === 'Cancel') {
                convo.say(`Feedback cancelled...`).then(() => convo.end());
            }
            else {
                const text = payload.message.text;
                db.feedbacks.save({
                    "userID": payload.sender.id,
                    "type": type,
                    "text": text
                })
                    .then((res) => {
                        console.log(`Response:\n${JSON.stringify(res, null, 2)}`);
                        convo.say(`Got it. We'll get back to you ASAP.`).then(() => convo.end());
                    });
            }
        }, options);
    };

    const options = {
        typing: true // Send a typing indicator before asking the question
    };
});

// Newsletter
bot.on('postback:NEWSLETTER', (messagingEvent, chat) =>{
    // Send an attachment
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
});

// Intro to Chatbots
bot.on('postback:NEWS_INTRO', (messagingEvent, chat) => {
    sendArticles(db, chat, 'intro', 1);
});

// Curated articles
bot.on('postback:NEWS_ARTICLES', (messagingEvent, chat) => {
    sendArticles(db, chat, 'article', 1);
});

// Newsletter subscribed
bot.on('postback:NEWSLETTER_SUBSCRIBED', (messagingEvent, chat) => {
    db.users.findOne({ '_id': messagingEvent.sender.id }).then((user) => {
       let firsttimer = false;
       // image thanks
       let thanksMessage = {
            attachment: 'image',
            url: 'http://i.giphy.com/3o85xqwxtzdcX5c5Zm.gif'
        };
       if(!user.onboarding['postback:NEWSLETTER_SUBSCRIBED']) {
           firsttimer = true;
           user.onboarding['postback:NEWSLETTER_SUBSCRIBED'] = true;
           // edit image to template
           thanksMessage = {
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
       }

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

                chat.say('Thanks for subscribing!').then(() => {
                    if(firsttimer) {
                        chat.say(`Here's a gift as a token of our appreciation.`, { typing: true }).then(() => {
                            // send template
                            chat.sendGenericTemplate([thanksMessage], { typing: true }).then(() => {
                                chat.say(`You can find it later in the 'settings'.`);
                            });
                        });
                    }
                    else {
                        // send image
                        chat.say(thanksMessage);
                    }            
                });

            }).catch((err) => { console.log(`Error updating User data: ${err}`);});
    });
});

bot.on('postback:NEWSLETTER_UNSUBSCRIBED', (messagingEvent, chat) => {
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
});

bot.on('postback', (messagingEvent, chat, data) => {
    const payload = messagingEvent.postback.payload;
    if(payload.includes('SHOW_INTRO')) {
        const page = payload.split('_')[2];
        sendArticles(db, chat, 'intro', page);
    }
    else if(payload.includes('SHOW_ARTICLE')) {
        const page = payload.split('_')[2];
        sendArticles(db, chat, 'article', page);
    }
});

bot.on('postback:SETTINGS', (messagingEvent, chat) => {
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
});

bot.hear('settings', (messagingEvent, chat) => {
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
});

bot.hear(/(.*)/, (messagingEvent, chat, data) => {
    if(!data.captured) {
        chat.say(`I have no idea what you're talking about. 😳`).then(() => {
            chat.say({
                attachment: 'image',
                url: 'http://i.giphy.com/3oEduQoZbu9hX1x720.gif'
            });
        });
    }
});

module.exports = bot;
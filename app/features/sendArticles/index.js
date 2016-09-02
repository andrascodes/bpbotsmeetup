'use strict';

const Promise = require('bluebird');

// TODO: Summary feature
// Can be a series of messages. Subsequent messages.
    // How to create callbacks for an array? Dynamically, n number of times.
    // n actions completing after another.
    // https://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html

// Or they can be conversation. Maybe they always should start a Bootbot conversation?
// Tapping postback SUMMARY_ARTICLEID ?
    // startSummary()
    // load all summary messages from db
    // startconversation
    // define rules
    // a summaryMessage should have all information what happens when a quick reply is clicked or something else happens
        // should operate mostly with quick replies
    // summaryMessages should define the messageFlow

// Tricky: How to define the rules by iterating through the summaryMessages?
    // SOLUTION

    // chat.say multiple messages in a Series
    // http://www.datchley.name/promise-patterns-anti-patterns/

    // function sendFirst() { return Promise.resolve(chat.say('Hi!')); }
    // function sendSecond() { return Promise.resolve(chat.say('Hello!', { typing: true })); }
    // function sendThird() { return Promise.resolve(chat.say('How are you?', { typing: true })); }

    // const fnList = [sendFirst, sendSecond, sendThird];

    // function pseries(list) {  
    //     var p = Promise.resolve();
    //     return list.reduce(function(pacc, fn) {
    //         return pacc = pacc.then(fn);
    //     }, p);
    // }

    // pseries(fnList);

    // How to do this for a conversation?
    




const defaultImageLink = `https://tctechcrunch2011.files.wordpress.com/2016/04/facebook-chatbot-alt.png`;

module.exports = function sendArticles(db, chat, type, page) {
    db.articles.find({ "type": type }).limit(9).skip( (page - 1) * 9 ).toArray()
        .then((articles) => {
            const elements = [];
            articles.forEach((article) => {
                if(!article.image_url) {
                    article.image_url = defaultImageLink;
                }

                elements.push({
                    title: article.title,
                    subtitle: article.subtitle,
                    image_url: article.image_url,
                    buttons: [
                        {
                            type: 'web_url',
                            url: article.link,
                            title: 'Read the article'
                        }
                    ]
                });
            });
            
            const showMore = {
                title: `It's not over yet.`,
                subtitle: `You can find more amazing articles like this, just click the 'Show more' button.`,
                image_url: defaultImageLink,
                buttons: [
                    {
                        type: 'postback',
                        payload: `SHOW_${type.toUpperCase()}_${page+1}`,
                        title: 'Show more'
                    }
                ]
            };

            if(elements.length === 9) {
                elements.push(showMore);
            }

            chat.sendGenericTemplate(elements);
        });
}
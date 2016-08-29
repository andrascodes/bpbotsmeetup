'use strict';

const Promise = require('bluebird');

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
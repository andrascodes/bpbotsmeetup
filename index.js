'use strict'

  const bot = require('./app');

  // process.env.PORT lets the port be set by Heroku
	const PORT = process.env.PORT;

  //Start bot after DB connection
  bot.start(PORT);
	

  //   // // Subscribe to page
  //   // request.post(`https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=${config.fbPageAccessToken}`, 
  //   // function (err, res, body) {
  //   //     if (err) {
  //   //         console.log('Could not subscribe to page messages');
  //   //     }
  //   //     else {
  //   //         console.log('Successfully subscribed to Facebook events:', body);
  //   //     }
  //   // });

  // });
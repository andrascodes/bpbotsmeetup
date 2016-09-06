'use strict';

const config = {
	fbPageId: (process.env.FB_PAGE_ID && Number(process.env.FB_PAGE_ID)),
	fbPageAccessToken: process.env.FB_PAGE_TOKEN,
	verifyToken: process.env.FB_VERIFY_TOKEN,
	appSecret: process.env.FB_APP_SECRET,
	dbaddress: process.env.MONGODB_URI,
	dashbotKey: process.env.DASHBOT_API_KEY,
	botmetricsKey: process.env.BOTMETRICS_API_KEY,
    admins: [
        {
            // Prod
            name: "Mátyás Szaszkó",
            userID: '1126342277412426'
        },
        {
            // Test
            name: "András Szücs",
            userID: '1388594137833781'
        },
        {
            // Prod
            name: "András Szücs",
            userID: '1135224343200481'
        },
        {
            // Bots
            name: "András Szücs",
            userID: '1345023502204683'
        },
        {
            // Bots
            name: "Mátyás Szaszkó",
            userID: '1210001542396710'
        }
    ],
    gift: true
}

if(process.env.DEVELOPMENT) {
    config.dbaddress = process.env.DBADDRESS_DEV;
}

// Exit if either of the config values are missing.
if (!(config.fbPageId && 
        config.fbPageAccessToken && 
        config.verifyToken &&
        config.appSecret &&
        config.dbaddress &&
        config.dashbotKey &&
        config.botmetricsKey)) {
    throw new Error('Missing config values.');
}

module.exports = config;
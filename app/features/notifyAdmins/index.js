'use strict';

// TODO:
// Add Answer button to Feedback notification.

const admins = require('../../../config').admins;

module.exports = function notifyAdmins(bot, type, message, user) {
    const options = {
        notification_type: 'SILENT_PUSH'
    }
    if(type === 'feedback') {       
        admins.forEach((admin) => {
            if(admin.name === 'András Szücs') {
                bot.sendAttachment(admin.userID, 'image', user.profile_pic).then(() => {
                    bot.say(admin.userID, `${user.first_name} ${user.last_name} sent a new feedback:`, options).then(() => {
                        bot.say(admin.userID, `"${message}"`, options);
                    });
                });
            }
        });
    }
}
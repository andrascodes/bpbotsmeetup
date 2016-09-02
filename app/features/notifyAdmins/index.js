'use strict';

const admins = ['1135224343200481', '1126342277412426', '1388594137833781'];

module.exports = function notifyAdmins(bot, type, message, userName) {
    console.log(type);
    console.log(message);
    console.log(userName);
    const options = {
        notification_type: 'SILENT_PUSH'
    }
    if(type === 'feedback') {
        const notification = `New feedback from ${userName}:\n"${message}"`;
        
        admins.forEach((admin) => {
            console.log(notification);
            bot.say(admin, notification).catch((err) => { console.log(err)});
        });
    }
    if(type === 'question') {
        const notification = `New question from ${userName}:\n"${message}"`;
        admins.forEach((admin) => {
            bot.say(admin, notification);
        });
    }


}
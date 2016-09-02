'use strict';
const EventEmitter = require('eventemitter3');

class Chat extends EventEmitter {
  constructor(bot, userId) {
    super();
    if (!bot || !userId) {
      throw new Error('You need to specify a BootBot instance and a userId');
    }
    this.bot = bot;
    this.userId = userId;
  }

  // Self defined
  getDB() {
    return this.bot.db;
  }

  sayMultiple(messagesWithOptions) {
    const chat = this;
    const promiseArray = [];
    messagesWithOptions.forEach((messageWithOptions) => {
      const options = messageWithOptions.options;
      if(messageWithOptions.message) {
        const messagePromise = function() {
          return Promise.resolve(chat.say(messageWithOptions.message, options));
        }
        promiseArray.push(messagePromise);
      }
      else if(messageWithOptions.generic) {
        const messagePromise = function() {
          return Promise.resolve(chat.sendGenericTemplate(messageWithOptions.generic, options));
        }
        promiseArray.push(messagePromise);
      }
      
    });

    function pseries(list) {  
        var p = Promise.resolve();
        return list.reduce(function(pacc, fn) {
            return pacc = pacc.then(fn);
        }, p);
    }

    return pseries(promiseArray);
  }
  // END

  say(message, options) {
    return this.bot.say(this.userId, message, options);
  }

  sendTextMessage(text, quickReplies, options) {
    return this.bot.sendTextMessage(this.userId, text, quickReplies, options);
  }

  sendButtonTemplate(text, buttons, options) {
    return this.bot.sendButtonTemplate(this.userId, text, buttons, options);
  }

  sendGenericTemplate(cards, options) {
    return this.bot.sendGenericTemplate(this.userId, cards, options);
  }

  sendTemplate(payload, options) {
    return this.bot.sendTemplate(this.userId, payload, options);
  }

  sendAttachment(type, url, quickReplies, options) {
    return this.bot.sendAttachment(this.userId, type, url, quickReplies, options);
  }

  sendAction(action, options) {
    return this.bot.sendAction(this.userId, action, options);
  }

  sendMessage(message, options) {
    return this.bot.sendMessage(this.userId, message, options);
  }

  sendRequest(body, endpoint, method) {
    return this.bot.sendRequest(body, endpoint, method);
  }

  sendTypingIndicator(milliseconds) {
    return this.bot.sendTypingIndicator(this.userId, milliseconds);
  }

  getUserProfile() {
    return this.bot.getUserProfile(this.userId);
  }

  conversation(factory) {
    return this.bot.conversation(this.userId, factory);
  }
}

module.exports = Chat;

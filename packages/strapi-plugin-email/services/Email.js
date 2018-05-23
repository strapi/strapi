'use strict';

/**
 * Email.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const config = require('../config/settings.json'); 

let mailer; 

if(config.EMAIL_METHOD === 'mailgun') {
  const mailgun = require('mailgun-js')({
    apiKey: config.MAILGUN_API_KEY, 
    domain: config.MAILGUN_DOMAIN,
    mute: false
  });

  mailer = (msg, mailerCallback) => {
    // change reply to format for Mailgun
    msg['h:Reply-To'] = msg.replyTo; 
    mailgun.messages().send(msg, mailerCallback); 
  };
}
else if(config.EMAIL_METHOD === 'sendgrid') {
  const sendgrid = require('@sendgrid/mail'); 
  sendgrid.setApiKey(config.SENDGRID_API_KEY); 

  mailer = (msg, mailerCallback) => {
    // change capitalization for SendGrid
    msg.reply_to = msg.replyTo; 
    sendgrid.send(msg, mailerCallback);
  };
}
else {
  // Fallback to default email method
  const sendmail = require('sendmail')({
    silent: true
  });

  mailer = (msg, mailerCallback) => {
    sendmail(msg, mailerCallback); 
  };
}

module.exports = {
  send: (options, cb) => { // eslint-disable-line no-unused-vars
    return new Promise((resolve, reject) => {
      // Default values.
      options = _.isObject(options) ? options : {};
      options.from = options.from || '"Administration Panel" <no-reply@strapi.io>';
      options.replyTo = options.replyTo || '"Administration Panel" <no-reply@strapi.io>';
      options.text = options.text || options.html;
      options.html = options.html || options.text;

      mailer({
        from: options.from,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html
      }, function (err) {
        if (err) {
          reject([{ messages: [{ id: 'Auth.form.error.email.invalid' }] }]);
        } else {
          resolve();
        }
      });  
    });
  }
};

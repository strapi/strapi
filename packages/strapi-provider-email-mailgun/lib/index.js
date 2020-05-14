'use strict';

/**
 * Module dependencies
 */

/* eslint-disable prefer-template */
// Public node modules.
const isObject = require('lodash/isObject');
const mailgunFactory = require('mailgun-js');

/* eslint-disable no-unused-vars */
module.exports = {
  init: config => {
    const mailgun = mailgunFactory({
      apiKey: config.apiKey,
      host: config.apiHost,
      domain: config.domain,
      mute: false,
    });

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = isObject(options) ? options : {};

          let msg = {
            from: options.from || config.defaultFrom,
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            subject: options.subject,
            'h:Reply-To': options.replyTo || config.defaultReplyTo,
            text: options.text,
            html: options.html,
            template: options.template,
            'h:X-Mailgun-Variables': options['h:X-Mailgun-Variables'],
            attachment: options.attachment,
          };

          mailgun.messages().send(msg, function(err) {
            if (err) {
              reject([{ messages: [{ id: 'Auth.form.error.email.invalid' }] }]);
            } else {
              resolve();
            }
          });
        });
      },
    };
  },
};

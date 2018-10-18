'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const sendmail = require('sendmail')({
  silent: true
});

/* eslint-disable no-unused-vars */
module.exports = {
  provider: 'sendmail',
  name: 'Sendmail',
  auth: {
    sendmail_default_from: {
      label: 'Sendmail Default From',
      type: 'text'
    },
    sendmail_default_replyto: {
      label: 'Sendmail Default Reply-To',
      type: 'text'
    }
  },
  init: (config) => {
    return {
      send: (options, cb) => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = _.isObject(options) ? options : {};
          options.from = options.from || config.sendmail_default_from;
          options.replyTo = options.replyTo || config.sendmail_default_replyto;
          options.text = options.text || options.html;
          options.html = options.html || options.text;

          sendmail({
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
  }
};

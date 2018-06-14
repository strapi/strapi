'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
// Public node modules.
const _ = require('lodash');
const mailgunFactory = require('mailgun-js');

/* eslint-disable no-unused-vars */
module.exports = {
  provider: 'mailgun',
  name: 'Mailgun',
  auth: {
    mailgun_default_from: {
      label: 'Mailgun Default From',
      type: 'text'
    },
    mailgun_default_replyto: {
      label: 'Mailgun Default Reply-To',
      type: 'text'
    },
    mailgun_api_key: {
      label: 'Mailgun API Key',
      type: 'text'
    },
    mailgun_domain: {
      label: 'Mailgun Domain',
      type: 'text'
    }
  },
  init: (config) => {

    const mailgun = mailgunFactory({
      apiKey: config.mailgun_api_key,
      domain: config.mailgun_domain,
      mute: false
    });

    return {
      send: (options, cb) => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = _.isObject(options) ? options : {};
          options.from = options.from || config.mailgun_default_from;
          options.replyTo = options.replyTo || config.mailgun_default_replyto;
          options.text = options.text || options.html;
          options.html = options.html || options.text;

          let msg = {
            from: options.from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html
          };
          msg['h:Reply-To'] = options.replyTo;

          mailgun.messages().send(msg, function (err) {
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

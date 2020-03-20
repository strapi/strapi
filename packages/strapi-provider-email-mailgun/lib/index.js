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
  provider: 'mailgun',
  name: 'Mailgun',
  auth: {
    mailgun_default_from: {
      label: 'Mailgun Default From',
      type: 'text',
    },
    mailgun_default_replyto: {
      label: 'Mailgun Default Reply-To',
      type: 'text',
    },
    mailgun_api_key: {
      label: 'Mailgun API Key',
      type: 'text',
    },
    mailgun_api_host: {
      label: 'Mailgun API Host',
      type: 'text',
    },
    mailgun_domain: {
      label: 'Mailgun Domain',
      type: 'text',
    },
  },
  init: config => {
    const mailgun = mailgunFactory({
      apiKey: config.mailgun_api_key,
      host: config.mailgun_api_host,
      domain: config.mailgun_domain,
      mute: false,
    });

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = isObject(options) ? options : {};

          let msg = {
            from: options.from || config.mailgun_default_from,
            to: options.to,
            subject: options.subject,
            ...(options.text && { text: options.text }),
            ...(options.html && { html: options.html }),
            ...(options.template && { template: options.template }),
            ...(options['h:X-Mailgun-Variables'] && {
              'h:X-Mailgun-Variables': options['h:X-Mailgun-Variables'],
            }),
            ...(options.attachment && { attachment: options.attachment }),
          };
          msg['h:Reply-To'] = options.replyTo || config.mailgun_default_replyto;

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

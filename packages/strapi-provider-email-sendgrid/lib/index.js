'use strict';

const sendgrid = require('@sendgrid/mail');
const _ = require('lodash');

module.exports = {
  init: (providerOptions = {}, settings = {}) => {
    sendgrid.setApiKey(providerOptions.apiKey);

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          let msg = {
            from: from || settings.defaultFrom,
            to,
            cc,
            bcc,
            replyTo: replyTo || settings.defaultReplyTo,
            subject,
            text,
            html,
            ...rest,
          };

          msg = _.pickBy(msg, value => typeof value !== 'undefined');

          sendgrid.send(msg, function(err) {
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

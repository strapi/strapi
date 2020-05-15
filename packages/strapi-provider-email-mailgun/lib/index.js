'use strict';

const mailgunFactory = require('mailgun-js');
const _ = require('lodash');

module.exports = {
  init: (providerOptions = {}, settings = {}) => {
    const mailgun = mailgunFactory({
      mute: false,
      ...providerOptions,
    });

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          let msg = {
            from: from || settings.defaultFrom,
            to,
            cc,
            bcc,
            'h:Reply-To': replyTo || settings.defaultReplyTo,
            subject,
            text,
            html,
            ...rest,
          };

          msg = _.pickBy(msg, value => typeof value !== 'undefined');

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

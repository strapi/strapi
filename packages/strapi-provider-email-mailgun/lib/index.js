'use strict';

const mailgunFactory = require('mailgun-js');
const { removeUndefined } = require('strapi-utils');

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

          mailgun.messages().send(removeUndefined(msg), function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      },
    };
  },
};

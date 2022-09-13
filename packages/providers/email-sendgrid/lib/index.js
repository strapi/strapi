'use strict';

const sendgrid = require('@sendgrid/mail');
const { removeUndefined } = require('@strapi/utils');

module.exports = {
  init(providerOptions = {}, settings = {}) {
    sendgrid.setApiKey(providerOptions.apiKey);

    return {
      send(options) {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const msg = {
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

          sendgrid.send(removeUndefined(msg), (err) => {
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

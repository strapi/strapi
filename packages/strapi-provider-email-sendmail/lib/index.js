'use strict';

const fs = require('fs');
const sendmailFactory = require('sendmail');
const { removeUndefined } = require('strapi-utils');

module.exports = {
  init: (providerOptions = {}, settings = {}) => {
    const dkimPrivateKey = fs.existsSync('./dkim-private.pem') ? fs.readFileSync('./dkim-private.pem', 'utf8') : null;
    const dkim = dkimPrivateKey ? { privateKey: dkimPrivateKey, keySelector: 'default' } : false;
    const thisProviderOptions = Object.assign({}, { dkim: dkim }, providerOptions);
    const sendmail = sendmailFactory({
      silent: true,
      ...thisProviderOptions,
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
            replyTo: replyTo || settings.defaultReplyTo,
            subject,
            text,
            html,
            ...rest,
          };

          sendmail(removeUndefined(msg), err => {
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

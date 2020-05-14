'use strict';

/**
 * Module dependencies
 */

/* eslint-disable prefer-template */
// Public node modules.
const sendgrid = require('@sendgrid/mail');

/* eslint-disable no-unused-vars */
module.exports = {
  init: config => {
    sendgrid.setApiKey(config.apiKey);

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          let msg = {
            from: options.from || config.defaultFrom,
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            replyTo: options.replyTo || config.defaultReplyTo,
            subject: options.subject,
            text: options.text,
            html: options.html,
            templateId: options.templateId,
            dynamic_template_data: options.dynamic_template_data,
            sendAt: options.sendAt,
            batchId: options.batchId,
          };

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

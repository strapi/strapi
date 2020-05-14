'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const sendmail = require('sendmail')({
  silent: true,
});

/* eslint-disable no-unused-vars */
module.exports = {
  init: config => {
    return {
      send: options => {
        return new Promise((resolve, reject) => {
          sendmail(
            {
              from: options.from || config.defaultFrom,
              to: options.to,
              replyTo: options.replyTo || config.defaultReplyTo,
              subject: options.subject,
              text: options.text,
              html: options.html,
              attachments: options.attachments,
            },
            function(err) {
              if (err) {
                reject([{ messages: [{ id: 'Auth.form.error.email.invalid' }] }]);
              } else {
                resolve();
              }
            }
          );
        });
      },
    };
  },
};

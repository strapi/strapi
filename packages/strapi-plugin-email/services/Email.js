'use strict';

/**
 * Email.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const sendmail = require('sendmail')({
  silent: true
});

module.exports = {
  send: (options, cb) => {
    return new Promise((resolve, reject) => {
      // Default values.
      options = _.isObject(options) ? options : {};
      options.from = options.from || '"Administration Panel" <no-reply@strapi.io>';
      options.text = options.text || options.html;
      options.html = options.html || options.text;

      // Send the email.
      sendmail({
        from: options.from,
        to: options.to,
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

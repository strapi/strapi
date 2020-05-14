'use strict';

/**
 * Module dependencies
 */

/* eslint-disable prefer-template */
// Public node modules.
const _ = require('lodash');
const nodeSES = require('node-ses');

/* eslint-disable no-unused-vars */
module.exports = {
  init: config => {
    var client = nodeSES.createClient({
      key: config.apiKey,
      secret: config.secret,
      amazon: config.endpoint,
    });

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = _.isObject(options) ? options : {};
          options.from = options.from || config.defaultFrom;
          options.replyTo = options.replyTo || config.defaultReplyTo;
          options.text = options.text || options.html;
          options.html = options.html || options.text;

          let msg = {
            from: options.from,
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            replyTo: options.replyTo,
            subject: options.subject,
            altText: options.text,
            message: options.html,
          };

          client.sendEmail(msg, function(err) {
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

'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
// Public node modules.
const _ = require('lodash');
const nodeSES = require('node-ses');

/* eslint-disable no-unused-vars */
module.exports = {
  provider: 'amazon-ses',
  name: 'Amazon SES',
  auth: {
    amazon_ses_default_from: {
      label: 'Default From',
      type: 'text'
    },
    amazon_ses_default_replyto: {
      label: 'Default Reply-To',
      type: 'text'
    },
    amazon_ses_api_key: {
      label: 'Amazon Access key ID',
      type: 'text'
    },
    amazon_ses_secret: {
      label: 'Amazon Secret access key',
      type: 'text'
    }
  },

  init: (config) => {

    var client = nodeSES.createClient({
      key: config.amazon_ses_api_key,
      secret: config.amazon_ses_secret
    });

    return {
      send: (options, cb) => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = _.isObject(options) ? options : {};
          options.from = options.from || config.amazon_ses_default_from;
          options.replyTo = options.replyTo || config.amazon_ses_default_replyto;
          options.text = options.text || options.html;
          options.html = options.html || options.text;

          let msg = {
            from: options.from,
            to: options.to,
            replyTo: options.replyTo,
            subject: options.subject,
            altText: options.text,
            message: options.html
          };

          client.sendEmail(msg, function (err) {
            if (err) {
              reject([{ messages: [{ id: 'Auth.form.error.email.invalid' }] }]);
            } else {
              resolve();
            }
          });
        });
      }
    };
  }
};

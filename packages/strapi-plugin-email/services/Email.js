'use strict';

/**
 * Email.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

const _ = require('lodash');
const nodemailer = require('nodemailer');

module.exports = {
  send: (options, cb) => {
    return new Promise((resolve, reject) => {
      try {
        const config = strapi.plugins['email'].config[strapi.config.environment];

        // Format transport config.
        let transportConfig;
        if (config.smtp && config.smtp.service && config.smtp.service.name) {
          transportConfig = {
            service: config.smtp.service.name,
            auth: {
              user: config.smtp.service.user,
              pass: config.smtp.service.pass
            }
          };
        }

        // Init the transporter.
        const transporter = nodemailer.createTransport(transportConfig);

        // Default values.
        options = _.isObject(options) ? options : {};
        options.from = config.smtp.from || '';
        options.text = options.text || options.html;
        options.html = options.html || options.text;

        // Send the email.
        transporter.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html
        }, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};

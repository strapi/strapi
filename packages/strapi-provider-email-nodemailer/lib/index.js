'use strict';

/**
 * Module dependencies
 */

/* eslint-disable import/no-unresolved */
/* eslint-disable prefer-template */
// Public node modules.
const _ = require('lodash');
const nodemailer = require('nodemailer');

module.exports = {
  provider: 'nodemailer',
  name: 'Nodemailer',

  init: (providerOptions = {}, settings = {}) => {
    const transporter = nodemailer.createTransport(providerOptions);

    return {
      send: options => {
        return new Promise((resolve, reject) => {
          // Default values.
          options = _.isObject(options) ? options : {};
          options.from = options.from || settings.defaultFrom;
          options.replyTo = options.replyTo || settings.defaultReplyTo;
          options.text = options.text || options.html;
          options.html = options.html || options.text;

          const msg = [
            'from',
            'replyTo',
            'to',
            'cc',
            'bcc',
            'subject',
            'text',
            'html',
            'attachments',
          ];

          transporter
            .sendMail(_.pick(options, msg))
            .then(resolve)
            .catch(error => reject(error));
        });
      },
    };
  },
};

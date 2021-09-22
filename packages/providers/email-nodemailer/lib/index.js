'use strict';

/**
 * Module dependencies
 */

const _ = require('lodash');
const nodemailer = require('nodemailer');

const emailFields = [
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

module.exports = {
  provider: 'nodemailer',
  name: 'Nodemailer',

  init(providerOptions = {}, settings = {}) {
    const transporter = nodemailer.createTransport(providerOptions);

    return {
      send(options) {
        // Default values.
        const emailOptions = {
          ..._.pick(options, emailFields),
          from: options.from || settings.defaultFrom,
          replyTo: options.replyTo || settings.defaultReplyTo,
          text: options.text || options.html,
          html: options.html || options.text,
        };

        return transporter.sendMail(emailOptions);
      },
    };
  },
};

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

  init: (providerOptions = {}, settings = {}) => {
    const transporter = nodemailer.createTransport(providerOptions);

    return {
      send: options => {
        // Default values.
        options = _.isObject(options) ? options : {};
        options.from = options.from || settings.defaultFrom;
        options.replyTo = options.replyTo || settings.defaultReplyTo;
        options.text = options.text || options.html;
        options.html = options.html || options.text;

        return transporter.sendMail(_.pick(options, emailFields));
      },
    };
  },
};

'use strict';

/**
 * Module dependencies
 */

const _ = require('lodash');
const aws = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');

/**
 * @typedef SendOption {object}
 * @property from {string} The email address of the sender. All email addresses can be plain ‘sender@server.com’ or formatted '“Sender Name” sender@server.com'.
 * @property to {string} Comma separated list or an array of recipients email addresses that will appear on the To: field
 * @property cc {string} Comma separated list or an array of recipients email addresses that will appear on the Cc: field
 * @property bcc {string} Comma separated list or an array of recipients email addresses that will appear on the Bcc: field
 * @property subject {string} The subject of the email
 * @property replyTo {string} An email address that will appear on the Reply-To: field
 * @property text {string} The plaintext version of the message as an Unicode string, Buffer, Stream or an attachment-like object ({path: ‘/var/data/…'})
 * @property html {string} The HTML version of the message as an Unicode string, Buffer, Stream or an attachment-like object ({path: ‘http://…'})
 * @property inReplyTo {string} The Message-ID this message is replying to
 * @property references {string|string[]} Message-ID list (an array or space separated string)
 * @property attachments {object[]} An array of attachment objects (see [Using attachments]{@link https://nodemailer.com/message/attachments/} for details). Attachments can be used for [embedding images]{@link https://nodemailer.com/message/embedded-images/} as well.
 */

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
  'inReplyTo',
  'references',
];

module.exports = {
  provider: 'nodemailer',
  name: 'Nodemailer',
  init(providerOptions = {}, settings = {}) {
    const { transporterConfig, transporterType, ...restOptions } = providerOptions;

    let transporter;
    if (transporterType === 'SES') {
      const ses = new aws.SES({
        apiVersion: '2010-12-01',
        ...transporterConfig,
      });

      transporter = nodemailer.createTransport({
        SES: { ses, aws },
      });
    } else {
      transporter = nodemailer.createTransport(restOptions);
    }

    return {
      /**
       * Send an email
       * @param {SendOption} options
       * @return {Promise<{}>}
       */
      async send(options) {
        // Default values.
        const emailOptions = {
          ..._.pick(options, emailFields),
          from: options.from || settings.defaultFrom,
          replyTo: options.replyTo || settings.defaultReplyTo,
          text: options.text || options.html,
          html: options.html || options.text,
          references: options.references
            ? options.references
            : options.inReplyTo
            ? [options.inReplyTo]
            : undefined,
        };

        return transporter.sendMail(emailOptions);
      },
    };
  },
};

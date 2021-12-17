'use strict';

const aws = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');
const { removeUndefined } = require('@strapi/utils');

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

/**
 * @typedef SendResult {object}
 * @property messageId {string} Message-ID
 */

module.exports = {
  /**
   * @param providerOptions {object}
   * @param settings {object}
   * @return {{send: function}}
   */
  init(providerOptions = {}, settings = {}) {
    const { key, secret, endpoint, region, ...restOptions } = providerOptions;
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      accessKeyId: key,
      secretAccessKey: secret,
      endpoint,
      region,
      ...restOptions,
    });

    const transporter = nodemailer.createTransport({
      SES: { ses, aws },
    });

    return {
      /**
       * Send an email
       * @param {SendOption} options
       * @return {Promise<SendResult>}
       */
      send(options) {
        return new Promise((resolve, reject) => {
          const {
            from,
            to,
            cc,
            bcc,
            subject,
            replyTo,
            text,
            html,
            inReplyTo,
            references,
            ...rest
          } = options;

          const data = {
            from: from || settings.defaultFrom,
            to,
            cc,
            bcc,
            subject,
            replyTo: replyTo || settings.defaultReplyTo,
            text,
            html,
            inReplyTo,
            references: references || inReplyTo ? [inReplyTo] : undefined,
            ...rest,
          };

          transporter.sendMail(removeUndefined(data), (err, info) => {
            if (err) {
              reject(err);
            } else {
              resolve({ messageId: info.messageId });
            }
          });
        });
      },
    };
  },
};

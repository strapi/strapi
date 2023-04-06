import _ from 'lodash';
import nodemailer, { SendMailOptions } from 'nodemailer';

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

interface Settings {
  defaultFrom?: string;
  defaultReplyTo?: string;
}

export = {
  provider: 'nodemailer',
  name: 'Nodemailer',

  init(providerOptions = {}, settings: Settings = {}) {
    const transporter = nodemailer.createTransport(providerOptions);

    return {
      send(options: SendMailOptions) {
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

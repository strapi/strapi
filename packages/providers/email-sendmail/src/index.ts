import sendmailFactory, { Options, MailInput } from 'sendmail';
import utils from '@strapi/utils';

interface Settings {
  defaultFrom?: string;
  defaultReplyTo?: string;
}

export = {
  init(providerOptions: Options = {}, settings: Settings = {}) {
    const sendmail = sendmailFactory({
      silent: true,
      ...providerOptions,
    });

    return {
      send(options: MailInput): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const msg = {
            from: from || settings.defaultFrom,
            to,
            cc,
            bcc,
            replyTo: replyTo || settings.defaultReplyTo,
            subject,
            text,
            html,
            ...rest,
          };

          sendmail(utils.removeUndefined(msg), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      },
    };
  },
};

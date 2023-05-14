import sendmailFactory, { Options, MailInput } from 'sendmail';
import utils from '@strapi/utils';

interface Settings {
  defaultFrom: string;
  defaultReplyTo: string;
}

interface SendOptions {
  from?: string;
  to: string;
  cc: string;
  bcc: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  [key: string]: unknown;
}

type ProviderOptions = Options;

export = {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const sendmail = sendmailFactory({
      silent: true,
      ...providerOptions,
    });

    return {
      send(options: SendOptions): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const msg: MailInput = {
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

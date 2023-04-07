import sendmailFactory, { Options, MailInput } from 'sendmail';
import utils from '@strapi/utils';
import type { Settings, SendOptions } from '@strapi/plugin-email';

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

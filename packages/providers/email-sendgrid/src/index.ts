import sendgrid, { MailDataRequired } from '@sendgrid/mail';
import utils from '@strapi/utils';

interface ProviderOptions {
  apiKey: string;
}

interface Settings {
  defaultFrom?: string;
  defaultReplyTo?: string;
}

export = {
  init(providerOptions: ProviderOptions, settings: Settings = {}) {
    sendgrid.setApiKey(providerOptions.apiKey);

    return {
      send(options: MailDataRequired): Promise<void> {
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

          sendgrid.send(utils.removeUndefined(msg), false, (err) => {
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

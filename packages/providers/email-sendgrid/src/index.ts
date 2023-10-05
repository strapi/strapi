import sendgrid, { MailDataRequired } from '@sendgrid/mail';

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

interface ProviderOptions {
  apiKey: string;
}

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    sendgrid.setApiKey(providerOptions.apiKey);

    return {
      send(options: SendOptions): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const msg: MailDataRequired = {
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

          sendgrid.send(msg, false, (err) => {
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

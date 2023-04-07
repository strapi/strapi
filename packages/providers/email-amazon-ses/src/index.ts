import nodeSES from 'node-ses';
import utils from '@strapi/utils';
import type { Settings, SendOptions } from '@strapi/plugin-email';

interface ProviderOptions {
  key: string;
  secret: string;
  amazon?: string;
}

export = {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const client = nodeSES.createClient(providerOptions);

    return {
      send(options: SendOptions): Promise<void> {
        return new Promise((resolve, reject) => {
          const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

          const msg: nodeSES.sendEmailOptions = {
            from: from || settings.defaultFrom,
            to,
            cc,
            bcc,
            replyTo: replyTo || settings.defaultReplyTo,
            subject,
            altText: text,
            message: html,
            ...rest,
          };

          client.sendEmail(utils.removeUndefined(msg), (err) => {
            if (err) {
              if (err.Message) {
                // eslint-disable-next-line prefer-promise-reject-errors
                reject(`${err.Message} ${err.Detail ? err.Detail : ''}`);
              }
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

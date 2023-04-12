import formData from 'form-data';
import Mailgun from 'mailgun.js';
import utils from '@strapi/utils';
import Options from 'mailgun.js/interfaces/Options';
import { MailgunMessageData } from 'mailgun.js/interfaces/Messages';

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

interface LegacyOptionMapper {
  field: string;
  fn(value: unknown): string;
}

type ProviderOptions = Record<string, unknown>;

const optionsMap: Record<string, LegacyOptionMapper> = {
  apiKey: { field: 'key', fn: (value) => `${value}` },
  host: { field: 'url', fn: (value) => `https://${value || 'api.mailgun.net'}` },
};

export = {
  convertProviderOptions(providerOptions: ProviderOptions): Record<string, unknown> {
    const newOptions: Record<string, unknown> = {};
    if (typeof providerOptions === 'object') {
      Object.keys(providerOptions).forEach((key) => {
        if (Object.keys(optionsMap).includes(key)) {
          newOptions[optionsMap[key].field] = optionsMap[key].fn(providerOptions[key]);
        } else {
          newOptions[key] = providerOptions[key];
        }
      });
    }
    return newOptions;
  },

  init(providerOptions: ProviderOptions, settings: Settings) {
    const defaults = {
      username: 'api',
    };

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      ...defaults,
      ...this.convertProviderOptions(providerOptions),
    } as Options);

    return {
      send(options: SendOptions) {
        const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

        const data = {
          from: from || settings.defaultFrom,
          to,
          cc,
          bcc,
          'h:Reply-To': replyTo || settings.defaultReplyTo,
          subject,
          text,
          html,
          ...rest,
        } as MailgunMessageData;

        return mg.messages.create(providerOptions.domain as string, utils.removeUndefined(data));
      },
    };
  },
};

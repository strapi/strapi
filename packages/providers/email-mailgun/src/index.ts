import assert from 'node:assert';
import formData from 'form-data';
import Mailgun, { type MailgunClientOptions } from 'mailgun.js';

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

type ProviderOptions = MailgunClientOptions & {
  domain: string;
};

const DEFAULT_OPTIONS = {
  username: 'api',
};

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    assert(providerOptions.key, 'Mailgun API key is required');
    assert(providerOptions.domain, 'Mailgun domain is required');

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      ...DEFAULT_OPTIONS,
      ...providerOptions,
    });

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
        };

        return mg.messages.create(providerOptions.domain as string, data);
      },
    };
  },
};

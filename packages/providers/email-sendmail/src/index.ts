import type { SendMailOptions } from 'nodemailer';

import { sendDirectSmtp } from './direct-smtp';
import type { ProviderSendmailOptions, Settings } from './types';

interface SendOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  [key: string]: unknown;
}

export default {
  init(providerOptions: ProviderSendmailOptions, settings: Settings) {
    const mergedOptions: ProviderSendmailOptions = {
      silent: true,
      ...providerOptions,
    };

    return {
      send(options: SendOptions): Promise<void> {
        const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

        const mail: SendMailOptions = {
          from: from || settings.defaultFrom,
          to,
          cc,
          bcc,
          replyTo: replyTo ?? settings.defaultReplyTo,
          subject,
          text,
          html,
          ...(rest as Record<string, unknown>),
        };

        return sendDirectSmtp(mail, mergedOptions);
      },
    };
  },
};

export type { ProviderSendmailOptions, Settings } from './types';

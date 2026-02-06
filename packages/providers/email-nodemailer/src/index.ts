import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions, SentMessageInfo } from 'nodemailer';

interface Settings {
  defaultFrom: string;
  defaultReplyTo: string;
}

interface SendOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: SendMailOptions['attachments'];
  headers?: SendMailOptions['headers'];
  [key: string]: unknown;
}

type ProviderOptions = Parameters<typeof nodemailer.createTransport>[0];

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const transporter: Transporter = nodemailer.createTransport(providerOptions);

    return {
      send(options: SendOptions): Promise<SentMessageInfo> {
        const { from, to, cc, bcc, replyTo, subject, text, html, attachments, headers, ...rest } =
          options;

        const message: SendMailOptions = {
          from: from || settings.defaultFrom,
          to,
          cc,
          bcc,
          replyTo: replyTo || settings.defaultReplyTo,
          subject,
          text: text || html,
          html: html || text,
          attachments,
          ...(headers ? { headers } : {}),
          ...rest,
        };

        return transporter.sendMail(message);
      },

      async verify(): Promise<true> {
        return transporter.verify();
      },

      isIdle(): boolean {
        return typeof transporter.isIdle === 'function' ? transporter.isIdle() : true;
      },

      close(): void {
        transporter.close();
      },
    };
  },
};

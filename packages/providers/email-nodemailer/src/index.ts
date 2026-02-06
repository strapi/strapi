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
  /** Custom SMTP headers (e.g. X-Priority, X-Mailer, business-specific headers) */
  headers?: SendMailOptions['headers'];
  /** Email priority: 'high', 'normal', 'low' - sets X-Priority and Importance headers */
  priority?: SendMailOptions['priority'];
  /**
   * Calendar event invitation (iCalendar format).
   * Embeds a calendar event (meeting invitation) in the email.
   * @example { method: 'REQUEST', content: icsString }
   */
  icalEvent?: SendMailOptions['icalEvent'];
  /**
   * RFC 2369 List-* headers for mailing lists and newsletters.
   * When set, email clients like Gmail/Outlook show an "Unsubscribe" button.
   * @example { unsubscribe: { url: 'https://example.com/unsubscribe', comment: 'Unsubscribe' } }
   */
  list?: SendMailOptions['list'];
  /**
   * Custom SMTP envelope for controlling MAIL FROM and RCPT TO independently
   * from the message From/To headers. Useful for bounce handling.
   * @example { from: 'bounce+123@example.com', to: 'recipient@example.com' }
   */
  envelope?: SendMailOptions['envelope'];
  /**
   * AMP4Email content for interactive emails.
   * Provides an AMP HTML version alongside standard text/html.
   */
  amp?: SendMailOptions['amp'];
  /**
   * Delivery Status Notification (DSN) configuration.
   * Allows requesting bounce reports, delay notices, or success confirmations.
   * Note: Typed as unknown because @types/nodemailer does not yet include DSN types,
   * but nodemailer supports it natively.
   * @example { id: 'msg-123', return: 'headers', notify: 'success', recipient: 'sender@example.com' }
   */
  dsn?: {
    id?: string;
    return?: 'headers' | 'full';
    notify?: string | string[];
    recipient?: string;
  };
  [key: string]: unknown;
}

type ProviderOptions = Parameters<typeof nodemailer.createTransport>[0];

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const transporter: Transporter = nodemailer.createTransport(providerOptions);

    return {
      send(options: SendOptions): Promise<SentMessageInfo> {
        const {
          from,
          to,
          cc,
          bcc,
          replyTo,
          subject,
          text,
          html,
          attachments,
          headers,
          priority,
          dsn,
          icalEvent,
          list,
          envelope,
          amp,
          ...rest
        } = options;

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
          ...(priority ? { priority } : {}),
          ...(icalEvent ? { icalEvent } : {}),
          ...(list ? { list } : {}),
          ...(envelope ? { envelope } : {}),
          ...(amp ? { amp } : {}),
          ...rest,
        };

        // DSN is supported by nodemailer but not yet typed in @types/nodemailer
        if (dsn) {
          (message as any).dsn = dsn;
        }

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

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
   * @example { id: 'msg-123', return: 'headers', notify: 'success', recipient: 'sender@example.com' }
   */
  dsn?: {
    id?: string;
    return?: 'headers' | 'full';
    notify?: string | string[];
    recipient?: string;
  };
  /**
   * Per-message OAuth2 authentication. Allows sending emails on behalf of
   * different users through a single transporter configured with OAuth2.
   * Requires the transporter to be configured with type: 'OAuth2', clientId, and clientSecret.
   * @example { user: 'user@gmail.com', refreshToken: '1/xxx', accessToken: 'ya29.xxx' }
   */
  auth?: {
    user?: string;
    refreshToken?: string;
    accessToken?: string;
    expires?: number;
  };
}

type ProviderOptions = Parameters<typeof nodemailer.createTransport>[0];

interface ProviderCapabilities {
  transport?: {
    host?: string;
    port?: number;
    secure?: boolean;
    pool?: boolean;
    maxConnections?: number;
  };
  auth?: {
    type?: string;
  };
  features?: string[];
}

function getCapabilitiesFromOptions(opts: ProviderOptions): ProviderCapabilities {
  const capabilities: ProviderCapabilities = {};
  const features: string[] = [];

  if (opts && typeof opts === 'object') {
    const options = opts as Record<string, unknown>;

    if (options.host || options.port) {
      capabilities.transport = {
        host: typeof options.host === 'string' ? options.host : undefined,
        port: typeof options.port === 'number' ? options.port : undefined,
        secure: typeof options.secure === 'boolean' ? options.secure : undefined,
        pool: typeof options.pool === 'boolean' ? options.pool : undefined,
        maxConnections:
          typeof options.maxConnections === 'number' ? options.maxConnections : undefined,
      };
    }

    if (options.auth && typeof options.auth === 'object') {
      const auth = options.auth as Record<string, unknown>;
      const authType = typeof auth.type === 'string' ? auth.type : undefined;
      capabilities.auth = {
        type: authType || (auth.user ? 'login' : undefined),
      };
      if (authType === 'OAuth2') {
        features.push('oauth2');
      }
    }

    if (options.dkim) features.push('dkim');
    if (options.pool) features.push('pool');
    if (options.rateLimit) features.push('rateLimiting');
    if (options.requireTLS) features.push('requireTLS');
  }

  if (features.length > 0) {
    capabilities.features = features;
  }

  return capabilities;
}

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const transporter: Transporter = nodemailer.createTransport(providerOptions);

    return {
      send(options: SendOptions): Promise<SentMessageInfo> {
        const message: SendMailOptions = {
          from: options.from || settings.defaultFrom,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo || settings.defaultReplyTo,
          subject: options.subject,
          text: options.text || options.html,
          html: options.html || options.text,
        };

        if (options.attachments) {
          message.attachments = options.attachments;
        }
        if (options.headers) {
          message.headers = options.headers;
        }
        if (options.priority) {
          message.priority = options.priority;
        }
        if (options.icalEvent) {
          message.icalEvent = options.icalEvent;
        }
        if (options.list) {
          message.list = options.list;
        }
        if (options.envelope) {
          message.envelope = options.envelope;
        }
        if (options.amp) {
          message.amp = options.amp;
        }
        if (options.dsn) {
          (message as Record<string, unknown>).dsn = options.dsn;
        }
        if (options.auth) {
          (message as Record<string, unknown>).auth = {
            user: options.auth.user,
            refreshToken: options.auth.refreshToken,
            accessToken: options.auth.accessToken,
            ...(options.auth.expires != null ? { expires: options.auth.expires } : {}),
          };
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

      getCapabilities(): ProviderCapabilities {
        return getCapabilitiesFromOptions(providerOptions);
      },
    };
  },
};

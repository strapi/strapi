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
   * Note: Typed locally because @types/nodemailer does not yet include DSN types,
   * but nodemailer supports it natively.
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
  [key: string]: unknown;
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
    user?: string;
  };
  features?: string[];
}

function getCapabilitiesFromOptions(opts: ProviderOptions): ProviderCapabilities {
  const capabilities: ProviderCapabilities = {};
  const features: string[] = [];

  if (opts && typeof opts === 'object') {
    const options = opts as Record<string, unknown>;

    // Transport info (no sensitive data)
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

    // Auth type (never expose password, tokens, etc.)
    if (options.auth && typeof options.auth === 'object') {
      const auth = options.auth as Record<string, unknown>;
      const authType = auth.type as string;
      capabilities.auth = {
        type: authType || (auth.user ? 'Password' : undefined),
        user: typeof auth.user === 'string' ? auth.user : undefined,
      };
      if (authType === 'OAuth2') {
        features.push('oauth2');
      }
    }

    // Feature flags
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
          auth,
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

        // DSN and per-message auth are supported by nodemailer but not fully
        // typed in @types/nodemailer, so we assign them separately
        if (dsn) {
          (message as any).dsn = dsn;
        }
        if (auth) {
          (message as any).auth = auth;
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

import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions, SentMessageInfo } from 'nodemailer';

interface Settings {
  defaultFrom: string;
  defaultReplyTo: string;
}

interface SendOptions {
  // --- Core addressing ---
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  /** Address that appears in the Sender: field (for "on behalf of" emails) */
  sender?: SendMailOptions['sender'];
  subject: string;

  // --- Content ---
  text?: string;
  html?: string;
  /** Apple Watch specific HTML version of the message */
  watchHtml?: SendMailOptions['watchHtml'];
  /** AMP4Email content for interactive emails */
  amp?: SendMailOptions['amp'];
  attachments?: SendMailOptions['attachments'];
  /**
   * Alternative content representations (e.g. Markdown alongside HTML).
   * Uses the same format as attachments. Email clients pick the best match.
   */
  alternatives?: SendMailOptions['alternatives'];

  // --- Headers & metadata ---
  /** Custom SMTP headers (e.g. X-Priority, X-Mailer, business-specific headers) */
  headers?: SendMailOptions['headers'];
  /** Email priority: 'high', 'normal', 'low' */
  priority?: SendMailOptions['priority'];
  /** Custom Message-ID value (random value generated if not set) */
  messageId?: SendMailOptions['messageId'];
  /** Custom Date value (current UTC string used if not set) */
  date?: SendMailOptions['date'];
  /** Control or disable the X-Mailer header (false to remove, string to override) */
  xMailer?: SendMailOptions['xMailer'];

  // --- Threading ---
  /** Message-ID of the email being replied to (for conversation threading) */
  inReplyTo?: SendMailOptions['inReplyTo'];
  /** Message-ID list this email references (for conversation threading) */
  references?: SendMailOptions['references'];

  // --- Encoding ---
  /** Force content-transfer-encoding: 'quoted-printable' or 'base64' */
  textEncoding?: SendMailOptions['textEncoding'];
  /** Encoding for the message (e.g. 'base64', 'hex') */
  encoding?: SendMailOptions['encoding'];
  /** Method to normalize header key casing */
  normalizeHeaderKey?: SendMailOptions['normalizeHeaderKey'];

  // --- Advanced features ---
  /**
   * Calendar event invitation (iCalendar format).
   * @example { method: 'REQUEST', content: icsString }
   */
  icalEvent?: SendMailOptions['icalEvent'];
  /**
   * RFC 2369 List-* headers for mailing lists and newsletters.
   * Email clients like Gmail/Outlook show an "Unsubscribe" button when set.
   * @example { unsubscribe: { url: 'https://example.com/unsubscribe', comment: 'Unsubscribe' } }
   */
  list?: SendMailOptions['list'];
  /**
   * Custom SMTP envelope for controlling MAIL FROM and RCPT TO independently.
   * @example { from: 'bounce+123@example.com', to: 'recipient@example.com' }
   */
  envelope?: SendMailOptions['envelope'];
  /** Per-message DKIM signing options (overrides transport-level DKIM) */
  dkim?: SendMailOptions['dkim'];
  /** Convert data: URIs in HTML to embedded CID attachments automatically */
  attachDataUrls?: SendMailOptions['attachDataUrls'];

  // --- Security ---
  /** Fail with an error when content tries to load from a URL */
  disableUrlAccess?: SendMailOptions['disableUrlAccess'];
  /** Fail with an error when content tries to load from a file path */
  disableFileAccess?: SendMailOptions['disableFileAccess'];

  // --- Raw MIME ---
  /**
   * Pre-built MIME message. When set, skips message generation entirely.
   * Address headers and envelope must still be set separately.
   */
  raw?: SendMailOptions['raw'];

  // --- DSN & Auth (not in @types/nodemailer but supported by nodemailer) ---
  /**
   * Delivery Status Notification (DSN) configuration.
   * @example { id: 'msg-123', return: 'headers', notify: 'success', recipient: 'sender@example.com' }
   */
  dsn?: {
    id?: string;
    return?: 'headers' | 'full';
    notify?: string | string[];
    recipient?: string;
  };
  /**
   * Per-message OAuth2 authentication for sending on behalf of different users.
   * Requires the transporter to be configured with type: 'OAuth2'.
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
    user?: string;
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
        user: typeof auth.user === 'string' ? auth.user : undefined,
      };
      if (authType === 'OAuth2') {
        features.push('oauth2');
      }
    }

    if (options.dkim) features.push('dkim');
    if (options.pool) features.push('pool');
    if (options.proxy) features.push('proxy');
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
          from: options.from ?? settings.defaultFrom,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo ?? settings.defaultReplyTo,
          subject: options.subject,
          text: options.text ?? options.html,
          html: options.html ?? options.text,
        };

        // Addressing
        if (options.sender) {
          message.sender = options.sender;
        }

        // Content
        if (options.attachments) {
          message.attachments = options.attachments;
        }
        if (options.alternatives) {
          message.alternatives = options.alternatives;
        }
        if (options.watchHtml) {
          message.watchHtml = options.watchHtml;
        }
        if (options.amp) {
          message.amp = options.amp;
        }

        // Headers & metadata
        if (options.headers) {
          message.headers = options.headers;
        }
        if (options.priority) {
          message.priority = options.priority;
        }
        if (options.messageId) {
          message.messageId = options.messageId;
        }
        if (options.date) {
          message.date = options.date;
        }
        if (options.xMailer !== undefined) {
          message.xMailer = options.xMailer;
        }

        // Threading
        if (options.inReplyTo) {
          message.inReplyTo = options.inReplyTo;
        }
        if (options.references) {
          message.references = options.references;
        }

        // Encoding
        if (options.textEncoding) {
          message.textEncoding = options.textEncoding;
        }
        if (options.encoding) {
          message.encoding = options.encoding;
        }
        if (options.normalizeHeaderKey) {
          message.normalizeHeaderKey = options.normalizeHeaderKey;
        }

        // Advanced features
        if (options.icalEvent) {
          message.icalEvent = options.icalEvent;
        }
        if (options.list) {
          message.list = options.list;
        }
        if (options.envelope) {
          message.envelope = options.envelope;
        }
        if (options.dkim) {
          message.dkim = options.dkim;
        }
        if (options.attachDataUrls) {
          message.attachDataUrls = options.attachDataUrls;
        }

        // Security
        if (options.disableUrlAccess) {
          message.disableUrlAccess = options.disableUrlAccess;
        }
        if (options.disableFileAccess) {
          message.disableFileAccess = options.disableFileAccess;
        }

        // Raw MIME
        if (options.raw) {
          message.raw = options.raw;
        }

        // DSN and per-message auth (supported by nodemailer, not fully typed)
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

/**
 * Options passed through from Strapi `plugin::email` config `providerOptions`,
 * historically compatible with `require('sendmail')` (guileen/node-sendmail).
 */
export interface ProviderSendmailOptions {
  logger?: {
    debug?: (...args: unknown[]) => void;
    info?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  };
  silent?: boolean;
  dkim?:
    | boolean
    | {
        privateKey: string;
        keySelector?: string;
      };
  /** Development / testing: connect to `devHost:devPort` instead of resolving MX. */
  devPort?: number | boolean;
  devHost?: string;
  /** SMTP port for outbound delivery (default 25). */
  smtpPort?: number;
  /** Extra SMTP host to try after MX records (same as legacy `sendmail` package). */
  smtpHost?: string | number;
  rejectUnauthorized?: boolean;
  autoEHLO?: boolean;
}

export interface Settings {
  defaultFrom: string;
  defaultReplyTo?: string;
}

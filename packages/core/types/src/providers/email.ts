/**
 * The module an email provider package exports.
 *
 * `init` is declared as a property, not a method, so its parameters are checked
 * strictly: a provider cannot require more from `settings` than the email plugin
 * passes. `Options` is the provider's own type for the `providerOptions` config,
 * which the plugin passes as it is.
 */
export interface Factory<Options = object> {
  /**
   * The provider name, e.g. `nodemailer`.
   */
  name: string;
  init: (options: Options, settings: Settings) => Provider;
}

/**
 * The `plugin::email` config. `providerOptions` is checked against the options
 * of the imported provider:
 *
 * ```ts
 * import nodemailer from '@strapi/provider-email-nodemailer';
 *
 * email: {
 *   config: {
 *     provider: nodemailer,
 *     providerOptions: { host: env('SMTP_HOST'), port: env.int('SMTP_PORT') },
 *     settings: { defaultFrom: 'hello@example.com' },
 *   } satisfies Providers.Email.Config<typeof nodemailer>,
 * },
 * ```
 */
export interface Config<F extends Factory<never> = Factory> {
  provider: F;
  /**
   * Passed to `provider.init`.
   */
  providerOptions?: Parameters<F['init']>[0];
  /**
   * Passed to `provider.init`. The email plugin's default config sets
   * `defaultFrom`.
   */
  settings?: Partial<Settings>;
}

export interface Provider {
  send: (options: SendOptions) => Promise<unknown>;
  verify?: () => Promise<boolean>;
  isIdle?: () => boolean;
  close?: () => void;
  getCapabilities?: () => Capabilities;
}

/**
 * The options the email plugin passes to `Provider.send`.
 * Providers can accept wider types and extra keys.
 */
export interface SendOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  [key: string]: unknown;
}

/**
 * The `settings` key of the `plugin::email` config.
 * The email plugin's default config always sets `defaultFrom`.
 */
export interface Settings {
  defaultFrom: string;
  defaultReplyTo?: string;
}

export interface Capabilities {
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

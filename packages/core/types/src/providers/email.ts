/**
 * An email provider module, such as `@strapi/provider-email-nodemailer`, as the email plugin loads it.
 * It exports its `name`, and may carry other members.
 *
 * The plugin `require`s the module and reads `init` from it, with no `.default` interop, so the
 * module must be the CommonJS export itself. Check it with `satisfies`, which needs this package
 * only as a type-only dependency:
 *
 * @example
 * import type { Providers } from '@strapi/types';
 *
 * export = {
 *   name: 'webhook',
 *   init(options: { url: string }, settings) {
 *     return {
 *       async send(email) {
 *         await fetch(options.url, {
 *           method: 'POST',
 *           body: JSON.stringify({ from: settings.defaultFrom, ...email }),
 *         });
 *       },
 *     };
 *   },
 * } satisfies Providers.Email.Factory<{ url: string }>;
 *
 * In an application, `factories.createEmailProvider` from `@strapi/strapi` does the same and keeps
 * the module's own type.
 *
 * `init` is declared as a property, not a method, so its parameters are checked strictly: a
 * provider cannot require more from `settings` than the email plugin passes.
 *
 * @template TOptions - The `providerOptions` of the email config, which `init` receives as is.
 * @template TProvider - The provider `init` returns, with its members outside the contract.
 */
export type Factory<TOptions = Record<string, unknown>, TProvider extends Provider = Provider> = {
  /** The provider name, such as `nodemailer`. */
  name: string;
  init: (options: TOptions, settings: Settings) => TProvider;
  [member: string]: unknown;
};

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

import type { Plugin, Providers } from '@strapi/types';

/**
 * A provider module imported in the `plugin::email` config.
 * `init` takes `never` options so a module typed with its own options matches.
 */
export type ProviderModule = Providers.Email.Factory<never>;

/**
 * A provider module as the email plugin loads it. A module resolved by name can
 * predate `name`, so it is checked at runtime.
 */
export type LoadedProviderModule = Omit<ProviderModule, 'name'> & { name?: unknown };

/**
 * The resolved `plugin::email` config. The plugin loader merges the user config
 * over the defaults in `config.ts` with `defaultsDeep`, so `providerOptions`
 * and `settings.defaultFrom` are always set.
 */
export interface EmailConfig extends Record<string, unknown> {
  /**
   * An imported provider module, or a provider name (deprecated, except for the
   * default `sendmail` provider). The email plugin replaces it with the provider
   * name at bootstrap.
   */
  provider: string | ProviderModule;
  providerOptions: object;
  settings: Providers.Email.Settings;
}

type LoadedPluginConfig = Plugin.LoadedPlugin['config'];

export interface StrapiConfig extends LoadedPluginConfig {
  default: EmailConfig;
}

export interface EmailTemplateData {
  url?: string;
  user?: {
    email: string;
    firstname: string;
    lastname: string;
    username: string;
  };
}

export interface EmailOptions {
  from?: string;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  [key: string]: string | undefined; // to allow additional template attributes if needed
}

export interface EmailTemplate {
  subject: string;
  text: string;
  html?: string;
  [key: string]: string | undefined; // to allow additional template attributes if needed
}

export type SendOptions = EmailOptions & EmailTemplate;

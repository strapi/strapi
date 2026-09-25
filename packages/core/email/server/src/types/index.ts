import type { Plugin } from '@strapi/types';
import type EmailService from '../services/email';

export interface EmailConfig extends Record<string, unknown> {
  provider: string;
  providerOptions?: object;
  settings?: {
    defaultFrom?: string;
  };
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

/** Default contracts loaded with the Email server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::email.email': ReturnType<typeof EmailService>;
      }
    }
  }
}

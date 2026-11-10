import type { ProviderCapabilities } from '../../../shared/types';
import type { EmailConfig, EmailOptions, EmailTemplate } from '../types';

/**
 * The object that the provider module's `init` returns. Bootstrap sets it, as it is, on
 * `strapi.plugin('email').provider`.
 */
export interface EmailProvider {
  /**
   * Sends an email.
   *
   * @param options - The email options and the template attributes. `sendTemplatedEmail` leaves out
   * the template attributes that are empty, so `subject` and `text` can be missing.
   * @returns A result that depends on the provider: `undefined` for sendmail, the message info of
   * the transport for nodemailer.
   */
  send: (options: EmailOptions & Partial<EmailTemplate>) => Promise<unknown>;
  verify?: () => Promise<boolean>;
  isIdle?: () => boolean;
  close?: () => void;
  getCapabilities?: () => ProviderCapabilities;
}

/** An email provider package, such as `@strapi/provider-email-sendmail`, as `require` loads it. */
export interface EmailProviderModule {
  init: (
    options: EmailConfig['providerOptions'],
    settings: EmailConfig['settings']
  ) => EmailProvider;
  name?: string;
  provider?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /** Set at bootstrap (`bootstrap.ts`). */
      interface PackagePluginProviders {
        email: EmailProvider;
      }
    }
  }
}

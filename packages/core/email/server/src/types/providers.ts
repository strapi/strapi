import type { ProviderCapabilities } from '../../../shared/types';
import type { EmailConfig } from '../types';
import type { EmailOptionsInput } from './services';

/**
 * The options a provider's `send` receives: the addresses and the content of the email, and every
 * other option as the caller passed it, such as the `headers` object and the `attachments` array
 * that nodemailer forwards. `sendTemplatedEmail` leaves out the template attributes that are empty,
 * so `subject`, `text` and `html` can be missing.
 */
export type ProviderSendOptions = EmailOptionsInput & {
  subject?: string | undefined;
  text?: string | undefined;
  html?: string | undefined;
};

/**
 * The object that the provider module's `init` returns. Bootstrap sets it, as it is, on
 * `strapi.plugin('email').provider`.
 */
export interface EmailProvider {
  /**
   * Sends an email.
   *
   * @param options - The email options and the template attributes, as the service received them.
   * @returns A result that depends on the provider: `undefined` for sendmail, the message info of
   * the transport for nodemailer.
   */
  send: (options: ProviderSendOptions) => Promise<unknown>;
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
      /**
       * Set at bootstrap (`bootstrap.ts`). An application whose provider has other members declares
       * its own type in `AppPluginProviders`, which takes precedence.
       */
      interface PackagePluginProviders {
        email: EmailProvider;
      }
    }
  }
}

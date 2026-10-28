import type { RateLimitOptions } from './rate-limit';
import type { EmailConfig, EmailTemplate } from '../types';

export type { RateLimitOptions } from './rate-limit';

/**
 * `strapi.config.get('plugin::email')`: the plugin config merged with its defaults, and the
 * `ratelimit` options the `rateLimit` middleware merges with `{ enabled: true }`.
 */
export type EmailPluginConfig = EmailConfig & {
  ratelimit?: RateLimitOptions & { enabled?: boolean };
};

/**
 * The addresses of an email, as `EmailOptions` declares them, except that the optional ones also
 * accept `undefined`: callers pass unset settings as they read them, such as the admin's
 * `admin.forgotPassword.from` and `replyTo`.
 */
export type EmailOptionsInput = {
  from?: string | undefined;
  to: string;
  cc?: string | undefined;
  bcc?: string | undefined;
  replyTo?: string | undefined;
  [key: string]: string | undefined;
};

/** An email to send: its addresses and its content. */
export type SendOptionsInput = EmailOptionsInput & EmailTemplate;

/** The `email` service: sends emails through the configured provider. */
export type EmailService = {
  /**
   * Returns the plugin config, as `strapi.config.get('plugin::email')` does.
   *
   * @internal
   */
  getProviderSettings(): EmailConfig;
  /**
   * Sends an email through the configured provider.
   *
   * @returns The provider's result, which depends on the provider: `undefined` for sendmail, the
   * message info of the transport for nodemailer. Rejects with the provider's error.
   */
  send(options: SendOptionsInput): Promise<unknown>;
  /**
   * Fills `subject`, `text` and `html` of the template with `data`, then sends the email through
   * the configured provider.
   *
   * Throws synchronously, rather than returning a rejected promise, when the template has no
   * `subject`, `text` or `html` key, or when a template does not compile.
   *
   * @param data - The values the templates interpolate with `<%= key %>`; nested keys are dot paths.
   * @returns The provider's result, as `send` returns it.
   */
  sendTemplatedEmail(
    emailOptions: EmailOptionsInput,
    emailTemplate: EmailTemplate,
    data: object
  ): Promise<unknown>;
};

/** Email services by name, as registered by the plugin. */
export type Services = {
  email: EmailService;
};

/** Default contracts loaded with the Email server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::email.email': Services['email'];
      }

      interface PackageConfigs {
        'plugin::email': EmailPluginConfig;
      }

      interface PackageMiddlewares {
        // Spread over the options read from the `ratelimit` key of the plugin config.
        'plugin::email.rateLimit': RateLimitOptions | undefined;
      }

      /** Registered at bootstrap (`bootstrap.ts`). */
      interface PermissionActions {
        'plugin::email.settings.read': true;
      }
    }
  }
}

import type EmailService from '../services/email';

/** Email services by name, as registered by the plugin. */
export type Services = {
  email: ReturnType<typeof EmailService>;
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

      interface PackageMiddlewares {
        // TODO @Nico The factory spreads its config over the koa2-ratelimit options read from the
        // `ratelimit` key of the plugin config; type it once those options have a contract.
        'plugin::email.rateLimit': unknown;
      }
    }
  }
}

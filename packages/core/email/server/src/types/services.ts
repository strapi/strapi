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
    }
  }
}

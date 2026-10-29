import type { Core } from '@strapi/types';

/** Admin and Content API actions sending emails, and admin actions on the email settings. */
export type EmailController = {
  send: Core.ControllerHandler;
  test: Core.ControllerHandler;
  getSettings: Core.ControllerHandler;
  verify: Core.ControllerHandler;
};

/** The controller contracts by name, as in the plugin's controllers map. Used to check the routes. */
export type Controllers = {
  email: EmailController;
};

/** Default controller contracts loaded with the Email server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageControllers {
        'plugin::email.email': Controllers['email'];
      }
    }
  }
}

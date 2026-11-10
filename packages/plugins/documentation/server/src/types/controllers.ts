import type { Core } from '@strapi/types';

/** Actions serving the documentation page and its login, and admin actions on the documentation. */
export type DocumentationController = {
  getInfos: Core.ControllerHandler;
  index: Core.ControllerHandler;
  loginView: Core.ControllerHandler;
  login: Core.ControllerHandler;
  regenerateDoc: Core.ControllerHandler;
  deleteDoc: Core.ControllerHandler;
  updateSettings: Core.ControllerHandler;
};

/** The controller contracts by name, as in the plugin's controllers map. Used to check the routes. */
export type Controllers = {
  documentation: DocumentationController;
};

/** Default controller contracts loaded with the Documentation server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageControllers {
        'plugin::documentation.documentation': Controllers['documentation'];
      }
    }
  }
}

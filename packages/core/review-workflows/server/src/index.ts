import type { Core } from '@strapi/types';

import register from './register';
import contentTypes from './content-types';
import bootstrap from './bootstrap';
import destroy from './destroy';
import routes from './routes';
import services from './services';
import controllers from './controllers';
import { registerReviewWorkflowsEntitlements } from './entitlements';

// TODO @Nico This feature gate still reads the ambient `strapi`. The core plugin loader
// (`loadConfigFile`) only passes `{ env }` to function exports, so no injected `strapi` exists here.
// Gating inside register/bootstrap is not equivalent: the module registry loads services, controllers
// and routes before `register` runs, and content-releases relies on `service('workflows')` being
// undefined when the feature is off. Removing this read needs the loader to pass `strapi` to the
// plugin entry (same pattern in content-releases and the admin EE entry).
const getPlugin = () => {
  if (strapi.ee.features.isEnabled('review-workflows')) {
    return {
      register,
      bootstrap,
      destroy,
      contentTypes,
      services,
      controllers,
      routes,
    };
  }

  return {
    // Keeps the limits resolvable for a license that lapsed before boot
    register({ strapi }: { strapi: Core.Strapi }) {
      registerReviewWorkflowsEntitlements(strapi);
    },
    // Always return contentTypes to avoid losing data when the feature is disabled
    // or downgrading the license
    contentTypes,
  };
};

export default getPlugin();

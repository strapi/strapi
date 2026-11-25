import type { Core } from '@strapi/types';

import register from './register';
import contentTypes from './content-types';
import bootstrap from './bootstrap';
import destroy from './destroy';
import routes from './routes';
import services from './services';
import controllers from './controllers';
import { registerReviewWorkflowsEntitlements } from './entitlements';

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

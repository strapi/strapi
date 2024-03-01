/* eslint-disable @typescript-eslint/no-var-requires */
import type { Core } from '@strapi/types';

import { ACTIONS } from './constants';
import { deleteActionsOnDeleteContentType } from './migrations';

export const register = async ({ strapi }: { strapi: Core.LoadedStrapi }) => {
  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);

    strapi.hook('strapi::content-types.afterSync').register(deleteActionsOnDeleteContentType);
  }
};

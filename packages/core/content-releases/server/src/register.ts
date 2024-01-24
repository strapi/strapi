/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi } from '@strapi/types';

import { ACTIONS } from './constants';
import {
  deleteActionsOnDeleteContentType,
  deleteActionsOnDisableDraftAndPublish,
} from './migrations';

const { features } = require('@strapi/strapi/dist/utils/ee');

export const register = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (features.isEnabled('cms-content-releases')) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);

    strapi.hook('strapi::content-types.beforeSync').register(deleteActionsOnDisableDraftAndPublish);
    strapi.hook('strapi::content-types.afterSync').register(deleteActionsOnDeleteContentType);
  }
};

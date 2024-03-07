/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi } from '@strapi/types';

import { ACTIONS, RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from './constants';
import {
  deleteActionsOnDeleteContentType,
  deleteActionsOnDisableDraftAndPublish,
  migrateIsValidAndStatusReleases,
  revalidateChangedContentTypes,
} from './migrations';

const { features } = require('@strapi/strapi/dist/utils/ee');

export const register = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (features.isEnabled('cms-content-releases')) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);

    strapi.hook('strapi::content-types.beforeSync').register(deleteActionsOnDisableDraftAndPublish);
    strapi
      .hook('strapi::content-types.afterSync')
      .register(deleteActionsOnDeleteContentType)
      .register(revalidateChangedContentTypes)
      .register(migrateIsValidAndStatusReleases);
  }

  if (strapi.plugin('graphql')) {
    // Exclude the release and release action models from the GraphQL schema
    strapi.plugin('graphql').service('extension').shadowCRUD(RELEASE_MODEL_UID).disable();
    strapi.plugin('graphql').service('extension').shadowCRUD(RELEASE_ACTION_MODEL_UID).disable();
  }
};

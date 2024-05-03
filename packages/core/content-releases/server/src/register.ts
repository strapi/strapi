/* eslint-disable @typescript-eslint/no-var-requires */
import type { Core } from '@strapi/types';

import { ACTIONS, RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from './constants';
import {
  deleteActionsOnDeleteContentType,
  deleteActionsOnDisableDraftAndPublish,
  migrateIsValidAndStatusReleases,
  revalidateChangedContentTypes,
  disableContentTypeLocalized,
  enableContentTypeLocalized,
} from './migrations';
import { release, releaseAction } from './models';

export const register = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Always add the models to avoid losing data when feature is disabled
  strapi.get('models').add(release);
  strapi.get('models').add(releaseAction);

  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    await strapi.service('admin::permission').actionProvider.registerMany(ACTIONS);

    strapi
      .hook('strapi::content-types.beforeSync')
      .register(disableContentTypeLocalized)
      .register(deleteActionsOnDisableDraftAndPublish);

    strapi
      .hook('strapi::content-types.afterSync')
      .register(deleteActionsOnDeleteContentType)
      .register(enableContentTypeLocalized)
      .register(revalidateChangedContentTypes)
      .register(migrateIsValidAndStatusReleases);
  }

  if (strapi.plugin('graphql')) {
    const graphqlExtensionService = strapi.plugin('graphql').service('extension');
    // Exclude the release and release action models from the GraphQL schema
    graphqlExtensionService.shadowCRUD(RELEASE_MODEL_UID).disable();
    graphqlExtensionService.shadowCRUD(RELEASE_ACTION_MODEL_UID).disable();
  }
};

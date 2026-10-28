/* eslint-disable @typescript-eslint/no-var-requires */
import type { Core } from '@strapi/types';

import { ACTIONS, RELEASE_MODEL_UID, RELEASE_ACTION_MODEL_UID } from './constants';
import {
  deleteActionsOnDeleteContentType,
  deleteActionsOnDisableDraftAndPublish,
  migrateIsValidAndStatusReleases,
  addReasonsToInvalidActions,
  migrateReleaseConditionReleases,
  addOutcomesToReleasedReleases,
  revalidateChangedContentTypes,
  disableContentTypeLocalized,
  enableContentTypeLocalized,
} from './migrations';
import type { ContentTypesSyncInput } from './migrations';
import { addEntryDocumentToReleaseActions } from './migrations/database/5.0.0-document-id-in-actions';

export const register = async ({ strapi }: { strapi: Core.Strapi }) => {
  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    await strapi.service('admin::permission').actionProvider.registerMany(ACTIONS);

    strapi.db.migrations.providers.internal.register(addEntryDocumentToReleaseActions);

    strapi
      .hook('strapi::content-types.beforeSync')
      .register((input: ContentTypesSyncInput) => disableContentTypeLocalized(input, { strapi }));

    // After the sync: the removals recalculate statuses, which reads the current schema
    strapi
      .hook('strapi::content-types.afterSync')
      .register((input: ContentTypesSyncInput) =>
        deleteActionsOnDeleteContentType(input, { strapi })
      )
      .register((input: ContentTypesSyncInput) =>
        deleteActionsOnDisableDraftAndPublish(input, { strapi })
      )
      .register((input: ContentTypesSyncInput) => enableContentTypeLocalized(input, { strapi }))
      .register((input: ContentTypesSyncInput) => revalidateChangedContentTypes(input, { strapi }))
      .register(() => migrateIsValidAndStatusReleases({ strapi }))
      .register(() => addReasonsToInvalidActions({ strapi }))
      .register(() => migrateReleaseConditionReleases({ strapi }))
      .register(() => addOutcomesToReleasedReleases({ strapi }));
  }

  if (strapi.plugin('graphql')) {
    const graphqlExtensionService = strapi.plugin('graphql').service('extension');
    // Exclude the release and release action models from the GraphQL schema
    graphqlExtensionService.shadowCRUD(RELEASE_MODEL_UID).disable();
    graphqlExtensionService.shadowCRUD(RELEASE_ACTION_MODEL_UID).disable();
  }
};

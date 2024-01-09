/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi } from '@strapi/types';
import { ACTIONS } from './constants';

import { getService } from './utils';

const { features } = require('@strapi/strapi/dist/utils/ee');

export const register = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (
    features.isEnabled('cms-content-releases') &&
    strapi.features.future.isEnabled('contentReleases')
  ) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);

    const releaseActionService = getService('release-action', { strapi });
    // Clean up release-actions when draft and publish is disabled
    strapi.eventHub.on('content-type.update', async ({ contentType }) => {
      if (contentType.schema.options.draftAndPublish === false) {
        await releaseActionService.deleteManyForContentType(contentType.uid);
      }
    });
    // Clean up release-actions when a content-type is deleted
    strapi.eventHub.on('content-type.delete', async ({ contentType }) => {
      await releaseActionService.deleteManyForContentType(contentType.uid);
    });
  }
};

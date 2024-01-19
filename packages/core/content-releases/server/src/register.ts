/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi, Schema } from '@strapi/types';
import { contentTypes as contentTypesUtils, mapAsync } from '@strapi/utils';

import { difference, keys } from 'lodash';
import { ACTIONS, RELEASE_ACTION_MODEL_UID } from './constants';

const { features } = require('@strapi/strapi/dist/utils/ee');

interface Input {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
}

const disableDraftAndPublish = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if d&p was disabled remove unpublish content before sync
    if (
      contentTypesUtils.hasDraftAndPublish(oldContentType) &&
      !contentTypesUtils.hasDraftAndPublish(contentType)
    ) {
      // await strapi.db?.queryBuilder(uid).delete().where({ published_at: null }).execute();
      await strapi.db
        ?.queryBuilder(RELEASE_ACTION_MODEL_UID)
        .delete()
        .where({ contentType: uid })
        .execute();
    }
  }
};

async function migrateDeletedContentType({ oldContentTypes, contentTypes }: any) {
  const deletedContentTypes = difference(keys(oldContentTypes), keys(contentTypes)) ?? [];

  if (deletedContentTypes.length) {
    await mapAsync(deletedContentTypes, async (deletedContentTypeUID: unknown) => {
      return strapi.db
        ?.queryBuilder(RELEASE_ACTION_MODEL_UID)
        .delete()
        .where({ contentType: deletedContentTypeUID })
        .execute();
    });
  }
}

export const register = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (features.isEnabled('cms-content-releases')) {
    await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);

    strapi.hook('strapi::content-types.beforeSync').register(disableDraftAndPublish);
    strapi.hook('strapi::content-types.afterSync').register(migrateDeletedContentType);
  }
};

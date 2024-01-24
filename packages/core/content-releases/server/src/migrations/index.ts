import type { Schema } from '@strapi/types';
import { contentTypes as contentTypesUtils, mapAsync } from '@strapi/utils';

import { difference, keys } from 'lodash';
import { RELEASE_ACTION_MODEL_UID } from '../constants';

interface Input {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
}

export async function deleteActionsOnDisableDraftAndPublish({
  oldContentTypes,
  contentTypes,
}: Input) {
  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    if (
      contentTypesUtils.hasDraftAndPublish(oldContentType) &&
      !contentTypesUtils.hasDraftAndPublish(contentType)
    ) {
      await strapi.db
        ?.queryBuilder(RELEASE_ACTION_MODEL_UID)
        .delete()
        .where({ contentType: uid })
        .execute();
    }
  }
}

export async function deleteActionsOnDeleteContentType({ oldContentTypes, contentTypes }: Input) {
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

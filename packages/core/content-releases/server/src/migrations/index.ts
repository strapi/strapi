import type { Schema } from '@strapi/types';
import { mapAsync } from '@strapi/utils';

import { difference, keys } from 'lodash';
import { RELEASE_ACTION_MODEL_UID } from '../constants';

interface Input {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
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

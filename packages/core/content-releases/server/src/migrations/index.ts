import type { Schema } from '@strapi/types';
import { contentTypes as contentTypesUtils, mapAsync } from '@strapi/utils';

import { difference, keys } from 'lodash';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import { getPopulatedEntry, getEntryValidStatus, getService } from '../utils';

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

export async function migrateIsValidAndStatusReleases() {
  const releasesWithoutStatus = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      status: null,
      releasedAt: null,
    },
    populate: {
      actions: {
        populate: {
          entry: true,
        },
      },
    },
  });

  mapAsync(releasesWithoutStatus, async (release) => {
    const actions = release.actions;

    // check isValid is null
    const notValidatedActions = actions.filter((action) => action.isValid === null);

    for (const action of notValidatedActions) {
      console.log('action', action);
      const populatedEntry = await getPopulatedEntry(action.contentType, action.entry.id, {
        strapi,
      });
      const isValid = getEntryValidStatus(action.target_type, populatedEntry, { strapi });

      await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
        where: {
          id: action.id,
        },
        data: {
          isValid,
        },
      });
    }

    return getService('release', { strapi }).updateReleaseStatus(release.id);
  });

  const publishedReleases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      status: null,
      releasedAt: {
        $notNull: true,
      },
    },
  });

  mapAsync(publishedReleases, async (release) => {
    return strapi.db.query(RELEASE_MODEL_UID).update({
      where: {
        id: release.id,
      },
      data: {
        status: 'done',
      },
    });
  });
}

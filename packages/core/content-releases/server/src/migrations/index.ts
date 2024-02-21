import type { Schema } from '@strapi/types';
import { contentTypes as contentTypesUtils, mapAsync } from '@strapi/utils';

import { difference, keys } from 'lodash';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import { getPopulatedEntry, getEntryValidStatus, getService } from '../utils';
import { Release } from '../../../shared/contracts/releases';

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
  const releasesWithoutStatus = (await strapi.db.query(RELEASE_MODEL_UID).findMany({
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
  })) as Release[];

  mapAsync(releasesWithoutStatus, async (release: Release) => {
    const actions = release.actions;

    const notValidatedActions = actions.filter((action) => action.isEntryValid === null);

    for (const action of notValidatedActions) {
      // We need to check the Action is related to a valid entry because we can't assume this is gonna be always the case
      // example: users could make changes directly to their database, or data could be lost
      if (action.entry) {
        const populatedEntry = await getPopulatedEntry(action.contentType, action.entry.id, {
          strapi,
        });

        if (populatedEntry) {
          const isEntryValid = getEntryValidStatus(action.contentType, populatedEntry, { strapi });

          await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
            where: {
              id: action.id,
            },
            data: {
              isEntryValid,
            },
          });
        }
      }
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

  mapAsync(publishedReleases, async (release: Release) => {
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

import type { Schema, UID } from '@strapi/types';
import { contentTypes as contentTypesUtils, async } from '@strapi/utils';
import isEqual from 'lodash/isEqual';

import { difference, keys } from 'lodash';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import { getDraftEntryValidStatus, getService } from '../utils';
import { Release } from '../../../shared/contracts/releases';
import { ReleaseAction } from '../../../shared/contracts/release-actions';

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
    await async.map(deletedContentTypes, async (deletedContentTypeUID: unknown) => {
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

  async.map(releasesWithoutStatus, async (release: Release) => {
    const actions = release.actions;

    const notValidatedActions = actions.filter((action) => action.isEntryValid === null);

    for (const action of notValidatedActions) {
      // We need to check the Action is related to a valid entry because we can't assume this is gonna be always the case
      // example: users could make changes directly to their database, or data could be lost
      if (action.entry) {
        const isEntryValid = getDraftEntryValidStatus(
          {
            contentType: action.contentType,
            documentId: action.entryDocumentId,
            locale: action.locale,
          },
          { strapi }
        );

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

  async.map(publishedReleases, async (release: Release) => {
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

export async function revalidateChangedContentTypes({ oldContentTypes, contentTypes }: Input) {
  if (oldContentTypes !== undefined && contentTypes !== undefined) {
    const contentTypesWithDraftAndPublish = Object.keys(oldContentTypes).filter(
      (uid) => oldContentTypes[uid]?.options?.draftAndPublish
    );
    const releasesAffected = new Set();

    async
      .map(contentTypesWithDraftAndPublish, async (contentTypeUID: UID.ContentType) => {
        const oldContentType = oldContentTypes[contentTypeUID];
        const contentType = contentTypes[contentTypeUID];

        // If attributes have changed, we need to revalidate actions because maybe validations rules are different
        if (!isEqual(oldContentType?.attributes, contentType?.attributes)) {
          const actions = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
            where: {
              contentType: contentTypeUID,
            },
            populate: {
              entry: true,
              release: true,
            },
          });

          await async.map(actions, async (action: ReleaseAction) => {
            if (action.entry && action.release && action.type === 'publish') {
              const isEntryValid = await getDraftEntryValidStatus(
                {
                  contentType: contentTypeUID,
                  documentId: action.entryDocumentId,
                  locale: action.locale,
                },
                { strapi }
              );

              releasesAffected.add(action.release.id);

              await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
                where: {
                  id: action.id,
                },
                data: {
                  isEntryValid,
                },
              });
            }
          });
        }
      })
      .then(() => {
        // We need to update the status of the releases affected
        async.map(releasesAffected, async (releaseId: Release['id']) => {
          return getService('release', { strapi }).updateReleaseStatus(releaseId);
        });
      });
  }
}

export async function disableContentTypeLocalized({ oldContentTypes, contentTypes }: Input) {
  if (!oldContentTypes) {
    return;
  }

  const i18nPlugin = strapi.plugin('i18n');
  if (!i18nPlugin) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    const { isLocalizedContentType } = i18nPlugin.service('content-types');

    // if i18N is disabled remove non default locales before sync
    if (isLocalizedContentType(oldContentType) && !isLocalizedContentType(contentType)) {
      await strapi.db
        .queryBuilder(RELEASE_ACTION_MODEL_UID)
        .update({
          locale: null,
        })
        .where({ contentType: uid })
        .execute();
    }
  }
}

export async function enableContentTypeLocalized({ oldContentTypes, contentTypes }: Input) {
  if (!oldContentTypes) {
    return;
  }

  const i18nPlugin = strapi.plugin('i18n');
  if (!i18nPlugin) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    const { isLocalizedContentType } = i18nPlugin.service('content-types');
    const { getDefaultLocale } = i18nPlugin.service('locales');

    // if i18N is enabled remove non default locales before sync
    if (!isLocalizedContentType(oldContentType) && isLocalizedContentType(contentType)) {
      const defaultLocale = await getDefaultLocale();

      await strapi.db
        .queryBuilder(RELEASE_ACTION_MODEL_UID)
        .update({
          locale: defaultLocale,
        })
        .where({ contentType: uid })
        .execute();
    }
  }
}

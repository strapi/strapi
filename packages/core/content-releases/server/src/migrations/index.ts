import type { Schema, UID } from '@strapi/types';
import { contentTypes as contentTypesUtils, async } from '@strapi/utils';
import isEqual from 'lodash/isEqual';

import { difference, keys } from 'lodash';
import {
  DEFAULT_RELEASE_CONDITION,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_MODEL_UID,
} from '../constants';
import { getDraftEntryValidity, getService, UNPUBLISH_VALIDITY } from '../utils';
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
    populate: { actions: true },
  })) as Release[];

  const migrate = async () => {
    for (const release of releasesWithoutStatus) {
      const notValidatedActions = release.actions.filter((action) => action.isEntryValid === null);

      for (const action of notValidatedActions) {
        const validity =
          action.type === 'publish'
            ? await getDraftEntryValidity(
                {
                  contentType: action.contentType,
                  documentId: action.entryDocumentId,
                  locale: action.locale,
                },
                { strapi }
              )
            : UNPUBLISH_VALIDITY;

        await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
          where: { id: action.id },
          data: validity,
        });
      }

      await getService('release', { strapi }).updateReleaseStatus(release.id);
    }

    await strapi.db.query(RELEASE_MODEL_UID).updateMany({
      where: { status: null, releasedAt: { $notNull: true } },
      data: { status: 'done' },
    });
  };

  migrate().catch((error: unknown) => {
    strapi.log.error('Error while migrating the status of releases created before v5', { error });
  });
}

export async function addReasonsToInvalidActions() {
  const actions: ReleaseAction[] = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
    where: {
      type: 'publish',
      isEntryValid: false,
      reason: { $null: true },
      outcome: null,
      release: { releasedAt: { $null: true } },
    },
    populate: { release: { select: ['id'] } },
  });

  if (actions.length === 0) {
    return;
  }

  const revalidate = async () => {
    const releaseIds = new Set<Release['id']>();

    for (const action of actions) {
      const validity = await getDraftEntryValidity(
        {
          contentType: action.contentType,
          documentId: action.entryDocumentId,
          locale: action.locale,
        },
        { strapi }
      );

      await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
        where: { id: action.id, outcome: null },
        data: validity,
      });
      releaseIds.add(action.release.id);
    }

    for (const releaseId of releaseIds) {
      await getService('release', { strapi }).updateReleaseStatus(releaseId);
    }
  };

  revalidate().catch((error: unknown) => {
    strapi.log.error('Error while adding reasons to release actions that are not publishable', {
      error,
    });
  });
}

export async function migrateReleaseConditionReleases() {
  await strapi.db.query(RELEASE_MODEL_UID).updateMany({
    where: { releaseCondition: null },
    data: { releaseCondition: DEFAULT_RELEASE_CONDITION },
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

        // If attributes have changed, we need to revalidate actions because maybe validations rules are different.
        // A deleted content type's actions are removed by deleteActionsOnDeleteContentType
        if (contentType && !isEqual(oldContentType?.attributes, contentType?.attributes)) {
          const actions = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
            where: {
              contentType: contentTypeUID,
              type: 'publish',
              outcome: null,
              release: { releasedAt: { $null: true } },
            },
            populate: { release: { select: ['id'] } },
          });

          await async.map(actions, async (action: ReleaseAction) => {
            const validity = await getDraftEntryValidity(
              {
                contentType: contentTypeUID,
                documentId: action.entryDocumentId,
                locale: action.locale,
              },
              { strapi }
            );

            releasesAffected.add(action.release.id);

            await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
              where: { id: action.id, outcome: null },
              data: validity,
            });
          });
        }
      })
      .then(() => {
        // We need to update the status of the releases affected
        return async.map(releasesAffected, async (releaseId: Release['id']) => {
          return getService('release', { strapi }).updateReleaseStatus(releaseId);
        });
      })
      // Not awaited by startup: a failure must not become an unhandled rejection
      .catch((error: unknown) => {
        strapi.log.error('Error while revalidating release actions after a content type change', {
          error,
        });
      });
  }
}

export async function disableContentTypeLocalized({ oldContentTypes, contentTypes }: Input) {
  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if i18N is disabled remove non default locales before sync
    if (
      strapi.localization.isLocalizedContentType(oldContentType) === true &&
      strapi.localization.isLocalizedContentType(contentType) === false
    ) {
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

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if i18N is enabled remove non default locales before sync
    if (
      strapi.localization.isLocalizedContentType(oldContentType) === false &&
      strapi.localization.isLocalizedContentType(contentType) === true
    ) {
      const defaultLocale = await strapi.localization.getDefaultLocale();

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

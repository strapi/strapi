import type { Core, Schema, UID } from '@strapi/types';
import { contentTypes as contentTypesUtils } from '@strapi/utils';
import isEqual from 'lodash/isEqual';

import { difference, keys } from 'lodash';
import {
  DEFAULT_RELEASE_CONDITION,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_MODEL_UID,
} from '../constants';
import { getActionValidity, getService } from '../utils';
import { Release } from '../../../shared/contracts/releases';

export interface ContentTypesSyncInput {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
}

// Its entries can no longer be published: its actions leave every release (see
// `deleteContentTypeActions`)
export async function deleteActionsOnDisableDraftAndPublish(
  { oldContentTypes, contentTypes }: ContentTypesSyncInput,
  { strapi }: { strapi: Core.Strapi }
) {
  if (!oldContentTypes) {
    return;
  }

  const disabledContentTypes = Object.keys(contentTypes).filter(
    (uid) =>
      oldContentTypes[uid] &&
      contentTypesUtils.hasDraftAndPublish(oldContentTypes[uid]) &&
      !contentTypesUtils.hasDraftAndPublish(contentTypes[uid])
  ) as UID.ContentType[];

  if (disabledContentTypes.length > 0) {
    await getService('release-action', { strapi }).deleteContentTypeActions(disabledContentTypes);
  }
}

export async function deleteActionsOnDeleteContentType(
  { oldContentTypes, contentTypes }: ContentTypesSyncInput,
  { strapi }: { strapi: Core.Strapi }
) {
  const deletedContentTypes = difference(
    keys(oldContentTypes),
    keys(contentTypes)
  ) as UID.ContentType[];

  if (deletedContentTypes.length > 0) {
    await getService('release-action', { strapi }).deleteContentTypeActions(deletedContentTypes);
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
    // One release failing must not leave the others without a status
    for (const release of releasesWithoutStatus) {
      try {
        const notValidatedActions = release.actions.filter(
          (action) => action.isEntryValid === null
        );

        for (const action of notValidatedActions) {
          const validity = await getActionValidity(action, { strapi });

          await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
            where: { id: action.id, outcome: null },
            data: validity,
          });
        }

        await getService('release', { strapi }).updateReleaseStatus(release.id);
      } catch (error: unknown) {
        strapi.log.error(`Error while migrating the status of release ${release.id}`, { error });
      }
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

// Planned actions stored as not publishable before reasons existed: publish actions get their
// draft's reason, unpublish actions an earlier version stored as invalid become valid. Finds
// nothing to do once every one has been through it.
export async function addReasonsToInvalidActions({ strapi }: { strapi: Core.Strapi }) {
  getService('release-action', { strapi })
    .revalidatePlannedActions({ isEntryValid: false, reason: { $null: true } })
    // Not awaited by startup: a failure must not become an unhandled rejection
    .catch((error: unknown) => {
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

export async function revalidateChangedContentTypes(
  { oldContentTypes, contentTypes }: ContentTypesSyncInput,
  { strapi }: { strapi: Core.Strapi }
) {
  if (oldContentTypes === undefined || contentTypes === undefined) {
    return;
  }

  // Changed attributes can change the validation rules. The actions of a deleted content type, or
  // of one that lost Draft and Publish, are removed (deleteContentTypeActions).
  const changedContentTypes = Object.keys(oldContentTypes).filter(
    (uid) =>
      contentTypes[uid] &&
      contentTypesUtils.hasDraftAndPublish(oldContentTypes[uid]) &&
      contentTypesUtils.hasDraftAndPublish(contentTypes[uid]) &&
      !isEqual(oldContentTypes[uid]?.attributes, contentTypes[uid]?.attributes)
  );

  if (changedContentTypes.length === 0) {
    return;
  }

  getService('release-action', { strapi })
    .revalidatePlannedActions({ contentType: { $in: changedContentTypes } })
    // Not awaited by startup: a failure must not become an unhandled rejection
    .catch((error: unknown) => {
      strapi.log.error('Error while revalidating release actions after a content type change', {
        error,
      });
    });
}

export async function disableContentTypeLocalized({
  oldContentTypes,
  contentTypes,
}: ContentTypesSyncInput) {
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

export async function enableContentTypeLocalized({
  oldContentTypes,
  contentTypes,
}: ContentTypesSyncInput) {
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

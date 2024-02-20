/* eslint-disable @typescript-eslint/no-var-requires */
import type { Common, LoadedStrapi, Entity as StrapiEntity } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID, ALLOWED_WEBHOOK_EVENTS } from './constants';
import { getEntryValidStatus, getService } from './utils';

const { features } = require('@strapi/strapi/dist/utils/ee');

export const bootstrap = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (features.isEnabled('cms-content-releases')) {
    const contentTypeWithDraftAndPublish = (
      Object.keys(strapi.contentTypes) as Array<Common.UID.ContentType>
    ).reduce((acc, contentTypeUid) => {
      const contentType = strapi.contentTypes[contentTypeUid];
      if (contentType.options?.draftAndPublish) {
        acc.push(contentTypeUid);
      }
      return acc;
    }, [] as Array<Common.UID.ContentType>);

    // Clean up release-actions when an entry is deleted
    strapi.db.lifecycles.subscribe({
      models: contentTypeWithDraftAndPublish,

      async afterDelete(event) {
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        const { model, result } = event;
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        if (model.kind === 'collectionType' && model.options?.draftAndPublish) {
          const { id } = result;

          const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
            where: {
              actions: {
                target_type: model.uid,
                target_id: id,
              },
            },
          });

          await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
            where: {
              target_type: model.uid,
              target_id: id,
            },
          });

          // We update the status of each release after delete the actions
          for (const release of releases) {
            getService('release', { strapi }).updateReleaseStatus(release.id);
          }
        }
      },
      /**
       * deleteMany hook doesn't return the deleted entries ids
       * so we need to fetch them before deleting the entries to save the ids on our state
       */
      async beforeDeleteMany(event) {
        const { model, params } = event;
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        if (model.kind === 'collectionType' && model.options?.draftAndPublish) {
          const { where } = params;
          const entriesToDelete = await strapi.db
            .query(model.uid)
            .findMany({ select: ['id'], where });
          event.state.entriesToDelete = entriesToDelete;
        }
      },
      /**
       * We delete the release actions related to deleted entries
       * We make this only after deleteMany is succesfully executed to avoid errors
       */
      async afterDeleteMany(event) {
        const { model, state } = event;
        const entriesToDelete = state.entriesToDelete;
        if (entriesToDelete) {
          const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
            where: {
              actions: {
                target_type: model.uid,
                target_id: {
                  $in: (entriesToDelete as Array<{ id: StrapiEntity.ID }>).map((entry) => entry.id),
                },
              },
            },
          });

          await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
            where: {
              target_type: model.uid,
              target_id: {
                $in: (entriesToDelete as Array<{ id: StrapiEntity.ID }>).map((entry) => entry.id),
              },
            },
          });

          // We update the status of each release after delete the actions
          for (const release of releases) {
            getService('release', { strapi }).updateReleaseStatus(release.id);
          }
        }
      },

      async afterUpdate(event) {
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        const { model, result } = event;
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        if (model.kind === 'collectionType' && model.options?.draftAndPublish) {
          const isEntryValid = getEntryValidStatus(model.uid as Common.UID.ContentType, result, {
            strapi,
          });

          await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
            where: {
              target_type: model.uid,
              target_id: result.id,
            },
            data: {
              isEntryValid,
            },
          });

          const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
            where: {
              actions: {
                target_type: model.uid,
                target_id: result.id,
              },
            },
          });

          for (const release of releases) {
            getService('release', { strapi }).updateReleaseStatus(release.id);
          }
        }
      },
    });

    if (strapi.features.future.isEnabled('contentReleasesScheduling')) {
      getService('scheduling', { strapi })
        .syncFromDatabase()
        .catch((err: Error) => {
          strapi.log.error(
            'Error while syncing scheduled jobs from the database in the content-releases plugin. This could lead to errors in the releases scheduling.'
          );

          throw err;
        });

      Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
        strapi.webhookStore.addAllowedEvent(key, value);
      });
    }
  }
};

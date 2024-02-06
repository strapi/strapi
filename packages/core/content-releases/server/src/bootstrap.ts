/* eslint-disable @typescript-eslint/no-var-requires */
import type { LoadedStrapi, Entity as StrapiEntity } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID } from './constants';
import { getService } from './utils';

const { features } = require('@strapi/strapi/dist/utils/ee');

export const bootstrap = async ({ strapi }: { strapi: LoadedStrapi }) => {
  if (features.isEnabled('cms-content-releases')) {
    // Clean up release-actions when an entry is deleted
    strapi.db.lifecycles.subscribe({
      afterDelete(event) {
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        const { model, result } = event;
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        if (model.kind === 'collectionType' && model.options?.draftAndPublish) {
          const { id } = result;
          strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
            where: {
              target_type: model.uid,
              target_id: id,
            },
          });
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
          await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
            where: {
              target_type: model.uid,
              target_id: {
                $in: (entriesToDelete as Array<{ id: StrapiEntity.ID }>).map((entry) => entry.id),
              },
            },
          });
        }
      },
    });

    if (strapi.features.future.isEnabled('contentReleasesScheduling')) {
      getService('scheduling', { strapi }).syncFromDatabase();
    }
  }
};

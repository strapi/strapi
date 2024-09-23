/* eslint-disable @typescript-eslint/no-var-requires */
import type { Core, UID, Modules } from '@strapi/types';

import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID, ALLOWED_WEBHOOK_EVENTS } from './constants';
import { getService } from './utils';
import { deleteActionsOnDelete, updateActionsOnUpdate } from './middlewares/documents';

interface DeleteManyParams {
  contentType: UID.ContentType;
  locale: string | null;
  entryDocumentId?: Modules.Documents.ID;
}

const deleteReleasesActionsAndUpdateReleaseStatus = async (params: DeleteManyParams) => {
  const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
    where: {
      actions: params,
    },
  });

  await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
    where: params,
  });

  // We update the status of each release after delete the actions
  for (const release of releases) {
    getService('release', { strapi }).updateReleaseStatus(release.id);
  }
};

export const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  if (strapi.ee.features.isEnabled('cms-content-releases')) {
    const contentTypesWithDraftAndPublish = Object.keys(strapi.contentTypes).filter(
      (uid: any) => strapi.contentTypes[uid]?.options?.draftAndPublish
    );

    strapi.db.lifecycles.subscribe({
      models: contentTypesWithDraftAndPublish,

      /**
       * deleteMany is still used outside documents service, for example when deleting a locale
       */
      async afterDeleteMany(event) {
        try {
          const model = strapi.getModel(event.model.uid as UID.Schema);
          // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
          if (model.kind === 'collectionType' && model.options?.draftAndPublish) {
            const { where } = event.params;

            deleteReleasesActionsAndUpdateReleaseStatus({
              contentType: model.uid,
              locale: where.locale ?? null,
              ...(where.documentId && { entryDocumentId: where.documentId }),
            });
          }
        } catch (error) {
          // If an error happens we don't want to block the delete entry flow, but we log the error
          strapi.log.error('Error while deleting release actions after entry deleteMany', {
            error,
          });
        }
      },
    });

    // We register middleware to handle ReleaseActions when changes on documents are made
    strapi.documents.use(deleteActionsOnDelete);
    strapi.documents.use(updateActionsOnUpdate);

    getService('scheduling', { strapi })
      .syncFromDatabase()
      .catch((err: Error) => {
        strapi.log.error(
          'Error while syncing scheduled jobs from the database in the content-releases plugin. This could lead to errors in the releases scheduling.'
        );

        throw err;
      });

    Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
      strapi.get('webhookStore').addAllowedEvent(key, value);
    });
  }
};

/* eslint-disable @typescript-eslint/no-var-requires */
import type { Core, UID } from '@strapi/types';

import { ALLOWED_WEBHOOK_EVENTS } from './constants';
import { registerAuditEvents } from './audit-logs';
import { getService } from './utils';
import {
  createDeleteActionsOnDelete,
  createRevalidateActionsOnDraftChange,
} from './middlewares/documents';

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
        const deleteActionsOfDeletedEntries = async () => {
          const model = strapi.getModel(event.model.uid as UID.Schema);
          // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
          if (model.kind === 'collectionType' && model.options?.draftAndPublish) {
            const { where } = event.params;

            await getService('release-action', { strapi }).deleteEntryActions({
              contentType: model.uid,
              locale: where?.locale ?? null,
              ...(where?.documentId && { entryDocumentId: where.documentId }),
            });
          }
        };

        // Not awaited: the delete entry flow doesn't wait for its releases, and isn't blocked by
        // their failure, which is logged
        deleteActionsOfDeletedEntries().catch((error: unknown) => {
          strapi.log.error('Error while deleting release actions after entry deleteMany', {
            error,
          });
        });
      },
    });

    // We register middleware to handle ReleaseActions when changes on documents are made
    strapi.documents.use(createDeleteActionsOnDelete({ strapi }));
    strapi.documents.use(createRevalidateActionsOnDraftChange({ strapi }));

    getService('scheduling', { strapi })
      .syncFromDatabase()
      .catch((error: unknown) => {
        strapi.log.error(
          'Error while syncing scheduled jobs from the database in the content-releases plugin. This could lead to errors in the releases scheduling.',
          { error }
        );
      });

    Object.entries(ALLOWED_WEBHOOK_EVENTS).forEach(([key, value]) => {
      strapi.get('webhookStore').addAllowedEvent(key, value);
    });

    // Absent in CE, without the audit-logs license, or when disabled by config;
    // get() throws for services that were never added, so probe first.
    if (strapi.has('audit-logs-lifecycle')) {
      registerAuditEvents(strapi.get('audit-logs-lifecycle'));
    }
  }
};

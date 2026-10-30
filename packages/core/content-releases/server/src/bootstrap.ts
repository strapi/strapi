/* eslint-disable @typescript-eslint/no-var-requires */
import type { Core, UID } from '@strapi/types';

import { ALLOWED_WEBHOOK_EVENTS, OVERDUE_SWEEP_CRON_RULE } from './constants';
import { registerAuditEvents } from './audit-logs';
import { getService, runAfterCommit } from './utils';
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
      afterDeleteMany(event) {
        const model = strapi.getModel(event.model.uid as UID.Schema);
        // @ts-expect-error TODO: lifecycles types looks like are not 100% finished
        if (model.kind !== 'collectionType' || !model.options?.draftAndPublish) {
          return;
        }

        const { where } = event.params;

        // Not awaited: the delete entry flow doesn't wait for its releases, and isn't blocked by
        // their failure, which is logged
        runAfterCommit(
          () =>
            getService('release-action', { strapi }).deletePlannedActions({
              contentType: model.uid,
              locale: where?.locale ?? null,
              ...(where?.documentId && { entryDocumentId: where.documentId }),
            }),
          'Error while deleting release actions after entry deleteMany',
          { strapi }
        );
      },
    });

    // We register middleware to handle ReleaseActions when changes on documents are made
    strapi.documents.use(createDeleteActionsOnDelete({ strapi }));
    strapi.documents.use(createRevalidateActionsOnDraftChange({ strapi }));

    const schedulingService = getService('scheduling', { strapi });
    const freezeOverdueReleases = () =>
      schedulingService.freezeOverdueReleases().catch((error: unknown) => {
        strapi.log.error('Error while freezing overdue releases in the content-releases plugin', {
          error,
        });
      });

    // Overdue releases are frozen before the jobs are armed: a release that failed before the
    // upgrade must not be armed for a date it won't run on
    freezeOverdueReleases()
      .then(() => schedulingService.syncFromDatabase())
      .catch((error: unknown) => {
        strapi.log.error(
          'Error while syncing scheduled jobs from the database in the content-releases plugin. This could lead to errors in the releases scheduling.',
          { error }
        );
      });

    // Then every minute: a release whose scheduled run didn't happen leaves Pending
    strapi.cron.add({
      'content-releases::freezeOverdueReleases': {
        task: freezeOverdueReleases,
        options: OVERDUE_SWEEP_CRON_RULE,
      },
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

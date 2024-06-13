import { contentTypes as contentTypesUtils, async } from '@strapi/utils';
import type { Modules, Schema } from '@strapi/types';

import { getBatchToDiscard } from './database/5.0.0-discard-drafts';

type DiscardDraftParams = Modules.Documents.ServiceParams['discardDraft'];

interface Input {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
}

/**
 * Enable draft and publish for content types.
 *
 * Draft and publish disabled content types will have their entries published,
 * this migration clones those entries as drafts.
 *
 * TODO: Clone components, dynamic zones and relations
 */
const enableDraftAndPublish = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  // run the after content types migrations
  return strapi.db.transaction(async (trx) => {
    for (const uid in contentTypes) {
      if (!oldContentTypes[uid]) {
        continue;
      }

      const oldContentType = oldContentTypes[uid];
      const contentType = contentTypes[uid];

      const isLocalized = strapi
        .plugin('i18n')
        .service('content-types')
        .isLocalizedContentType(oldContentType);

      // if d&p was enabled set publishedAt to eq createdAt
      if (
        !contentTypesUtils.hasDraftAndPublish(oldContentType) &&
        contentTypesUtils.hasDraftAndPublish(contentType)
      ) {
        const discardDraft = async (entry: { documentId: string; locale: string }) => {
          const params: DiscardDraftParams = { documentId: entry.documentId };

          // Only add the locale param if the old content-type is localized
          if (isLocalized) {
            params.locale = entry.locale;
          }

          return (
            strapi
              .documents(uid as any)
              // Discard draft by referencing the documentId (and locale if the model is localized)
              .discardDraft(params)
          );
        };

        /**
         * Load a batch of entries (batched to prevent loading millions of rows at once ),
         * and discard them using the document service.
         */
        for await (const batch of getBatchToDiscard({ db: strapi.db, trx, uid, isLocalized })) {
          await async.map(batch, discardDraft, { concurrency: 10 });
        }
      }
    }
  });
};

const disableDraftAndPublish = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    // if d&p was disabled remove unpublish content before sync
    if (
      contentTypesUtils.hasDraftAndPublish(oldContentType) &&
      !contentTypesUtils.hasDraftAndPublish(contentType)
    ) {
      await strapi.db?.queryBuilder(uid).delete().where({ published_at: null }).execute();
    }
  }
};

export { enableDraftAndPublish as enable, disableDraftAndPublish as disable };

import { contentTypes as contentTypesUtils, async } from '@strapi/utils';
import type { Schema, UID } from '@strapi/types';

import { getBatchToDiscard } from './database/5.0.0-discard-drafts';

export interface Input {
  oldContentTypes: Record<UID.ContentType, Schema.ContentType>;
  contentTypes: Record<UID.ContentType, Schema.ContentType>;
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
    // eslint-disable-next-line guard-for-in
    for (const key in contentTypes) {
      const uid = key as UID.ContentType;

      if (!oldContentTypes[uid]) {
        continue;
      }

      const oldContentType = oldContentTypes[uid];
      const contentType = contentTypes[uid];

      // if d&p was enabled set publishedAt to eq createdAt
      if (
        !contentTypesUtils.hasDraftAndPublish(oldContentType) &&
        contentTypesUtils.hasDraftAndPublish(contentType)
      ) {
        const discardDraft = async (entry: { documentId: string; locale: string }) =>
          strapi
            .documents(uid as any)
            // Discard draft by referencing the documentId and locale
            .discardDraft({ documentId: entry.documentId, locale: entry.locale });

        /**
         * Load a batch of entries (batched to prevent loading millions of rows at once ),
         * and discard them using the document service.
         */
        for await (const batch of getBatchToDiscard({ db: strapi.db, trx, uid })) {
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

  // eslint-disable-next-line guard-for-in
  for (const key in contentTypes) {
    const uid = key as UID.ContentType;

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

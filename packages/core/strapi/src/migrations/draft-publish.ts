import { contentTypes as contentTypesUtils } from '@strapi/utils';
import { Schema } from '@strapi/types';

interface Input {
  oldContentTypes: Record<string, Schema.ContentType>;
  contentTypes: Record<string, Schema.ContentType>;
}

const enableDraftAndPublish = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }
  // run the after content types migrations

  for (const uid in contentTypes) {
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
      const qb = strapi.db?.queryBuilder(uid);
      await qb
        .update({ published_at: qb.ref('created_at') })
        .where({ published_at: null })
        .execute();
    }
  }
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

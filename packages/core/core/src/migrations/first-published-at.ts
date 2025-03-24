import { contentTypes as contentTypesUtils } from '@strapi/utils';

import { Input } from './draft-publish';

const enableFirstPublishedAt = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  return strapi.db.transaction(async (trx) => {
    for (const uid in contentTypes) {
      if (!oldContentTypes[uid]) {
        continue;
      }

      const oldContentType = oldContentTypes[uid];
      const contentType = contentTypes[uid];

      if (
        !contentTypesUtils.hasFirstPublishedAtField(oldContentType) &&
        contentTypesUtils.hasFirstPublishedAtField(contentType)
      ) {
        await strapi.db
          .queryBuilder(uid)
          .update({
            firstPublishedAt: strapi.db.connection.ref('published_at'),
          })
          .where({
            publishedAt: { $notNull: true },
          })
          .transacting(trx)
          .execute();
      }
    }
  });
};

export { enableFirstPublishedAt as enable };

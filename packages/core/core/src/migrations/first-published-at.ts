import { contentTypes as contentTypesUtils } from '@strapi/utils';
import _ from 'lodash';
import type { UID } from '@strapi/types';
import { Input } from './draft-publish';

interface ContentTypeData {
  id: number;
  documentId: string;
  publishedAt: Date;
  firstPublishedAt: Date;
  locale: string;
}

const enableFirstPublishedAt = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  return strapi.db.transaction(async (trx) => {
    // eslint-disable-next-line guard-for-in
    for (const key in contentTypes) {
      const uid = key as UID.ContentType;

      if (!oldContentTypes[uid]) {
        continue;
      }

      const contentType = contentTypes[uid];

      if (!contentTypesUtils.hasFirstPublishedAtField(contentType)) {
        continue;
      }

      if (!contentType.attributes?.firstPublishedAt) {
        continue;
      }

      const content: ContentTypeData[] = await strapi.db
        .queryBuilder(uid)
        .select('*')
        .transacting(trx)
        .execute();

      // Process content types in pairs: draft and published.
      // If only one exist, which means the value is not published yet and we can ignore it
      const groupedContent = _.groupBy(content, (item) => `${item.documentId}-${item.locale}`);

      for (const items of Object.values(groupedContent)) {
        // If there is only one item, which means nothing is published yet for this locale
        if (items.length <= 1) {
          continue;
        }

        // If firstPublishedAt is already present, do not do anything
        if (items[0].firstPublishedAt != null && items[1].firstPublishedAt != null) {
          continue;
        }

        const publishedContent = items.find((item) => item.publishedAt != null);
        if (!publishedContent) {
          continue;
        }

        await strapi.db
          .queryBuilder(uid)
          .update({
            firstPublishedAt: new Date(publishedContent.publishedAt),
          })
          .where({
            documentId: publishedContent.documentId,
            locale: publishedContent.locale,
          })
          .transacting(trx)
          .execute();
      }
    }
  });
};

export { enableFirstPublishedAt as enable };

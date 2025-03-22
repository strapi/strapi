import { contentTypes as contentTypesUtils, async } from '@strapi/utils';

import { Input } from './draft-publish';

const enableFirstPublishedAt = async ({ oldContentTypes, contentTypes }: Input) => {
  if (!oldContentTypes) {
    return;
  }

  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    if (oldContentType.modelName !== 'test-single-type-7') {
      continue;
    }

    if (
      !contentTypesUtils.hasFirstPublishedAtField(oldContentType) &&
      contentTypesUtils.hasFirstPublishedAtField(contentType)
    ) {
      const documentsWithPublishedAt: any = await strapi.db
        .queryBuilder(uid)
        .select('document_id')
        .where({ publishedAt: { $notNull: true } })
        .execute();

      if (!documentsWithPublishedAt.length) {
        return;
      }

      console.log('===============documentsWithPublishedAt===========');
      console.log(documentsWithPublishedAt);
      console.log('===============documentsWithPublishedAt===========');

      for (const doc of documentsWithPublishedAt) {
        const documentId = doc.documentId;

        console.log('============documentId===========');
        console.log(documentId);
        console.log('============documentId===========');

        const publishedEntry: any = await strapi.db
          .queryBuilder(uid)
          .select('published_at')
          .where({
            documentId: documentId,
            publishedAt: { $notNull: true },
          })
          .first()
          .execute();

        console.log('=========publishedEntry========');
        console.log(publishedEntry);
        console.log('=========publishedEntry========');

        if (publishedEntry && publishedEntry.publishedAt) {
          await strapi.db
            .queryBuilder(uid)
            .update({
              firstPublishedAt: new Date(publishedEntry.publishedAt),
            })
            .where({ documentId: documentId })
            .execute();
        }
      }
    }
  }
};

export { enableFirstPublishedAt as enable };

import type { UID, Data, Core } from '@strapi/types';

interface EntryRef {
  contentType: UID.ContentType;
  documentId?: Data.DocumentID;
  locale?: string;
}

export const getEntry = async (
  {
    contentType,
    documentId,
    locale,
    populate,
    status = 'draft',
  }: EntryRef & { status?: 'draft' | 'published'; populate: any },
  { strapi }: { strapi: Core.Strapi }
) => {
  if (documentId) {
    // Try to get an existing draft or published document
    const entry = await strapi
      .documents(contentType)
      .findOne({ documentId, locale, populate, status });

    // The document isn't published yet, but the action is to publish it, fetch the draft
    if (status === 'published' && !entry) {
      return strapi
        .documents(contentType)
        .findOne({ documentId, locale, populate, status: 'draft' });
    }

    return entry;
  }

  return strapi.documents(contentType).findFirst({ locale, populate, status });
};

export const getEntryStatus = async (
  contentType: UID.ContentType,
  entry: Data.ContentType,
  { strapi }: { strapi: Core.Strapi }
) => {
  if (entry.publishedAt) {
    return 'published';
  }

  const publishedEntry = await strapi.documents(contentType).findOne({
    documentId: entry.documentId,
    locale: entry.locale,
    status: 'published',
    fields: ['updatedAt'],
  });

  if (!publishedEntry) {
    return 'draft';
  }

  const entryUpdatedAt = new Date(entry.updatedAt).getTime();
  const publishedEntryUpdatedAt = new Date(publishedEntry.updatedAt).getTime();

  if (entryUpdatedAt > publishedEntryUpdatedAt) {
    return 'modified';
  }

  return 'published';
};

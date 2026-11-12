import type { Core } from '@strapi/types';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const articleUID = 'api::entry-date-article.entry-date-article';
const articleModel = {
  draftAndPublish: true,
  pluginOptions: {},
  singularName: 'entry-date-article',
  pluralName: 'entry-date-articles',
  displayName: 'Entry Date Article',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string' },
  },
};

/**
 * Pins the read in `getEntryStatus` (content-releases `server/src/utils/index.ts`): the published
 * version of a release action entry, fetched with `fields: ['updatedAt']`, carries `updatedAt` as an
 * ISO string, which the function passes to `new Date`.
 */
describe('Content Releases: entry status dates', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('the published entry read with fields [updatedAt] carries updatedAt as an ISO string', async () => {
    const draft = await strapi.documents(articleUID).create({ data: { title: 'Article' } });
    await strapi.documents(articleUID).publish({ documentId: draft.documentId });

    // Same read as getEntryStatus: the entry is the draft the release action points to
    const publishedEntry = await strapi.documents(articleUID).findOne({
      documentId: draft.documentId,
      locale: draft.locale,
      status: 'published',
      fields: ['updatedAt'],
    });

    expect(publishedEntry).not.toBeNull();
    expect(typeof publishedEntry?.updatedAt).toBe('string');
    expect(publishedEntry?.updatedAt).toMatch(ISO_DATE);
  });
});

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

const localizedArticleUID = 'api::entry-date-localized-article.entry-date-localized-article';
const localizedArticleModel = {
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  singularName: 'entry-date-localized-article',
  pluralName: 'entry-date-localized-articles',
  displayName: 'Entry Date Localized Article',
  kind: 'collectionType',
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
};

/**
 * Pins the entry reads of content-releases whose results it types by hand:
 * - `getEntryStatus` (`server/src/utils/index.ts`): the published version of a release action
 *   entry, fetched with `fields: ['updatedAt']`, carries `updatedAt` as an ISO string, which the
 *   function passes to `new Date`.
 * - `readDraftVersions` (`server/src/services/release-action.ts`): the draft version, read the same
 *   way by `documentId` or with `findFirst`, carries `updatedAt` as an ISO string.
 * - `filterExistingEntries` (`server/src/services/release-action.ts`): the entries read with
 *   `fields: ['documentId', 'locale']` carry `locale` as a string on a localized content type,
 *   and no `locale` on a content type that is not localized (its read does not select it).
 */
describe('Content Releases: entry status dates', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;

  beforeAll(async () => {
    await builder
      .addContentTypes([articleModel, localizedArticleModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'French', code: 'fr' }])
      .build();
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

  test.each([
    ['by documentId', true],
    ['with findFirst', false],
  ])(
    'the draft entry read %s with fields [updatedAt] carries updatedAt as an ISO string',
    async (_, byDocumentId) => {
      const created = await strapi.documents(articleUID).create({ data: { title: 'Draft' } });

      // Same read as readDraftVersions
      const params = {
        locale: created.locale ?? undefined,
        status: 'draft' as const,
        fields: ['updatedAt'],
      };
      const draft = byDocumentId
        ? await strapi.documents(articleUID).findOne({ ...params, documentId: created.documentId })
        : await strapi.documents(articleUID).findFirst(params);

      expect(draft).not.toBeNull();
      expect(typeof draft?.updatedAt).toBe('string');
      expect(draft?.updatedAt).toMatch(ISO_DATE);
    }
  );

  test('the entries of a localized content type read with fields [documentId, locale] carry locale as a string', async () => {
    const created = await strapi
      .documents(localizedArticleUID)
      .create({ data: { title: 'Article' }, locale: 'en' });
    await strapi.documents(localizedArticleUID).update({
      documentId: created.documentId,
      locale: 'fr',
      data: { title: 'Article FR' },
    });

    // Same read as filterExistingEntries for a localized content type
    const entries = await strapi.documents(localizedArticleUID).findMany({
      filters: { documentId: { $in: [created.documentId] } },
      fields: ['documentId', 'locale'],
      locale: '*',
    });

    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.locale).sort()).toEqual(['en', 'fr']);
    for (const entry of entries) {
      expect(entry.documentId).toBe(created.documentId);
      expect(typeof entry.locale).toBe('string');
    }
  });

  test('the entries of a content type that is not localized read with fields [documentId] carry no locale', async () => {
    const created = await strapi.documents(articleUID).create({ data: { title: 'Article' } });

    // Same read as filterExistingEntries for a content type that is not localized
    const entries = await strapi.documents(articleUID).findMany({
      filters: { documentId: { $in: [created.documentId] } },
      fields: ['documentId'],
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].documentId).toBe(created.documentId);
    expect(entries[0].locale).toBeUndefined();
  });
});

import fs from 'fs';
import path from 'path';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The `isUsed` filter of the admin files list, gated by the `unstableMediaLibraryAssetUsage`
 * future flag. An asset is used when any entry references it through a media field, directly
 * or inside a component or a dynamic zone, whatever the entry status or locale.
 */
const FUTURE_FLAG = 'features.future.unstableMediaLibraryAssetUsage';
const UID = 'api::usage-article.usage-article';
const COMPONENT_UID = 'default.usage-media';

const mediaComponent = {
  displayName: 'usage-media',
  attributes: {
    image: { type: 'media', multiple: false },
  },
};

const articleModel = {
  displayName: 'Usage article',
  singularName: 'usage-article',
  pluralName: 'usage-articles',
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    cover: { type: 'media', multiple: false, pluginOptions: { i18n: { localized: true } } },
    block: {
      type: 'component',
      component: COMPONENT_UID,
      pluginOptions: { i18n: { localized: true } },
    },
    sections: {
      type: 'dynamiczone',
      components: [COMPONENT_UID],
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

describe('Upload admin API - files usage filter', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  // file name -> file id
  const files: Record<string, number> = {};

  const upload = async (name: string, fixture: string) => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, `../utils/${fixture}`)),
        fileInfo: JSON.stringify({ name }),
      },
    });

    files[name] = res.body[0].id;
  };

  /**
   * Filters the way the Media Library list does: a folder scope followed by the list filters,
   * all in the top-level `$and`. The `id` clause keeps the files of other suites out.
   */
  const findFiles = (clauses: Record<string, unknown>[], qs: Record<string, unknown> = {}) =>
    rq({
      method: 'GET',
      url: '/upload/files',
      qs: {
        sort: 'id:asc',
        ...qs,
        filters: {
          $and: [
            { folder: { id: { $null: true } } },
            { id: { $in: Object.values(files) } },
            ...clauses,
          ],
        },
      },
    });

  const names = (res: any) => res.body.results.map(({ name }: { name: string }) => name).sort();

  beforeAll(async () => {
    await builder.addComponent(mediaComponent).addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    await upload('direct.jpg', 'rec.jpg');
    await upload('component.jpg', 'rec.jpg');
    await upload('dynamic-zone.jpg', 'rec.jpg');
    await upload('draft-only.jpg', 'rec.jpg');
    await upload('french-only.jpg', 'rec.jpg');
    await upload('unused.jpg', 'rec.jpg');
    await upload('unused.pdf', 'rec.pdf');

    const published = await strapi.documents(UID).create({
      locale: 'en',
      data: {
        title: 'Published',
        cover: files['direct.jpg'],
        block: { image: files['component.jpg'] },
        sections: [{ __component: COMPONENT_UID, image: files['dynamic-zone.jpg'] }],
      },
    });
    await strapi.documents(UID).publish({ documentId: published.documentId, locale: 'en' });

    await strapi.documents(UID).create({
      locale: 'en',
      data: { title: 'Draft', cover: files['draft-only.jpg'] },
    });

    await strapi.documents(UID).create({
      locale: 'fr',
      data: { title: 'Brouillon', cover: files['french-only.jpg'] },
    });
  });

  afterAll(async () => {
    strapi.config.set(FUTURE_FLAG, false);

    await rq({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { fileIds: Object.values(files) },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('with the future flag off', () => {
    beforeAll(() => {
      strapi.config.set(FUTURE_FLAG, false);
    });

    test('ignores isUsed like any unknown key', async () => {
      const res = await findFiles([{ isUsed: { $eq: true } }]);

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.total).toBe(7);
    });
  });

  describe('with the future flag on', () => {
    beforeAll(() => {
      strapi.config.set(FUTURE_FLAG, true);
    });

    test('returns only the used assets, wherever they are referenced from', async () => {
      const res = await findFiles([{ isUsed: { $eq: true } }]);

      expect(res.statusCode).toBe(200);
      expect(names(res)).toEqual([
        'component.jpg',
        'direct.jpg',
        'draft-only.jpg',
        'dynamic-zone.jpg',
        'french-only.jpg',
      ]);
    });

    test('returns only the unused assets', async () => {
      const res = await findFiles([{ isUsed: { $ne: true } }]);

      expect(res.statusCode).toBe(200);
      expect(names(res)).toEqual(['unused.jpg', 'unused.pdf']);
    });

    test('combines with the type filter', async () => {
      const res = await findFiles([{ isUsed: { $eq: false } }, { mime: { $contains: 'image' } }]);

      expect(res.statusCode).toBe(200);
      expect(names(res)).toEqual(['unused.jpg']);
    });

    test('paginates the filtered assets', async () => {
      const res = await findFiles([{ isUsed: { $eq: true } }], { page: 2, pageSize: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.pagination).toEqual({ page: 2, pageSize: 2, pageCount: 3, total: 5 });
    });

    test('returns every asset when isUsed is not given', async () => {
      const res = await findFiles([]);

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.total).toBe(7);
    });

    test('accepts isUsed as the only filter, as a global search sends it', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: { pageSize: 100, filters: { $and: [{ isUsed: { $eq: true } }] } },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results.map(({ id }: { id: number }) => id)).toEqual(
        expect.arrayContaining(
          [
            'component.jpg',
            'direct.jpg',
            'draft-only.jpg',
            'dynamic-zone.jpg',
            'french-only.jpg',
          ].map((name) => files[name])
        )
      );
    });

    test('rejects an unsupported operator', async () => {
      const res = await findFiles([{ isUsed: { $in: [true] } }]);

      expect(res.statusCode).toBe(400);
    });

    test('rejects isUsed outside of the top-level $and', async () => {
      const res = await findFiles([{ $or: [{ isUsed: { $eq: true } }, { name: 'unused.jpg' }] }]);

      expect(res.statusCode).toBe(400);
    });
  });
});

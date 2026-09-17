'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const ARTICLE_UID = 'api::article.article';
const CM_URL = `/content-manager/collection-types/${ARTICLE_UID}`;
const CHANNEL_HEADER = 'X-Strapi-Channel';
const OVERRIDE_UID = 'plugin::channels.override';
const CHANNEL_UID = 'plugin::channels.channel';

const articleModel = {
  draftAndPublish: true,
  pluginOptions: { channels: { enabled: true } },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { channels: { overridable: true } },
    },
    body: {
      type: 'text',
      pluginOptions: { channels: { overridable: true } },
    },
    reference: {
      type: 'string',
    },
    promo: {
      type: 'string',
      pluginOptions: { channels: { overridable: true, visibleIn: ['desktop'] } },
    },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const LANDING_UID = 'api::landing.landing';
const LANDING_CM_URL = `/content-manager/collection-types/${LANDING_UID}`;

const landingModel = {
  draftAndPublish: true,
  pluginOptions: { channels: { enabled: true, availableIn: ['mobile'] } },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { channels: { overridable: true } },
    },
  },
  displayName: 'Landing',
  singularName: 'landing',
  pluralName: 'landings',
  description: '',
  collectionName: '',
};

describe('Channels — per-channel overrides and lifecycle', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const data = {
    mobile: null,
    desktop: null,
    article: null,
    clone: null,
  };

  const onChannel = (slug) => ({ [CHANNEL_HEADER]: slug });

  const cleanup = async () => {
    await strapi.db.query(ARTICLE_UID).deleteMany();
    await strapi.db.query(LANDING_UID).deleteMany();
    await strapi.db.query(OVERRIDE_UID).deleteMany();
    // Keep the bootstrap-seeded "default" channel; restore its flag.
    await strapi.db.query(CHANNEL_UID).deleteMany({ where: { slug: { $ne: 'default' } } });
    await strapi.db
      .query(CHANNEL_UID)
      .updateMany({ where: { slug: 'default' }, data: { isDefault: true } });
  };

  const overrideRows = (documentId = data.article.documentId) =>
    strapi.db.query(OVERRIDE_UID).findMany({
      where: { contentType: ARTICLE_UID, entryDocumentId: documentId },
      populate: { channel: { select: ['slug'] } },
    });

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, landingModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Channel lifecycle', () => {
    test('Rejects an unknown channel header', async () => {
      const res = await rq({ url: CM_URL, method: 'GET', headers: onChannel('does-not-exist') });

      expect(res.statusCode).toBe(400);
    });

    test('Creates channels', async () => {
      const mobile = await rq({ url: '/channels', method: 'POST', body: { name: 'Mobile' } });
      expect(mobile.statusCode).toBe(200);
      expect(mobile.body).toMatchObject({ slug: 'mobile', archived: false });
      data.mobile = mobile.body;

      const desktop = await rq({ url: '/channels', method: 'POST', body: { name: 'Desktop' } });
      expect(desktop.statusCode).toBe(200);
      data.desktop = desktop.body;

      const mine = await rq({ url: '/channels/mine', method: 'GET' });
      expect(mine.body.map((channel) => channel.slug).sort()).toEqual([
        'default',
        'desktop',
        'mobile',
      ]);
      expect(mine.body.find((channel) => channel.slug === 'default')).toMatchObject({
        isDefault: true,
      });
    });

    test('The default slug is taken by the seeded base channel', async () => {
      const res = await rq({ url: '/channels', method: 'POST', body: { name: 'default' } });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Overrides', () => {
    test('A base document is visible from a channel, hidden fields stripped', async () => {
      const created = await rq({
        url: CM_URL,
        method: 'POST',
        body: { title: 'Sneaker X', body: 'Long copy', reference: 'SKU-1', promo: 'Promo!' },
      });
      expect(created.statusCode).toBe(201);
      data.article = created.body.data ?? created.body;

      const fromMobile = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect(fromMobile.statusCode).toBe(200);
      const doc = fromMobile.body.data ?? fromMobile.body;
      expect(doc.title).toBe('Sneaker X');
      // `promo` is only visible on desktop.
      expect(doc.promo).toBeUndefined();

      const fromDesktop = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'GET',
        headers: onChannel('desktop'),
      });
      expect((fromDesktop.body.data ?? fromDesktop.body).promo).toBe('Promo!');
    });

    test('Editing on a channel records an override and leaves the row untouched', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: { title: 'Sneaker X — mobile' },
        headers: onChannel('mobile'),
      });
      expect(res.statusCode).toBe(200);
      expect((res.body.data ?? res.body).title).toBe('Sneaker X — mobile');

      const row = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.article.documentId, publishedAt: null },
      });
      expect(row.title).toBe('Sneaker X');

      const rows = await overrideRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        status: 'draft',
        entryLocale: '',
        overrides: { title: 'Sneaker X — mobile' },
      });
      expect(rows[0].channel.slug).toBe('mobile');
    });

    test('Each channel sees its own view', async () => {
      const fromMobile = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect((fromMobile.body.data ?? fromMobile.body).title).toBe('Sneaker X — mobile');

      const fromDesktop = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'GET',
        headers: onChannel('desktop'),
      });
      expect((fromDesktop.body.data ?? fromDesktop.body).title).toBe('Sneaker X');

      const base = await rq({ url: `${CM_URL}/${data.article.documentId}`, method: 'GET' });
      expect((base.body.data ?? base.body).title).toBe('Sneaker X');

      const list = await rq({ url: CM_URL, method: 'GET', headers: onChannel('mobile') });
      expect(list.body.results[0].title).toBe('Sneaker X — mobile');
    });

    test('The content API serves the channel view with the header', async () => {
      const fromMobile = await rq({
        url: `/api/articles?status=draft`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect(fromMobile.statusCode).toBe(200);
      expect(fromMobile.body.data.map((doc) => doc.title)).toEqual(['Sneaker X — mobile']);
      expect(fromMobile.body.data[0].promo).toBeUndefined();

      const base = await rq({ url: `/api/articles?status=draft`, method: 'GET' });
      expect(base.body.data.map((doc) => doc.title)).toEqual(['Sneaker X']);
      expect(base.body.data[0].promo).toBe('Promo!');
    });

    test('Changing a non-overridable attribute on a channel is refused', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: { reference: 'SKU-2' },
        headers: onChannel('mobile'),
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.stringify(res.body)).toContain('reference');

      const row = await strapi.db.query(ARTICLE_UID).findOne({
        where: { documentId: data.article.documentId, publishedAt: null },
      });
      expect(row.reference).toBe('SKU-1');
    });

    test('A full payload with unchanged non-overridable attributes passes', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: {
          title: 'Sneaker X — mobile v2',
          body: 'Long copy',
          reference: 'SKU-1',
        },
        headers: onChannel('mobile'),
      });
      expect(res.statusCode).toBe(200);
      expect((res.body.data ?? res.body).title).toBe('Sneaker X — mobile v2');
    });

    test('Changing an attribute hidden on the channel is refused', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: { promo: 'Mobile promo' },
        headers: onChannel('mobile'),
      });
      expect(res.statusCode).toBe(400);

      const onDesktop = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: { promo: 'Desktop promo' },
        headers: onChannel('desktop'),
      });
      expect(onDesktop.statusCode).toBe(200);
      expect((onDesktop.body.data ?? onDesktop.body).promo).toBe('Desktop promo');
    });
  });

  describe('Draft & publish', () => {
    test('Publishing snapshots every channel override', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}/actions/publish`,
        method: 'POST',
      });
      expect(res.statusCode).toBe(200);

      const published = (await overrideRows()).filter((row) => row.status === 'published');
      expect(published).toHaveLength(2);
      expect(Object.fromEntries(published.map((row) => [row.channel.slug, row.overrides]))).toEqual(
        {
          mobile: { title: 'Sneaker X — mobile v2' },
          desktop: { promo: 'Desktop promo' },
        }
      );
    });

    test('The published channel view is served, and later draft edits do not leak', async () => {
      const edit = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: { title: 'Sneaker X — mobile v3' },
        headers: onChannel('mobile'),
      });
      expect(edit.statusCode).toBe(200);

      const publishedView = await rq({
        url: `/api/articles`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect(publishedView.body.data.map((doc) => doc.title)).toEqual(['Sneaker X — mobile v2']);

      const draftView = await rq({
        url: `/api/articles?status=draft`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect(draftView.body.data.map((doc) => doc.title)).toEqual(['Sneaker X — mobile v3']);
    });

    test('Cloning copies the draft overrides', async () => {
      const res = await rq({
        url: `${CM_URL}/clone/${data.article.documentId}`,
        method: 'POST',
        body: { title: 'Sneaker X clone', reference: 'SKU-CLONE' },
      });
      expect(res.statusCode).toBe(200);
      data.clone = res.body.data ?? res.body;

      const rows = await overrideRows(data.clone.documentId);
      expect(rows.map((row) => [row.channel.slug, row.status]).sort()).toEqual([
        ['desktop', 'draft'],
        ['mobile', 'draft'],
      ]);
    });

    test('Discarding the draft restores the published overrides', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}/actions/discard`,
        method: 'POST',
      });
      expect(res.statusCode).toBe(200);

      const draftView = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect((draftView.body.data ?? draftView.body).title).toBe('Sneaker X — mobile v2');
    });

    test('Unpublishing drops the published overrides, drafts stay', async () => {
      const res = await rq({
        url: `${CM_URL}/${data.article.documentId}/actions/unpublish`,
        method: 'POST',
      });
      expect(res.statusCode).toBe(200);

      const rows = await overrideRows();
      expect(rows.filter((row) => row.status === 'published')).toHaveLength(0);
      expect(rows.filter((row) => row.status === 'draft').length).toBeGreaterThan(0);
    });
  });

  describe('Default channel', () => {
    const channelIdBySlug = async (slug) => {
      const mine = await rq({ url: '/channels/mine', method: 'GET' });
      return mine.body.find((channel) => channel.slug === slug).id;
    };

    test('Making a channel the default serves its content headerless', async () => {
      const res = await rq({
        url: `/channels/${data.mobile.id}`,
        method: 'PUT',
        body: { isDefault: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.isDefault).toBe(true);

      // Two documents at this point: the original (draft override back to v2
      // after the discard) and its clone (copied with the v3 override).
      const headerless = await rq({ url: `/api/articles?status=draft`, method: 'GET' });
      expect(headerless.body.data.map((doc) => doc.title).sort()).toEqual([
        'Sneaker X — mobile v2',
        'Sneaker X — mobile v3',
      ]);

      // Explicitly asking for the base channel still serves the base.
      const explicitBase = await rq({
        url: `/api/articles?status=draft`,
        method: 'GET',
        headers: onChannel('default'),
      });
      expect(explicitBase.body.data.map((doc) => doc.title).sort()).toEqual([
        'Sneaker X',
        'Sneaker X clone',
      ]);
    });

    test('The default channel can be neither deleted nor archived', async () => {
      const del = await rq({ url: `/channels/${data.mobile.id}`, method: 'DELETE' });
      expect(del.statusCode).toBe(400);

      const archive = await rq({
        url: `/channels/${data.mobile.id}`,
        method: 'PUT',
        body: { archived: true },
      });
      expect(archive.statusCode).toBe(400);
    });

    test('The flag moves back to the base channel', async () => {
      const defaultId = await channelIdBySlug('default');
      const res = await rq({
        url: `/channels/${defaultId}`,
        method: 'PUT',
        body: { isDefault: true },
      });
      expect(res.statusCode).toBe(200);

      const headerless = await rq({ url: `/api/articles?status=draft`, method: 'GET' });
      expect(headerless.body.data.map((doc) => doc.title).sort()).toEqual([
        'Sneaker X',
        'Sneaker X clone',
      ]);

      const mobile = await rq({ url: `/channels/${data.mobile.id}`, method: 'GET' });
      expect(mobile.body.isDefault).toBe(false);
    });

    test('The seeded base channel cannot be deleted', async () => {
      const defaultId = await channelIdBySlug('default');
      const res = await rq({ url: `/channels/${defaultId}`, method: 'DELETE' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Content-type channel availability', () => {
    test('Outside availableIn the entry serves base and refuses overrides', async () => {
      const created = await rq({
        url: LANDING_CM_URL,
        method: 'POST',
        body: { title: 'Landing base' },
      });
      expect(created.statusCode).toBe(201);
      const landing = created.body.data ?? created.body;

      // Overrides work on the bound channel…
      const onMobile = await rq({
        url: `${LANDING_CM_URL}/${landing.documentId}`,
        method: 'PUT',
        body: { title: 'Landing — mobile' },
        headers: onChannel('mobile'),
      });
      expect(onMobile.statusCode).toBe(200);
      expect((onMobile.body.data ?? onMobile.body).title).toBe('Landing — mobile');

      // …are refused outside it…
      const onDesktop = await rq({
        url: `${LANDING_CM_URL}/${landing.documentId}`,
        method: 'PUT',
        body: { title: 'Landing — desktop' },
        headers: onChannel('desktop'),
      });
      expect(onDesktop.statusCode).toBe(400);

      // …and reads outside it serve the plain base, no overlay.
      const readDesktop = await rq({
        url: `${LANDING_CM_URL}/${landing.documentId}`,
        method: 'GET',
        headers: onChannel('desktop'),
      });
      expect((readDesktop.body.data ?? readDesktop.body).title).toBe('Landing base');

      const readMobile = await rq({
        url: `${LANDING_CM_URL}/${landing.documentId}`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      expect((readMobile.body.data ?? readMobile.body).title).toBe('Landing — mobile');
    });
  });

  describe('Reset and cleanup', () => {
    test('Resetting one attribute reverts it and keeps the rest', async () => {
      // mobile currently overrides only `title`; add a second attribute first.
      await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'PUT',
        body: { body: 'Short copy' },
        headers: onChannel('mobile'),
      });

      const res = await rq({
        url: `/channels/overrides/${ARTICLE_UID}/${data.article.documentId}/reset`,
        method: 'POST',
        body: { channel: 'mobile', attributes: ['title'] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.attributes).toEqual(['body']);

      const view = await rq({
        url: `${CM_URL}/${data.article.documentId}`,
        method: 'GET',
        headers: onChannel('mobile'),
      });
      const doc = view.body.data ?? view.body;
      expect(doc.title).toBe('Sneaker X');
      expect(doc.body).toBe('Short copy');
    });

    test('Resetting the channel drops all its overrides for the document', async () => {
      const res = await rq({
        url: `/channels/overrides/${ARTICLE_UID}/${data.article.documentId}/reset`,
        method: 'POST',
        body: { channel: 'mobile' },
      });
      expect(res.statusCode).toBe(200);

      const rows = await overrideRows();
      expect(rows.filter((row) => row.channel.slug === 'mobile')).toHaveLength(0);
      expect(rows.filter((row) => row.channel.slug === 'desktop').length).toBeGreaterThan(0);
    });

    test('Deleting the document purges its overrides', async () => {
      const res = await rq({ url: `${CM_URL}/${data.article.documentId}`, method: 'DELETE' });
      expect(res.statusCode).toBe(200);

      expect(await overrideRows()).toHaveLength(0);
    });

    test('An archived channel is refused as a header', async () => {
      const archive = await rq({
        url: `/channels/${data.mobile.id}`,
        method: 'PUT',
        body: { archived: true },
      });
      expect(archive.statusCode).toBe(200);

      const res = await rq({ url: CM_URL, method: 'GET', headers: onChannel('mobile') });
      expect(res.statusCode).toBe(400);
    });
  });
});

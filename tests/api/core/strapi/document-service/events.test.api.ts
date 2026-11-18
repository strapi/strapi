import { omit } from 'lodash';

import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID } from './utils';

// Data to create a new article
const articleData = {
  title: 'Article',
  password: 'password',
  private: 'private',
  categories: ['Cat1'],
};

/**
 * Payload of a populated article in an eventHub event.
 * It should not include private or password fields.
 */
const eventPayload = {
  model: 'article',
  uid: ARTICLE_UID,
  entry: {
    title: 'Article',
    categories: [{ documentId: 'Cat1', name: 'Cat1-EN' }],
  },
};

describe('Document Service Events', () => {
  let testUtils;
  let strapi: Core.Strapi;

  /**
   * Resolves with the payload of the next `eventName` event that passes the filter.
   *
   * The events are emitted after the transaction commits and the assertions must run in the
   * test body: an assertion that throws inside a listener is caught by the event manager and
   * logged, so it would not fail the test.
   */
  const nextEvent = (eventName: string, filter: (payload: any) => boolean = () => true) =>
    new Promise<any>((resolve) => {
      strapi.eventHub.on(eventName, async (payload) => {
        if (filter(payload)) {
          resolve(payload);
        }
      });
    });

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterEach(async () => {
    strapi.eventHub.removeAllListeners();
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Creates', () => {
    it('Creating a document triggers entry.create', async () => {
      const created = nextEvent('entry.create');

      await strapi.documents(ARTICLE_UID).create({ data: articleData });

      expect(await created).toMatchObject(eventPayload);
    });
  });

  describe('Update', () => {
    it('Updating a document locale triggers entry.update', async () => {
      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const updated = nextEvent('entry.update');

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          title: 'Updated',
        },
      });

      expect(await updated).toMatchObject({
        ...eventPayload,
        entry: { ...eventPayload.entry, title: 'Updated' },
      });
    });

    it('Updating a new document locale triggers entry.create', async () => {
      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const updateEvents: unknown[] = [];
      strapi.eventHub.on('entry.update', async (payload) => {
        updateEvents.push(payload);
      });
      const created = nextEvent('entry.create', (payload) => payload.entry.locale === 'es');

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        locale: 'es',
        data: { title: 'Updated' },
      });

      expect(await created).toMatchObject({
        ...eventPayload,
        entry: { title: 'Updated' },
      });
      // entry.update should not be triggered when creating a new locale
      expect(updateEvents).toEqual([]);
    });

    it('Updating and publishing triggers both entry.update and entry.publish', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const updated = nextEvent('entry.update');
      const published = nextEvent('entry.publish');

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: { title: 'Updated' },
        status: 'published',
      });

      expect(await updated).toMatchObject({
        entry: { title: 'Updated', publishedAt: null },
      });
      expect(await published).toMatchObject({
        entry: { title: 'Updated', publishedAt: expect.any(String) },
      });
    });
  });

  describe('Clone', () => {
    it('Cloning a document triggers entry.create', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      // Ignore the original article
      const cloned = nextEvent('entry.create', (payload) => payload.entry.id !== article.id);

      await strapi
        .documents(ARTICLE_UID)
        .clone({ documentId: article.documentId, data: { title: 'Article copy' } });

      expect(await cloned).toMatchObject({
        ...eventPayload,
        entry: { title: 'Article copy' },
      });
    });
  });

  describe('Delete', () => {
    it('Deleting a document triggers entry.delete', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const deleted = nextEvent('entry.delete');

      await strapi.documents(ARTICLE_UID).delete({ documentId: article.documentId });

      // TODO: Populate relations on delete webhook
      expect(await deleted).toMatchObject({
        ...eventPayload,
        entry: omit(eventPayload.entry, ['categories']),
      });
    });
  });

  describe('Publish', () => {
    it('Publishing a document triggers entry.publish', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const published = nextEvent('entry.publish');

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      expect(await published).toMatchObject({
        ...eventPayload,
        entry: {
          publishedAt: expect.any(String),
          categories: [],
        },
      });
    });
  });

  describe('Unpublish', () => {
    it('Unpublishing a document triggers entry.unpublish', async () => {
      const article = await strapi
        .documents(ARTICLE_UID)
        .create({ data: articleData, status: 'published' });

      const unpublished = nextEvent('entry.unpublish');

      await strapi.documents(ARTICLE_UID).unpublish({ documentId: article.documentId });

      // TODO: Populate relations on unpublish webhook
      expect(await unpublished).toMatchObject({
        ...eventPayload,
        entry: omit(eventPayload.entry, ['categories']),
      });
    });
  });

  describe('Discard draft', () => {
    it('Discarding a draft triggers entry.draft-discard', async () => {
      const article = await strapi
        .documents(ARTICLE_UID)
        .create({ data: articleData, status: 'published' });

      const discarded = nextEvent('entry.draft-discard');

      await strapi.documents(ARTICLE_UID).discardDraft({ documentId: article.documentId });

      expect(await discarded).toMatchObject({
        ...eventPayload,
        entry: {
          publishedAt: null,
          categories: [],
        },
      });
    });
  });
});

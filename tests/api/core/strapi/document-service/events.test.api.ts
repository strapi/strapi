import { omit } from 'lodash/fp';

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
      expect.hasAssertions();

      strapi.eventHub.on('entry.create', async (payload) => {
        expect(payload).toMatchObject(eventPayload);
      });

      await strapi.documents(ARTICLE_UID).create({ data: articleData });
    });
  });

  describe('Update', () => {
    it('Updating a document locale triggers entry.update', async () => {
      expect.hasAssertions();

      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      strapi.eventHub.on('entry.update', async (payload) => {
        expect(payload).toMatchObject({
          ...eventPayload,
          entry: { ...eventPayload.entry, title: 'Updated' },
        });
      });

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          title: 'Updated',
        },
      });
    });

    it('Updating a new document locale triggers entry.create', async () => {
      expect.hasAssertions();

      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      strapi.eventHub.on('entry.update', async (payload) => {
        throw new Error('entry.update should not be triggered when creating a new locale');
      });

      strapi.eventHub.on('entry.create', async (payload) => {
        if (payload.entry.locale !== 'es') return;

        expect(payload).toMatchObject({
          ...eventPayload,
          entry: { title: 'Updated' },
        });
      });

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        locale: 'es',
        data: { title: 'Updated' },
      });
    });

    it('Updating and publishing triggers both entry.update and entry.publish', async () => {
      expect.assertions(2);

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      strapi.eventHub.on('entry.update', async (payload) => {
        expect(payload).toMatchObject({
          entry: { title: 'Updated', publishedAt: null },
        });
      });

      strapi.eventHub.on('entry.publish', async (payload) => {
        expect(payload).toMatchObject({
          entry: { title: 'Updated', publishedAt: expect.any(String) },
        });
      });

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: { title: 'Updated' },
        status: 'published',
      });
    });
  });

  describe('Clone', () => {
    it('Cloning a document triggers entry.create', async () => {
      expect.hasAssertions();

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      strapi.eventHub.on('entry.create', async (payload) => {
        // Ignore the original article
        if (payload.entry.id === article.id) return;

        expect(payload).toMatchObject({
          ...eventPayload,
          entry: { title: 'Article copy' },
        });
      });

      await strapi
        .documents(ARTICLE_UID)
        .clone({ documentId: article.documentId, data: { title: 'Article copy' } });
    });
  });

  describe('Delete', () => {
    it('Deleting a document triggers entry.delete', async () => {
      expect.hasAssertions();

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      strapi.eventHub.on('entry.delete', async (payload) => {
        // TODO: Populate relations on delete webhook
        expect(payload).toMatchObject({
          ...eventPayload,
          entry: omit(['categories'], eventPayload.entry),
        });
      });

      await strapi.documents(ARTICLE_UID).delete({ documentId: article.documentId });
    });
  });

  describe('Publish', () => {
    it('Publishing a document triggers entry.publish', async () => {
      expect.hasAssertions();

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      strapi.eventHub.on('entry.publish', async (payload) => {
        expect(payload).toMatchObject({
          ...eventPayload,
          entry: {
            publishedAt: expect.any(String),
            categories: [],
          },
        });
      });

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });
    });
  });

  describe('Unpublish', () => {
    it('Unpublishing a document triggers entry.unpublish', async () => {
      expect.hasAssertions();

      const article = await strapi
        .documents(ARTICLE_UID)
        .create({ data: articleData, status: 'published' });

      strapi.eventHub.on('entry.unpublish', async (payload) => {
        // TODO: Populate relations on unpublish webhook
        expect(payload).toMatchObject({
          ...eventPayload,
          entry: omit(['categories'], eventPayload.entry),
        });
      });

      await strapi.documents(ARTICLE_UID).unpublish({ documentId: article.documentId });
    });
  });

  describe('Discard draft', () => {
    it('Discarding a draft triggers entry.draft-discard', async () => {
      expect.hasAssertions();

      const article = await strapi
        .documents(ARTICLE_UID)
        .create({ data: articleData, status: 'published' });

      strapi.eventHub.on('entry.draft-discard', async (payload) => {
        expect(payload).toMatchObject({
          ...eventPayload,
          entry: {
            publishedAt: null,
            categories: [],
          },
        });
      });

      await strapi.documents(ARTICLE_UID).discardDraft({ documentId: article.documentId });
    });
  });
});

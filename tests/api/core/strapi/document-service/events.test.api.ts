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

/**
 * Commit hooks are not awaited, so the event can arrive after the document
 * call resolves. That gap shows up on Postgres and MySQL.
 */
const waitForEntryEvent = (
  app: Core.Strapi,
  eventName: string,
  accept: (payload: any) => boolean = () => true
) => {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, 10000);

    app.eventHub.on(eventName, (payload) => {
      if (!accept(payload)) {
        return;
      }

      clearTimeout(timer);
      resolve(payload);
    });
  });
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
      const event = waitForEntryEvent(strapi, 'entry.create');

      await strapi.documents(ARTICLE_UID).create({ data: articleData });

      await expect(event).resolves.toMatchObject(eventPayload);
    });
  });

  describe('Update', () => {
    it('Updating a document locale triggers entry.update', async () => {
      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const event = waitForEntryEvent(strapi, 'entry.update');

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: {
          title: 'Updated',
        },
      });

      await expect(event).resolves.toMatchObject({
        ...eventPayload,
        entry: { ...eventPayload.entry, title: 'Updated' },
      });
    });

    it('Updating a new document locale triggers entry.create', async () => {
      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const updates: unknown[] = [];
      strapi.eventHub.on('entry.update', (payload) => {
        updates.push(payload);
      });
      const event = waitForEntryEvent(
        strapi,
        'entry.create',
        (payload) => payload.entry.locale === 'es'
      );

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        locale: 'es',
        data: { title: 'Updated' },
      });

      await expect(event).resolves.toMatchObject({
        ...eventPayload,
        entry: { title: 'Updated' },
      });
      expect(updates).toEqual([]);
    });

    it('Updating and publishing triggers both entry.update and entry.publish', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const updated = waitForEntryEvent(strapi, 'entry.update');
      const published = waitForEntryEvent(strapi, 'entry.publish');

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: { title: 'Updated' },
        status: 'published',
      });

      await expect(updated).resolves.toMatchObject({
        entry: { title: 'Updated', publishedAt: null },
      });
      await expect(published).resolves.toMatchObject({
        entry: { title: 'Updated', publishedAt: expect.any(String) },
      });
    });
  });

  describe('Clone', () => {
    it('Cloning a document triggers entry.create', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const event = waitForEntryEvent(
        strapi,
        'entry.create',
        (payload) => payload.entry.id !== article.id
      );

      await strapi
        .documents(ARTICLE_UID)
        .clone({ documentId: article.documentId, data: { title: 'Article copy' } });

      await expect(event).resolves.toMatchObject({
        ...eventPayload,
        entry: { title: 'Article copy' },
      });
    });
  });

  describe('Delete', () => {
    it('Deleting a document triggers entry.delete', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const event = waitForEntryEvent(strapi, 'entry.delete');

      await strapi.documents(ARTICLE_UID).delete({ documentId: article.documentId });

      // TODO: Populate relations on delete webhook
      await expect(event).resolves.toMatchObject({
        ...eventPayload,
        entry: omit(eventPayload.entry, ['categories']),
      });
    });
  });

  describe('Publish', () => {
    it('Publishing a document triggers entry.publish', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });

      const event = waitForEntryEvent(strapi, 'entry.publish');

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      await expect(event).resolves.toMatchObject({
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

      const event = waitForEntryEvent(strapi, 'entry.unpublish');

      await strapi.documents(ARTICLE_UID).unpublish({ documentId: article.documentId });

      // TODO: Populate relations on unpublish webhook
      await expect(event).resolves.toMatchObject({
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

      const event = waitForEntryEvent(strapi, 'entry.draft-discard');

      await strapi.documents(ARTICLE_UID).discardDraft({ documentId: article.documentId });

      await expect(event).resolves.toMatchObject({
        ...eventPayload,
        entry: {
          publishedAt: null,
          categories: [],
        },
      });
    });
  });
});

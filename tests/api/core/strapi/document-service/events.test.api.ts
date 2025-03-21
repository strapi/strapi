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

// Add this helper at the top of the file
const waitForEvent = (eventHub: typeof strapi.eventHub, eventName: string) =>
  new Promise<any>((resolve) => eventHub.on(eventName, resolve));

const waitForEventWithFilter = (
  eventHub: typeof strapi.eventHub,
  eventName: string,
  filter: (payload: any) => boolean
) =>
  new Promise<any>((resolve) =>
    eventHub.on(eventName, (payload) => {
      if (filter(payload)) resolve(payload);
    })
  );

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

      const eventPromise = waitForEvent(strapi.eventHub, 'entry.create');
      await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const payload = await eventPromise;
      expect(payload).toMatchObject(eventPayload);
    });
  });

  describe('Update', () => {
    it('Updating a document locale triggers entry.update', async () => {
      expect.hasAssertions();

      // Create new article
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const eventPromise = waitForEvent(strapi.eventHub, 'entry.update');

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: { title: 'Updated' },
      });

      const payload = await eventPromise;
      expect(payload).toMatchObject({
        ...eventPayload,
        entry: { ...eventPayload.entry, title: 'Updated' },
      });
    });

    it('Updating a new document locale triggers entry.create', async () => {
      expect.assertions(2);
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const eventPromise = waitForEventWithFilter(
        strapi.eventHub,
        'entry.create',
        (payload) => payload.entry.locale === 'es'
      );

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        locale: 'es',
        data: { title: 'Updated' },
      });

      const payload = await eventPromise;
      expect(payload.entry.locale).toBe('es');
      expect(payload).toMatchObject({
        ...eventPayload,
        entry: { title: 'Updated' },
      });
    });

    it('Updating and publishing triggers both entry.update and entry.publish', async () => {
      expect.assertions(2);

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const [updatePromise, publishPromise] = [
        waitForEvent(strapi.eventHub, 'entry.update'),
        waitForEvent(strapi.eventHub, 'entry.publish'),
      ];

      await strapi.documents(ARTICLE_UID).update({
        documentId: article.documentId,
        data: { title: 'Updated' },
        status: 'published',
      });

      const [updatePayload, publishPayload] = await Promise.all([updatePromise, publishPromise]);
      expect(updatePayload).toMatchObject({
        entry: { title: 'Updated', publishedAt: null },
      });
      expect(publishPayload).toMatchObject({
        entry: { title: 'Updated', publishedAt: expect.any(String) },
      });
    });
  });

  describe('Clone', () => {
    it('Cloning a document triggers entry.create', async () => {
      expect.assertions(1);
      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const eventPromise = waitForEventWithFilter(
        strapi.eventHub,
        'entry.create',
        (payload) => payload.entry.id !== article.id
      );

      await strapi
        .documents(ARTICLE_UID)
        .clone({ documentId: article.documentId, data: { title: 'Article copy' } });

      const payload = await eventPromise;
      expect(payload).toMatchObject({
        ...eventPayload,
        entry: { title: 'Article copy' },
      });
    });
  });

  describe('Delete', () => {
    it('Deleting a document triggers entry.delete', async () => {
      expect.hasAssertions();

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const eventPromise = waitForEvent(strapi.eventHub, 'entry.delete');

      await strapi.documents(ARTICLE_UID).delete({ documentId: article.documentId });

      const payload = await eventPromise;
      expect(payload).toMatchObject({
        ...eventPayload,
        entry: omit(['categories'], eventPayload.entry),
      });
    });
  });

  describe('Publish', () => {
    it('Publishing a document triggers entry.publish', async () => {
      expect.hasAssertions();

      const article = await strapi.documents(ARTICLE_UID).create({ data: articleData });
      const eventPromise = waitForEvent(strapi.eventHub, 'entry.publish');

      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      const payload = await eventPromise;
      expect(payload).toMatchObject({
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
      expect.hasAssertions();

      const article = await strapi
        .documents(ARTICLE_UID)
        .create({ data: articleData, status: 'published' });
      const eventPromise = waitForEvent(strapi.eventHub, 'entry.unpublish');

      await strapi.documents(ARTICLE_UID).unpublish({ documentId: article.documentId });

      const payload = await eventPromise;
      expect(payload).toMatchObject({
        ...eventPayload,
        entry: omit(['categories'], eventPayload.entry),
      });
    });
  });

  describe('Discard draft', () => {
    it('Discarding a draft triggers entry.draft-discard', async () => {
      expect.hasAssertions();

      const article = await strapi
        .documents(ARTICLE_UID)
        .create({ data: articleData, status: 'published' });
      const eventPromise = waitForEvent(strapi.eventHub, 'entry.draft-discard');

      await strapi.documents(ARTICLE_UID).discardDraft({ documentId: article.documentId });

      const payload = await eventPromise;
      expect(payload).toMatchObject({
        ...eventPayload,
        entry: {
          publishedAt: null,
          categories: [],
        },
      });
    });
  });
});

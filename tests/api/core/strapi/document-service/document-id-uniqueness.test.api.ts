import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';

const ARTICLE_UID = 'api::article.article';
describe('Document Service - Document ID Uniqueness', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  it('prevents creating a document with a duplicate documentId', async () => {
    const api = strapi.documents(ARTICLE_UID);

    const documentId = 'test-duplicate-id';

    await api.create({ data: { documentId, title: 'test-1' } });

    await expect(api.create({ data: { documentId, title: 'test-2' } })).rejects.toThrow(
      new errors.ApplicationError(
        `A draft entry with documentId "${documentId}" and locale "en" already exists for UID "${ARTICLE_UID}". This combination must be unique.`
      )
    );
  });

  it('prevents creating a document with a duplicate documentId and same locale', async () => {
    const api = strapi.documents(ARTICLE_UID);
    const documentId = 'test-fully-duplicate';
    const locale = 'en';

    await api.create({ data: { documentId, title: 'test-1' }, locale });

    await expect(api.create({ data: { documentId, title: 'test-2' }, locale })).rejects.toThrow(
      new errors.ApplicationError(
        `A draft entry with documentId "${documentId}" and locale "${locale}" already exists for UID "${ARTICLE_UID}". This combination must be unique.`
      )
    );
  });

  it('allows creating documents with the same documentId but different locales ', async () => {
    const api = strapi.documents(ARTICLE_UID);
    const documentId = 'test-diff-locale';

    const docEN = await api.create({
      data: { documentId, title: 'English version' },
      locale: 'en',
    });
    expect(docEN.locale).toBe('en');

    const docFR = await api.create({ data: { documentId, title: 'French version' }, locale: 'fr' });
    expect(docFR.locale).toBe('fr');
  });

  it('allows creating a published document with the same documentId and locale as a draft', async () => {
    const api = strapi.documents(ARTICLE_UID);
    const documentId = 'test-published-draft-same-document-id';

    await api.create({
      data: { documentId, title: 'English version' },
      locale: 'en',
    });

    const publishedResult = await api.publish({ documentId });

    expect(publishedResult.entries).toHaveLength(1);
    expect(publishedResult.entries[0].title).toBe('English version');
    expect(publishedResult.entries[0].locale).toBe('en');
  });
});

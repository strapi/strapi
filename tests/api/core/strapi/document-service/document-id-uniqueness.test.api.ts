import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';

const ARTICLE_UID = 'api::article.article';
describe('Document Service - Document ID Uniqueness', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeEach(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterEach(async () => {
    await destroyTestSetup(testUtils);
  });

  it('correctly prevents creating a document with a duplicate documentId', async () => {
    const api = strapi.documents(ARTICLE_UID);

    const documentId = 'test-duplicate-id';

    await api.create({ data: { documentId, title: 'test-1' } });

    await expect(api.create({ data: { documentId, title: 'test-2' } })).rejects.toThrow(
      new errors.ApplicationError(
        `An entry with documentId "${documentId}" and locale "en" already exists for UID "${ARTICLE_UID}". This combination must be unique.`
      )
    );

    const finalCount = await api.count({ filters: { documentId } });
    expect(finalCount).toBe(1);

    const finalDocuments = await api.findMany({ filters: { documentId } });
    expect(finalDocuments).toHaveLength(1);
    expect(finalDocuments[0].title).toBe('test-1');
  });

  it('correctly prevents creating a document with a duplicate documentId and same locale', async () => {
    const api = strapi.documents(ARTICLE_UID);
    const documentId = 'test-fully-duplicate';
    const locale = 'en';

    await api.create({ data: { documentId, title: 'test-1' }, locale });

    await expect(api.create({ data: { documentId, title: 'test-2' }, locale })).rejects.toThrow(
      new errors.ApplicationError(
        `An entry with documentId "${documentId}" and locale "${locale}" already exists for UID "${ARTICLE_UID}". This combination must be unique.`
      )
    );

    const finalCount = await api.count({ filters: { documentId, locale } });
    expect(finalCount).toBe(1);

    const finalDocuments = await api.findMany({ filters: { documentId, locale } });
    expect(finalDocuments).toHaveLength(1);
    expect(finalDocuments[0].title).toBe('test-1');
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

    const countEN = await api.count({ filters: { documentId, locale: 'en' } });
    expect(countEN).toBe(1);

    const countFR = await api.count({ filters: { documentId, locale: 'fr' } });
    expect(countFR).toBe(1);

    const allDocsWithId = await api.findMany({ filters: { documentId }, locale: '*' }); // Fetch all locales
    expect(allDocsWithId).toHaveLength(2);
    expect(
      allDocsWithId.find((doc) => doc.locale === 'en' && doc.title === 'English version')
    ).toBeDefined();
    expect(
      allDocsWithId.find((doc) => doc.locale === 'fr' && doc.title === 'French version')
    ).toBeDefined();
  });
});

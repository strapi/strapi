/**
 * A non-localized component is copied to the other locales of a document, and its relations are
 * resolved for each of them. A target with no entry in a locale must not empty the shared value.
 */
import type { Core, UID } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

const TAG_UID = 'api::tag.tag' as UID.ContentType;
const ARTICLE_UID = 'api::article.article' as UID.ContentType;

const localized = { pluginOptions: { i18n: { localized: true } } };
const notLocalized = { pluginOptions: { i18n: { localized: false } } };

const blockComponent = {
  displayName: 'block',
  category: 'shared',
  attributes: {
    mode: { type: 'string' },
    tag: { type: 'relation', relation: 'oneToOne', target: TAG_UID },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
  },
};

const tagModel = {
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  draftAndPublish: true,
  ...localized,
  attributes: {
    name: { type: 'string', ...localized },
  },
};

const articleModel = {
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  draftAndPublish: true,
  ...localized,
  attributes: {
    title: { type: 'string', ...localized },
    rating: { type: 'integer', ...notLocalized },
    blocks: { type: 'component', component: 'shared.block', repeatable: true, ...notLocalized },
    zone: { type: 'dynamiczone', components: ['shared.block'], ...notLocalized },
  },
};

describe('i18n - non-localized components holding relations', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;

  const createTag = async (name: string, locales: string[]) => {
    const tag = await strapi.documents(TAG_UID).create({
      locale: locales[0],
      data: { name },
    });

    for (const locale of locales.slice(1)) {
      await strapi.documents(TAG_UID).update({
        documentId: tag.documentId,
        locale,
        data: { name: `${name} ${locale}` },
      });
    }

    return tag;
  };

  const createArticle = async () => {
    const article = await strapi.documents(ARTICLE_UID).create({
      locale: 'en',
      data: { title: 'English' },
    });

    await strapi.documents(ARTICLE_UID).update({
      documentId: article.documentId,
      locale: 'fr',
      data: { title: 'French' },
    });

    return article;
  };

  const readArticle = (documentId: string, locale: string) =>
    strapi.documents(ARTICLE_UID).findOne({
      documentId,
      locale,
      populate: {
        blocks: { populate: ['tag', 'tags'] },
        zone: { on: { 'shared.block': { populate: ['tag', 'tags'] } } },
      },
    }) as Promise<Record<string, any>>;

  const updateEnglish = (documentId: string, data: Record<string, unknown>) =>
    strapi.documents(ARTICLE_UID).update({ documentId, locale: 'en', data });

  beforeAll(async () => {
    await builder
      .addContentType(tagModel)
      .addComponent(blockComponent)
      .addContentType(articleModel)
      .addFixtures('plugin::i18n.locale', [{ name: 'French', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });

    await strapi.destroy();
    await builder.cleanup();
  });

  it('keeps the component on every locale when its relation has no entry in one of them', async () => {
    const tag = await createTag('English only', ['en']);
    const article = await createArticle();

    await updateEnglish(article.documentId, {
      rating: 5,
      blocks: [{ mode: 'a', tag: tag.documentId }],
    });

    const french = await readArticle(article.documentId, 'fr');

    // Written without its relation, the row would spread back on the next French save
    expect(french.blocks).toEqual([]);
    // The other shared fields still sync
    expect(french.rating).toBe(5);

    await strapi.documents(ARTICLE_UID).update({
      documentId: article.documentId,
      locale: 'fr',
      data: { blocks: french.blocks },
    });

    const english = await readArticle(article.documentId, 'en');

    expect(english.blocks).toHaveLength(1);
    expect(english.blocks[0].tag.documentId).toBe(tag.documentId);
  });

  it('keeps the component when only some targets of a relation exist in the locale', async () => {
    const shared = await createTag('Both locales', ['en', 'fr']);
    const englishOnly = await createTag('English only too', ['en']);
    const article = await createArticle();

    await updateEnglish(article.documentId, {
      blocks: [{ mode: 'a', tags: [shared.documentId, englishOnly.documentId] }],
    });

    expect((await readArticle(article.documentId, 'fr')).blocks).toEqual([]);

    const english = await readArticle(article.documentId, 'en');

    expect(english.blocks[0].tags).toHaveLength(2);
  });

  it('keeps a dynamic zone when one of its components loses a relation', async () => {
    const shared = await createTag('Both locales, zone', ['en', 'fr']);
    const englishOnly = await createTag('English only, zone', ['en']);
    const article = await createArticle();

    await updateEnglish(article.documentId, {
      zone: [
        { __component: 'shared.block', tag: shared.documentId },
        { __component: 'shared.block', tag: englishOnly.documentId },
      ],
    });

    expect((await readArticle(article.documentId, 'fr')).zone).toEqual([]);
    expect((await readArticle(article.documentId, 'en')).zone).toHaveLength(2);
  });

  it('keeps the published component when its relation has no published entry in a locale', async () => {
    const tag = await createTag('English only, published', ['en']);
    const article = await createArticle();

    await strapi.documents(TAG_UID).publish({ documentId: tag.documentId, locale: 'en' });
    await updateEnglish(article.documentId, { blocks: [{ mode: 'a', tag: tag.documentId }] });
    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId, locale: '*' });

    const readPublished = (locale: string) =>
      strapi.documents(ARTICLE_UID).findOne({
        documentId: article.documentId,
        locale,
        status: 'published',
        populate: { blocks: { populate: ['tag'] } },
      }) as Promise<Record<string, any>>;

    expect((await readPublished('fr')).blocks).toEqual([]);
    expect((await readPublished('en')).blocks[0].tag.documentId).toBe(tag.documentId);
  });

  it('still syncs the component when its relations exist in the locale', async () => {
    const shared = await createTag('Both locales, synced', ['en', 'fr']);
    const article = await createArticle();

    await updateEnglish(article.documentId, {
      blocks: [{ mode: 'a', tag: shared.documentId }],
    });

    const french = await readArticle(article.documentId, 'fr');

    expect(french.blocks).toHaveLength(1);
    expect(french.blocks[0].mode).toBe('a');
    expect(french.blocks[0].tag).toMatchObject({ documentId: shared.documentId, locale: 'fr' });
  });
});

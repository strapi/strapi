import type { BuilderResources } from '../../../../utils/builder-helper';

/**
 * Lightweight article + i18n setup for document-service query/lifecycle tests
 * that only need ARTICLE_UID and the standard Article1/Article2 fixture corpus.
 *
 * Omits the extra content types, components, and relation fixtures from ./index.
 */
const articleSchema = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const locales = [
  { name: 'nl', code: 'nl' },
  { name: 'it', code: 'it' },
  { name: 'es', code: 'es' },
];

const articleFixtures = [
  {
    documentId: 'Article1',
    title: 'Article1-Draft-EN',
    publishedAt: null,
    locale: 'en',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    documentId: 'Article2',
    title: 'Article2-Draft-EN',
    publishedAt: null,
    locale: 'en',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    documentId: 'Article1',
    title: 'Article1-Draft-NL',
    publishedAt: null,
    locale: 'nl',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    documentId: 'Article1',
    title: 'Article1-Draft-IT',
    publishedAt: null,
    locale: 'it',
    createdBy: 1,
    updatedBy: 1,
  },
  {
    documentId: 'Article2',
    title: 'Article2-Published-EN',
    publishedAt: '2019-01-01T00:00:00.000Z',
    locale: 'en',
    createdBy: 1,
    updatedBy: 1,
  },
];

const createResources = (fixtures: typeof articleFixtures): BuilderResources => ({
  schemas: {
    'content-types': {
      'api::article.article': articleSchema,
    },
    components: {},
  },
  fixtures: {
    'content-types': {
      'api::article.article': fixtures,
    },
  },
  locales,
});

/** Article schema, locales, and the shared Article1/Article2 fixture corpus. */
export default createResources(articleFixtures);

/** Same schema and locales; no pre-seeded entries (tests create their own data). */
export const withoutFixtures = createResources([]);

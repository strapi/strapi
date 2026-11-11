/**
 * Filter shapes checked against `ObjectNotation<T>` for schemas that have only scalar attributes or
 * only nested attributes.
 *
 * Compiled on its own by `object-notation-attribute-keys.vitest.test.ts`, which asserts that it
 * type-checks without errors. Each `@ts-expect-error` fails the compilation if the filter is accepted.
 */
import type { Modules, UID } from '../../../../../../..';

declare const articles: Modules.Documents.ServiceInstance<'api::article.article'>;

type Filters<TSchemaUID extends UID.Schema> =
  Modules.Documents.Params.Filters.ObjectNotation<TSchemaUID>;

/**
 * A schema with both scalar and nested attributes
 */
export const article: Filters<'api::article.article'>[] = [
  { title: { $eq: 'a' }, seo: { metaTitle: { $contains: 'b' } } },
  {
    // @ts-expect-error Unknown attribute
    titel: 'a',
  },
];

/**
 * A schema with scalar attributes only
 */
export const seo: Filters<'shared.seo'>[] = [
  { id: 1, metaTitle: 'a', metaDescription: { $null: true } },
  { $or: [{ metaTitle: { $startsWith: 'a' } }, { $not: { metaDescription: 'b' } }] },
  {
    // @ts-expect-error Unknown attribute
    metaTitel: 'a',
  },
  {
    $and: [
      {
        // @ts-expect-error Unknown attribute in a nested group
        metaTitel: { $eq: 'a' },
      },
    ],
  },
  {
    // @ts-expect-error Unknown operator
    metaTitle: { $unknown: 'a' },
  },
  {
    // @ts-expect-error Components have no documentId
    documentId: 'a',
  },
];

/**
 * A schema with nested attributes only
 */
export const link: Filters<'shared.link'>[] = [
  {
    // @ts-expect-error Components have no documentId
    documentId: { $eq: 'a' },
  },
  { id: { $in: [1, 2] }, article: { title: { $eq: 'a' } } },
  {
    // @ts-expect-error Unknown attribute
    artcle: { title: 'a' },
  },
];

/**
 * Component filters reached from a content type
 */
export const nested: Filters<'api::article.article'>[] = [
  { seo: { metaTitle: 'a' }, links: { article: { seo: { metaDescription: 'b' } } } },
  {
    seo: {
      // @ts-expect-error Unknown attribute in a component filter
      metaTitel: { $eq: 'a' },
    },
  },
  {
    links: {
      // @ts-expect-error Unknown attribute in a repeatable component filter
      artcle: { title: 'a' },
    },
  },
];

/**
 * Filters passed straight to a Document Service method, without an annotation
 *
 * The method infers its params, so TypeScript does not check excess properties. A filter object
 * whose keys are all unknown is still rejected, because it has no property in common with the filter
 * type.
 */
articles.findMany({ filters: { title: 'a', documentId: 'b' } });
articles.findMany({ filters: { seo: { metaTitle: 'a' }, links: { article: { title: 'b' } } } });

articles.findMany({
  // @ts-expect-error Unknown attribute
  filters: { titel: 'a' },
});

articles.findMany({
  filters: {
    // @ts-expect-error Unknown attribute in a component filter
    seo: { metaTitel: 'a' },
  },
});

articles.findMany({
  filters: {
    // @ts-expect-error Unknown attribute in a repeatable component filter
    links: { artcle: { title: 'a' } },
  },
});

/**
 * One operator object on a nested attribute of a component. The database applies it to the target's
 * id.
 */
export const shortcut: Filters<'shared.link'>[] = [
  {
    // @ts-expect-error A bare id is not accepted, use `{ id: 5 }` or `{ $eq: 5 }`
    article: 5,
  },
  { article: { $in: [1, 2] } },
  { article: { $eq: 1 } },
  { article: { $null: true } },
  { article: { $notNull: true } },
  { article: { title: 'a' } },
  { article: { id: { $in: [1, 2] } } },
  // @ts-expect-error An operator next to attribute keys throws at runtime
  { article: { $in: [1], title: 'a' } },
  {
    // @ts-expect-error Two operators throw at runtime
    article: { $gt: 1, $lt: 5 },
  },
  {
    article: {
      // @ts-expect-error Unknown attribute in a relation filter
      titel: 'a',
    },
  },
  {
    // @ts-expect-error Wrong value type for $null
    article: { $null: 'a' },
  },
  { article: { $between: [1, 5] } },
  { article: { $notIn: [1] } },
  {
    // @ts-expect-error A text operator on an id
    article: { $contains: 1 },
  },
  {
    // @ts-expect-error A text operator on an id
    article: { $startsWithi: 'a' },
  },
];

export const nestedComponentShortcut: Filters<'shared.card'>[] = [
  {
    // @ts-expect-error A bare id is not accepted
    seo: 1,
  },
  { seo: { $null: true } },
  { seo: { metaTitle: 'a' } },
  {
    seo: {
      // @ts-expect-error Unknown attribute in a component filter
      metaTitel: 'a',
    },
  },
];

export const shortcutFromContentType: Filters<'api::article.article'>[] = [
  { links: { article: { $eq: 5 } } },
  { links: { article: { $in: [1, 2] } } },
  {
    // @ts-expect-error The shortcut is not accepted on content type attributes
    seo: { $null: true },
  },
];

articles.findMany({ filters: { links: { article: { $null: true } } } });

articles.findMany({
  filters: {
    links: {
      // @ts-expect-error Two operators throw at runtime
      article: { $gt: 1, $lt: 5 },
    },
  },
});

/**
 * Reading back the filter of a nested attribute inside a component keeps the target's filter type
 */
export const componentReadBack = (filters: Filters<'shared.link'>) => {
  const article: Filters<'api::article.article'> | undefined = filters.article;
  const title = filters.article?.title;
  const nestedSeo: Filters<'shared.seo'> | undefined = filters.article?.seo;

  return { article, title, nestedSeo };
};

export const componentReadBackFromContentType = (filters: Filters<'api::article.article'>) => {
  const article: Filters<'api::article.article'> | undefined = filters.links?.article;
  const card: Filters<'shared.seo'> | undefined = filters.links?.article?.$not?.seo;

  return { article, card };
};

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

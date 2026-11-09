/**
 * Filter shapes checked against `ObjectNotation<T>` for schemas that have only scalar attributes or
 * only nested attributes.
 *
 * Compiled on its own by `object-notation-attribute-keys.vitest.test.ts`, which asserts that it
 * type-checks without errors. Each `@ts-expect-error` fails the compilation if the filter is accepted.
 */
import type { Modules, UID } from '../../../../../../..';

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
];

/**
 * A schema with nested attributes only
 */
export const link: Filters<'shared.link'>[] = [
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

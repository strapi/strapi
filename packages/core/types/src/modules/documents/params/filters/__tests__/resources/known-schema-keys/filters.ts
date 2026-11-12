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
  {
    // @ts-expect-error An id is a number or a string
    id: true,
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
];

/**
 * One operator object on a relation, media or component attribute of a content type. The database
 * applies it to the target's id, as inside a component.
 */
export const contentTypeShortcut: Filters<'api::article.article'>[] = [
  { author: { $eq: 1 } },
  { author: { $ne: 1 } },
  { author: { $in: [1, 2] } },
  { author: { $notIn: ['a'] } },
  { author: { $between: [1, 5] } },
  { author: { $null: true } },
  { author: { $notNull: true } },
  { coauthors: { $in: [1, 2] } },
  { coauthors: { $null: true } },
  { cover: { $eq: 1 } },
  { cover: { $null: true } },
  { cover: { $notNull: false } },
  { seo: { $null: true } },
  { seo: { $notNull: true } },
  { links: { $null: true } },
  { links: { article: { author: { $in: [1] } } } },
  { $or: [{ author: { $null: true } }, { cover: { $null: true } }] },
  { author: { name: 'a' } },
  { author: { id: { $in: [1, 2] } } },
  { author: { documentId: 'a' } },
  {
    // @ts-expect-error A bare id is not accepted, use `{ id: 5 }` or `{ $eq: 5 }`
    author: 5,
  },
  {
    // @ts-expect-error A bare id is not accepted on media
    cover: 1,
  },
  {
    // @ts-expect-error A bare id is not accepted on components
    seo: 1,
  },
  // @ts-expect-error An operator next to attribute keys throws at runtime
  { author: { $in: [1], name: 'a' } },
  // @ts-expect-error An operator next to an identifier key throws at runtime
  { author: { $null: true, documentId: 'a' } },
  {
    // @ts-expect-error Two operators throw at runtime
    author: { $gt: 1, $lt: 5 },
  },
  {
    // @ts-expect-error Wrong value type for $null
    cover: { $null: 'a' },
  },
  {
    // @ts-expect-error Wrong value type for $in
    author: { $in: 1 },
  },
  {
    // @ts-expect-error Unknown operator
    author: { $unknown: 1 },
  },
  {
    author: {
      // @ts-expect-error Unknown attribute in a relation filter
      nme: 'a',
    },
  },
  {
    author: {
      // @ts-expect-error Password attributes are not filterable
      secret: 'a',
    },
  },
];

articles.findMany({ filters: { author: { $null: true }, cover: { $notNull: true } } });
articles.findMany({ filters: { seo: { $null: true } } });

articles.findMany({
  filters: {
    // @ts-expect-error A bare id is not accepted
    author: 5,
  },
});

articles.findMany({
  filters: {
    // @ts-expect-error Two operators throw at runtime
    author: { $null: true, $notNull: true },
  },
});

// Known gap, as on develop: `{ author: { $not: { name: 'a' } } }` type-checks, because `$not` is part
// of the author's filter type, but the database throws. It reads a lone `$not` on a relation as an
// operator on the id (`id: { $not: { name: 'a' } }`), and `name` is not an operator.

// Not rejected in a direct call: `{ author: { $eq: 1, name: 'a' } }`. The method infers its params,
// so TypeScript does not check excess properties, and the object matches the author's filter type.

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

export const nestedComponentReadBack = (filters: Filters<'shared.card'>) => {
  const seo: Filters<'shared.seo'> | undefined = filters.seo;

  return { seo };
};

export const mixedComponentReadBack = (filters: Filters<'shared.mixed'>) => {
  const article: Filters<'api::article.article'> | undefined = filters.article;

  return { article };
};

export const mixedComponent: Filters<'shared.mixed'>[] = [
  { label: 'a', article: { title: 'b' } },
  { article: { $in: [1, 2] } },
  {
    // @ts-expect-error Unknown attribute
    lable: 'a',
  },
  // @ts-expect-error An operator next to attribute keys throws at runtime
  { article: { $in: [1], title: 'a' } },
];

export const componentReadBackFromContentType = (filters: Filters<'api::article.article'>) => {
  const article: Filters<'api::article.article'> | undefined = filters.links?.article;
  const card: Filters<'shared.seo'> | undefined = filters.links?.article?.$not?.seo;

  return { article, card };
};

/**
 * Reading back the filter of a relation, media or component attribute of a content type keeps the
 * target's filter type
 */
export const contentTypeReadBack = (filters: Filters<'api::article.article'>) => {
  const author: Filters<'api::author.author'> | undefined = filters.author;
  const authorName = filters.author?.name;
  const coauthors: Filters<'api::author.author'> | undefined = filters.$or?.[0]?.coauthors;
  const cover: Filters<'plugin::upload.file'> | undefined = filters.cover;
  const seo: Filters<'shared.seo'> | undefined = filters.seo;
  const notAuthor: Filters<'api::author.author'> | undefined = filters.author?.$not;

  return { author, authorName, coauthors, cover, seo, notAuthor };
};

/**
 * Reading back the filter of a relation whose target is not in the registries keeps the target's
 * loose filter type, with any key
 */
export const unknownTargetReadBack = (filters: Filters<'api::article.article'>) => {
  const legacy: Filters<'api::legacy.legacy'> | undefined = filters.legacy;
  const legacyName = filters.legacy?.name;
  const notLegacy = filters.$and?.[0]?.legacy?.$not?.anything;

  return { legacy, legacyName, notLegacy };
};

export const unknownTarget: Filters<'api::article.article'>[] = [
  { legacy: { name: 'a', anything: { $in: [1] } } },
  { legacy: { $null: true } },
];

/**
 * A content-type relation filter read back can be spread into a new filter with another key (the
 * component case is in the `component-spread` fixture)
 */
export const spreadRelationFilter = (filters: Filters<'api::article.article'>) => {
  const next: Filters<'api::article.article'> = { author: { ...filters.author, name: 'x' } };

  return next;
};

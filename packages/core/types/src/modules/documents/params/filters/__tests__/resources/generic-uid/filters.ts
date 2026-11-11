/**
 * Filter shapes checked against `ObjectNotation<T>` when `T` is a type parameter.
 *
 * Compiled on its own by `object-notation-generic-uid.vitest.test.ts`, which asserts that it
 * type-checks without errors, without running out of memory, and under an instantiation budget.
 */
import { expectTypeOf } from 'vitest';

import type { Modules, UID } from '../../../../../../..';

type Filters<TSchemaUID extends UID.Schema> =
  Modules.Documents.Params.Filters.ObjectNotation<TSchemaUID>;

type PostFilters = Filters<'api::post.post'>;

/**
 * A helper that is generic over the UID, as written in apps
 */
declare function findWithFilters<const TSchemaUID extends UID.ContentType>(args: {
  uid: TSchemaUID;
  filters?: Filters<TSchemaUID>;
}): void;

declare const anyContentTypeUID: UID.ContentType;

/**
 * Nested groups through a generic helper
 */
findWithFilters({
  uid: 'api::post.post',
  filters: {
    $or: [
      { $and: [{ $or: [{ slug: { $notNull: true } }] }] },
      { $not: { $and: [{ $or: [{ slug: { $contains: 'a' } }, { views: { $gt: 1 } }] }] } },
    ],
  },
});

findWithFilters({
  uid: 'api::post.post' as UID.ContentType,
  filters: {
    $or: [
      { $and: [{ $or: [{ slug: { $notNull: true } }] }] },
      { $not: { $and: [{ $or: [{ slug: { $contains: 'a' } }] }] } },
    ],
  },
});

/**
 * Nested relation filters through a generic helper
 */
findWithFilters({
  uid: 'api::post.post',
  filters: {
    $and: [
      { tags: { $or: [{ name: { $contains: 'x' } }, { $not: { id: { $eq: 1 } } }] } },
      {
        $or: [
          {
            translations: {
              $and: [{ slug: { $notNull: true } }, { tags: { name: { $eq: 'y' } } }],
            },
          },
        ],
      },
      { writer: { posts: { tags: { posts: { $not: { meta: { label: { $eq: 'z' } } } } } } } },
      { $or: [{ cover: { name: { $endsWith: '.png' } } }, { sections: { label: { $eq: 'a' } } }] },
    ],
  },
});

findWithFilters({
  uid: anyContentTypeUID,
  filters: {
    $and: [
      { tags: { $or: [{ name: { $contains: 'x' } }, { $not: { id: { $eq: 1 } } }] } },
      {
        $or: [
          {
            translations: {
              $and: [{ slug: { $notNull: true } }, { tags: { name: { $eq: 'y' } } }],
            },
          },
        ],
      },
    ],
  },
});

/**
 * A function body that is generic over the UID reads sub-filters back with their full type
 */
export const readBack = <TSchemaUID extends UID.ContentType>(filters: Filters<TSchemaUID>) => {
  const and: Filters<TSchemaUID>[] | undefined = filters.$and;
  const or: Filters<TSchemaUID>[] | undefined = filters.$or;
  const not: Filters<TSchemaUID> | undefined = filters.$not;
  const nested: Filters<TSchemaUID> | undefined = filters.$or?.[0]?.$and?.[0]?.$not;

  // `any` is assignable to the annotations above, so check the expressions separately.
  // `not.toBeAny()` cannot resolve on `ObjectNotation<TSchemaUID>` itself while `TSchemaUID` is a
  // type parameter, so the logical operators are checked through one of their group operators.
  expectTypeOf(filters.$and).not.toBeAny();
  expectTypeOf(filters.$or).not.toBeAny();
  expectTypeOf(filters.$not?.$and).not.toBeAny();
  expectTypeOf(filters.$or?.[0]?.$and?.[0]?.$not?.$or).not.toBeAny();

  return { and, or, not, nested };
};

/**
 * Filters with a known UID keep their checks
 */
export const knownUID: PostFilters[] = [
  { slug: { $notNull: true }, views: { $between: [1, 10] } },
  { $or: [{ $and: [{ title: 'a' }, { $not: { views: { $lt: 5 } } }] }] },
  { tags: { name: { $in: ['a', 'b'] } }, writer: { posts: { slug: { $null: true } } } },
  { meta: { label: { $startsWith: 'x' } } },
  { sections: { label: { $in: ['a', 'b'] } }, cover: { url: { $notNull: true } } },
  {
    $and: [
      { cover: { $not: { name: { $eq: 'a.png' } } } },
      { sections: { $or: [{ label: 'a' }] } },
    ],
  },
  {
    // @ts-expect-error Unknown attribute
    unknown: { $eq: 1 },
  },
  {
    $or: [
      {
        $and: [
          {
            // @ts-expect-error Unknown attribute in a nested group
            unknown: { $eq: 1 },
          },
        ],
      },
    ],
  },
  {
    tags: {
      $not: {
        // @ts-expect-error Unknown attribute in a relation filter
        unknown: { $eq: 1 },
      },
    },
  },
  {
    // @ts-expect-error Unknown operator
    slug: { $unknown: 'a' },
  },
];

/**
 * Reading back filters with a known UID keeps the attributes' types
 */
export const knownUIDReadBack = (filters: PostFilters) => {
  const tagFilters: Filters<'api::tag.tag'> | undefined = filters.tags;
  const nestedTagName = filters.$and?.[0]?.tags?.$not?.name;
  const writerPosts: PostFilters | undefined = filters.writer?.posts;
  const coverFilters: Filters<'plugin::upload.file'> | undefined = filters.cover;
  const sectionFilters: Filters<'shared.meta'> | undefined = filters.sections;

  // `any` is assignable to the annotations above, so check the expressions separately
  expectTypeOf(filters.tags).not.toBeAny();
  expectTypeOf(nestedTagName).not.toBeAny();
  expectTypeOf(filters.writer?.posts).not.toBeAny();
  expectTypeOf(filters.cover).not.toBeAny();
  expectTypeOf(filters.cover?.name).not.toBeAny();
  expectTypeOf(filters.sections).not.toBeAny();
  expectTypeOf(filters.sections?.label).not.toBeAny();

  return { tagFilters, nestedTagName, writerPosts, coverFilters, sectionFilters };
};

/**
 * Code generic over a content type UID keeps the identifier keys
 */
export const byId = <TSchemaUID extends UID.ContentType>(filters: Filters<TSchemaUID>): boolean =>
  filters.id !== undefined;

export const byDocumentId = <TSchemaUID extends UID.ContentType>(documentId: string) =>
  ({ documentId }) as Modules.Documents.Params.Filters.Any<TSchemaUID>;

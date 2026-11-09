/**
 * Filter shapes checked against `ObjectNotation<T>` when the schema registries are not extended, as in
 * an app without generated types.
 *
 * Compiled on its own by `object-notation-attribute-keys.vitest.test.ts`, which asserts that it
 * type-checks without errors: the attributes are unknown, so any attribute name is accepted.
 */
import type { Modules, UID } from '../../../../../../..';

type Filters<TSchemaUID extends UID.Schema> =
  Modules.Documents.Params.Filters.ObjectNotation<TSchemaUID>;

export const contentType: Filters<'api::article.article'> = {
  title: { $eq: 'a' },
  seo: { metaTitle: { $contains: 'b' } },
  $or: [{ views: { $gt: 1 } }, { author: { name: 'c' } }],
};

export const component: Filters<'shared.seo'> = {
  metaTitle: 'a',
  $not: { metaDescription: { $null: true } },
};

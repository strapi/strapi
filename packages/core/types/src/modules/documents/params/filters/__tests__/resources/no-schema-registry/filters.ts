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

/**
 * A filter generic over a UID stays assignable to the filter of the wide UID
 */
export const toWideContentType = <TSchemaUID extends UID.ContentType>(
  filters: Filters<TSchemaUID>
): Filters<UID.ContentType> => filters;

export const toWideComponent = <TSchemaUID extends UID.Component>(
  filters: Filters<TSchemaUID>
): Filters<UID.Component> => filters;

export const toWideSchema = <TSchemaUID extends UID.Schema>(
  filters: Filters<TSchemaUID>
): Filters<UID.Schema> => filters;

declare const documents: Modules.Documents.ServiceInstance<UID.ContentType>;
declare const documentIds: (string | undefined)[];

/**
 * Operators on an unknown attribute stay accepted in a Document Service call with a content type UID
 * read at runtime, with any operand (e.g. `$in` with a possibly undefined item)
 */
documents.findMany({ filters: { documentId: { $in: documentIds } } });
documents.findMany({ filters: { author: { $in: documentIds }, cover: { $null: true } } });

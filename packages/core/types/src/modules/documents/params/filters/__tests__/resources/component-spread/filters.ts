/**
 * Spreading a nested filter read back from a component filter, then adding a key.
 *
 * Compiled on its own, with and without `strictNullChecks`, by
 * `object-notation-attribute-keys.vitest.test.ts`. Not compiled with `exactOptionalPropertyTypes`,
 * which is out of scope for now: the spread is rejected in that mode.
 */
import type { Modules, UID } from '../../../../../../..';

type Filters<TSchemaUID extends UID.Schema> =
  Modules.Documents.Params.Filters.ObjectNotation<TSchemaUID>;

export const spreadComponentRelationFilter = (
  filters: Filters<'shared.link'>
): Filters<'shared.link'> => ({
  article: { ...filters.article, title: 'a' },
});

export const spreadComponentRelationFilterFromContentType = (
  filters: Filters<'api::article.article'>
): Filters<'api::article.article'> => ({
  links: { article: { ...filters.links?.article, title: 'a' } },
});

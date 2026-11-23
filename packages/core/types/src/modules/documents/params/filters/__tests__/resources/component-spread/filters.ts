/**
 * Spreading a nested filter read back from a component filter, then adding a key.
 *
 * Compiled on its own by `object-notation-attribute-keys.vitest.test.ts`: with `strict`, without
 * `strictNullChecks`, and with `exactOptionalPropertyTypes`.
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

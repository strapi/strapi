import type { Core, Struct } from '@strapi/types';

import { SPACE_ATTRIBUTE, SPACE_UID } from '../../shared/constants';
import { isScopedContentType } from './services/content-types';

/**
 * The space a row belongs to.
 *
 * A fresh object every call: model registration mutates attribute metadata in
 * place, so one shared descriptor would end up with the join metadata of
 * whichever content type was registered last.
 *
 * `useJoinTable: false` puts the foreign key in a real `space_id` column on the
 * row's own table instead of a link table, which is what makes the tenant
 * filter an indexed comparison rather than a join. `private` keeps it out of
 * API responses: callers name their space in a header, they never read or write
 * the column.
 */
const spaceRelation = () =>
  ({
    type: 'relation',
    relation: 'manyToOne',
    target: SPACE_UID,
    useJoinTable: false,
    private: true,
    configurable: false,
    visible: false,
    writable: true,
  }) as const;

/**
 * Indexes `(space_id, document_id)`.
 *
 * Every scoped read filters on `space_id`, and the Content Manager then looks
 * documents up by `document_id`, so this is the pair worth indexing. The
 * single-column index the schema builder already creates for the foreign key
 * covers the rest.
 */
const addSpaceIndex = (strapi: Core.Strapi, contentType: Struct.Schema) => {
  const collectionName = (contentType as { collectionName?: string }).collectionName;

  if (!collectionName) {
    return;
  }

  const columns = ['space_id'];

  // Not every scoped model has documents — media files do not — so the second
  // column is only added where it exists.
  if (contentType.attributes?.documentId || contentType.modelType === 'contentType') {
    columns.push('document_id');
  }

  const name = strapi.db.metadata.identifiers.getIndexName([collectionName, 'space']);
  const indexes = ((contentType as { indexes?: Array<{ name?: string }> }).indexes ?? []) as Array<{
    name?: string;
  }>;

  if (indexes.some((index) => index.name === name)) {
    return;
  }

  (contentType as { indexes?: unknown[] }).indexes = [...indexes, { name, columns }];
};

/**
 * Makes a scoped model's unique constraints unique *per space*.
 *
 * A declared unique index is a statement about the whole project, and once a
 * table belongs to tenants that is the wrong statement: media folders allocate
 * their `pathId` from the highest one they can see, so the second space would
 * pick a number the first already used and the insert would be refused. The
 * same holds for anything else a scoped content type declares unique.
 *
 * Attribute-level `unique: true` needs nothing here — Strapi enforces that with
 * a query rather than an index, and that query is scoped like any other, so it
 * is already per-space.
 */
const scopeUniqueIndexes = (contentType: Struct.Schema) => {
  const indexes = (contentType as { indexes?: Array<Record<string, unknown>> }).indexes;

  if (!Array.isArray(indexes)) {
    return;
  }

  for (const index of indexes) {
    const columns = index.columns as string[] | undefined;

    if (index.type !== 'unique' || !Array.isArray(columns) || columns.includes('space_id')) {
      continue;
    }

    index.columns = ['space_id', ...columns];
  }
};

/**
 * Gives every space-scoped content type its `space` column.
 *
 * Done during register, before the database builds its metadata, so schema sync
 * creates the column on its own and no migration has to be written by hand.
 */
const addSpaceToContentTypes = (strapi: Core.Strapi) => {
  for (const contentType of Object.values(strapi.contentTypes)) {
    if (!isScopedContentType(contentType)) {
      continue;
    }

    contentType.attributes[SPACE_ATTRIBUTE] = spaceRelation() as never;
    scopeUniqueIndexes(contentType);
    addSpaceIndex(strapi, contentType);
  }
};

/**
 * Models registered straight on the model registry rather than as content
 * types — content history versions are the one that matters, because a version
 * carries a copy of the entry it was taken from and would otherwise be readable
 * from any space.
 */
const addSpaceToInternalModels = (strapi: Core.Strapi) => {
  const models = strapi.get('models') as {
    get?: () => Array<{ uid: string; attributes: Record<string, unknown> }>;
  };

  const registered = models?.get?.() ?? [];

  for (const model of registered) {
    if (model.uid !== 'plugin::content-manager.history-version') {
      continue;
    }

    model.attributes[SPACE_ATTRIBUTE] = spaceRelation() as never;
  }
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  addSpaceToContentTypes(strapi);
  addSpaceToInternalModels(strapi);
};

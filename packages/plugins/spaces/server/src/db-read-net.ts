import type { Core } from '@strapi/types';

import { getService } from './utils';
import { isSharedContentType } from './services/content-types';
import { getShadowedDocumentId, resolveReadScope } from './utils/space-scope';

/**
 * DB-level READ net for workspace-scoped content types — **the** read filter.
 *
 * Every document-service read ends in `strapi.db.query(uid).findMany/findOne/count`,
 * and so do the raw reads plugins perform (the Media Library, custom
 * controllers). Filtering here once means user filters are ANDed underneath
 * and can never widen the view.
 *
 * Rules (see `resolveReadScope`):
 *   - unscoped context → unfiltered, override copies included;
 *   - the default workspace, the global write scope, or no request → every
 *     workspace's entries minus the override copies, which are shadows of a
 *     document already in the list;
 *   - a sub-workspace X → its own rows, plus the inherited ones it has not
 *     overridden. What counts as inherited depends on the content type: an
 *     ordinary one shares entry by entry (`space_id NULL`), one flagged
 *     `sharedEntries` shares all of them and the column says nothing about
 *     visibility there.
 *
 * Content types whose entries are all shared are in the net too, even though
 * they need no workspace filter: a workspace that overrides one of their
 * entries has to stop seeing the original, and that exclusion lives here.
 */
export const registerDbReadNet = (strapi: Core.Strapi) => {
  const { getSpaceScopedContentTypes } = getService('content-types');
  const models = getSpaceScopedContentTypes(strapi).map(
    (contentType: { uid: string }) => contentType.uid
  );

  if (models.length === 0) {
    return;
  }

  strapi.db.lifecycles.subscribe({
    models,

    beforeFindOne(event: unknown) {
      applySpaceFilter(strapi, event);
    },
    beforeFindMany(event: unknown) {
      applySpaceFilter(strapi, event);
    },
    beforeCount(event: unknown) {
      applySpaceFilter(strapi, event);
    },
  });
};

interface ReadEvent {
  model?: { uid?: string; tableName?: string };
  params?: { where?: unknown } & Record<string, unknown>;
}

/**
 * `space_id IS NULL` means "inherited by every workspace", so the predicate has
 * to be an `$or` of two values.
 *
 * It cannot be collapsed into `space_id IN (X, null)`: SQL `IN` never matches
 * NULL. That shape is also why a workspace list page cannot come back already
 * ordered from an index — two values, two index ranges, then a sort. Measured
 * at a million documents it is still cheaper than the default workspace's
 * unfiltered view, so it is a price worth paying, but it is the reason no
 * `(space_id, …)` composite index is declared for list queries.
 */
const ownedOrInherited = (spaceColumn: string, target: number) => ({
  $or: [{ [spaceColumn]: target }, { [spaceColumn]: { $null: true } }],
});

const NOT_AN_OVERRIDE = (overrideColumn: string) => ({
  $or: [{ [overrideColumn]: false }, { [overrideColumn]: { $null: true } }],
});

/**
 * The columns to filter on, straight from the model's metadata.
 *
 * Filtering on the join column rather than the `space` relation matters: the
 * query builder turns `{ space: { id } }` into a LEFT JOIN of the `spaces`
 * table *per `$or` branch*, plus a `SELECT DISTINCT` to undo the damage. The
 * column form emits `t0.space_id = ?` and no join, which measured 7-9% faster
 * on every scoped read.
 */
const columnsOf = (strapi: Core.Strapi, uid: string | undefined) => {
  if (!uid) {
    return undefined;
  }
  const attributes = strapi.db.metadata.get(uid as never)?.attributes as
    | Record<string, { joinColumn?: { name?: string }; columnName?: string }>
    | undefined;
  const space = attributes?.space?.joinColumn?.name;
  if (!space) {
    return undefined;
  }
  return {
    space,
    override: attributes?.spaceOverride?.columnName ?? 'space_override',
    // Not every scoped model is a document (the Media Library's folders are
    // not): without a documentId there is nothing an override could shadow.
    hasDocuments: Boolean(attributes?.documentId),
  };
};

/** Exported for tests: the pure "AND the workspace predicate" step. */
export const applySpaceFilter = (strapi: Core.Strapi, rawEvent: unknown): void => {
  const scope = resolveReadScope(strapi);
  if (scope.kind === 'unscoped') {
    return;
  }

  const event = rawEvent as ReadEvent;
  const uid = event.model?.uid;
  const columns = columnsOf(strapi, uid);
  if (!columns) {
    return;
  }

  const model = uid ? strapi.contentTypes[uid as never] : undefined;
  const shared = isSharedContentType(model);
  const conditions: Record<string, unknown>[] = [];

  if (scope.kind === 'global') {
    conditions.push(NOT_AN_OVERRIDE(columns.override));
  } else {
    conditions.push(
      visibleInSpace(strapi, event, columns, scope.id, shared) ??
        (shared ? NOT_AN_OVERRIDE(columns.override) : ownedOrInherited(columns.space, scope.id))
    );
  }

  // The document an override copy is being made from: hidden from everything
  // that does not name it, so the entity validator does not see the original's
  // unique values while the copy that reuses them is being written.
  const shadowed = getShadowedDocumentId();
  if (shadowed && !namesDocument(event.params?.where, shadowed)) {
    conditions.push({ documentId: { $ne: shadowed } });
  }

  event.params = event.params ?? {};
  event.params.where = event.params.where
    ? { $and: [event.params.where, ...conditions] }
    : conditions.length === 1
      ? conditions[0]
      : { $and: conditions };
};

/**
 * The workspace's own rows, plus the inherited ones it has not overridden.
 *
 * The list of overridden documents is a subquery rather than an array of ids
 * fetched first: `$notIn` accepts a knex builder and inlines it, so this costs
 * no round trip and does not grow with the number of overrides. Only the
 * inherited branch is filtered — the workspace's own copy carries the same
 * documentId and must stay.
 */
const visibleInSpace = (
  strapi: Core.Strapi,
  event: ReadEvent,
  columns: { space: string; override: string; hasDocuments: boolean },
  target: number,
  shared: boolean
): Record<string, unknown> | undefined => {
  const tableName = event.model?.tableName;
  if (!tableName || !columns.hasDocuments) {
    return undefined;
  }

  const overridden = strapi.db
    .connection(tableName)
    .select('document_id')
    .where(columns.space, target)
    .where(columns.override, true)
    .whereNotNull('document_id');

  // On a content type whose entries are all shared, everything is inherited —
  // the workspace column says nothing about who may see a row, only whose copy
  // it is. So the branch that would match "my own rows" matches my own copies,
  // and the inherited branch is every row that is nobody's copy.
  const inherited = shared
    ? NOT_AN_OVERRIDE(columns.override)
    : { [columns.space]: { $null: true } };
  const own = shared
    ? { $and: [{ [columns.space]: target }, { [columns.override]: true }] }
    : { [columns.space]: target };

  return {
    $or: [own, { $and: [inherited, { documentId: { $notIn: overridden } }] }],
  };
};

/** Whether a `where` already pins the document down, at any depth. */
const namesDocument = (where: unknown, documentId: string): boolean => {
  if (!where || typeof where !== 'object') {
    return false;
  }
  if (Array.isArray(where)) {
    return where.some((entry) => namesDocument(entry, documentId));
  }
  const record = where as Record<string, unknown>;
  if (record.documentId === documentId) {
    return true;
  }
  return Object.values(record).some((value) => namesDocument(value, documentId));
};

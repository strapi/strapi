/**
 * Migration overview
 * ===================
 * 1. Create bare draft rows for every published entry, cloning only scalar fields (no relations/components yet).
 *    We do this with a single INSERT … SELECT per content type to avoid touching the document service for every single v4 entry.
 *
 * 2. Rewire all relations so the newly created drafts behave exactly like calling `documentService.discardDraft()`
 *    on every published entry:
 *      - Join-table relations (self, manyToMany, etc.) are copied in bulk.
 *      - Foreign keys (joinColumn relations) are updated so draft rows point to draft targets.
 *      - Component relations are copied while respecting the discard logic: each draft gets its own component instance,
 *        and the component’s relations (including nested components) are remapped to draft targets.
 *
 * 3. Components are duplicated at the database layer (new component rows + join-table rows). We deliberately clone
 *    instead of sharing component IDs so that draft edits don’t mutate published data.
 *
 * Why we do it this way
 * ----------------------
 * • Efficiency: calling the document service per entry would issue several queries per relation/component. The SQL
 *   batches mirror the service’s behavior but execute in O(content types × batches), so the migration scales to
 *   millions of entries.

 * • Memory safety: any caches that track per-record information (component parent lookups, clone maps) are scoped to
 *   a single batch of 1,000 entries. Schema-level caches (component metadata, join table names) remain global because
 *   they’re tiny and reused.
 */

/* eslint-disable no-continue */
import type { UID } from '@strapi/types';
import type { Database, Migration } from '@strapi/database';
import { createId } from '@paralleldrive/cuid2';
import { contentTypes } from '@strapi/utils';
import createDebug from 'debug';
import {
  getComponentJoinTableName,
  getComponentJoinColumnEntityName,
  getComponentJoinColumnInverseName,
  getComponentTypeColumn,
} from '../../utils/transform-content-types-to-models';

type DocumentVersion = { documentId: string; locale: string };
type Knex = Parameters<Migration['up']>[0];

type MetadataWithOptionalPrimaryKey = {
  primaryKey?: string | { columnName?: string; name?: string };
  attributes?: Record<string, unknown>;
};

const DEFAULT_PRIMARY_KEY_COLUMN = 'id';

type AttributeWithPrimaryFlag = {
  columnName?: string;
  column?: {
    primary?: boolean;
  };
};

/**
 * Determines the primary-key column name for a schema, handling the various shapes
 * metadata can take (string, object, attribute flag) and defaulting to `id`.
 */
const resolvePrimaryKeyColumn = (meta: MetadataWithOptionalPrimaryKey): string => {
  const { primaryKey } = meta;

  if (typeof primaryKey === 'string' && primaryKey) {
    return primaryKey;
  }

  if (primaryKey && typeof primaryKey === 'object') {
    const pkObject = primaryKey as { columnName?: string; name?: string };

    const columnName = pkObject.columnName;
    if (typeof columnName === 'string' && columnName) {
      return columnName;
    }

    const name = pkObject.name;
    if (typeof name === 'string' && name) {
      return name;
    }
  }

  const attributes = meta.attributes ?? {};
  for (const [attributeName, attribute] of Object.entries(attributes)) {
    const normalizedAttribute = attribute as AttributeWithPrimaryFlag | undefined;

    if (!normalizedAttribute) {
      continue;
    }

    const { column } = normalizedAttribute;
    if (column?.primary === true) {
      if (typeof normalizedAttribute.columnName === 'string' && normalizedAttribute.columnName) {
        return normalizedAttribute.columnName;
      }

      return attributeName;
    }
  }

  return DEFAULT_PRIMARY_KEY_COLUMN;
};

/**
 * Check if the model has draft and publish enabled.
 */
const hasDraftAndPublish = async (trx: Knex, meta: any) => {
  const hasTable = await trx.schema.hasTable(meta.tableName);

  if (!hasTable) {
    return false;
  }

  const uid = meta.uid as UID.ContentType;
  const model = strapi.getModel(uid);
  const hasDP = contentTypes.hasDraftAndPublish(model);
  if (!hasDP) {
    return false;
  }

  return true;
};

/**
 * Copy all the published entries to draft entries, without it's components, dynamic zones or relations.
 * This ensures all necessary draft's exist before copying it's relations.
 */
async function copyPublishedEntriesToDraft({
  db,
  trx,
  uid,
}: {
  db: Database;
  trx: Knex;
  uid: string;
}) {
  // Extract all scalar attributes to use in the insert query
  const meta = db.metadata.get(uid);

  // Get scalar attributes that will be copied over the new draft
  const scalarAttributes = Object.values(meta.attributes).reduce((acc, attribute: any) => {
    if (['id'].includes(attribute.columnName)) {
      return acc;
    }

    if (contentTypes.isScalarAttribute(attribute)) {
      acc.push(attribute.columnName);
    }

    return acc;
  }, [] as string[]);

  /**
   * Query to copy the published entries into draft entries.
   *
   * INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
   * SELECT columnName1, columnName2, columnName3, ...
   * FROM tableName
   */
  await trx
    // INSERT INTO tableName (columnName1, columnName2, columnName3, ...)
    .into(
      trx.raw(`?? (${scalarAttributes.map(() => `??`).join(', ')})`, [
        meta.tableName,
        ...scalarAttributes,
      ])
    )
    .insert((subQb: typeof trx) => {
      // SELECT columnName1, columnName2, columnName3, ...
      subQb
        .select(
          ...scalarAttributes.map((att: string) => {
            // NOTE: these literals reference Strapi's built-in system columns. They never get shortened by
            // the identifier migration (5.0.0-01-convert-identifiers-long-than-max-length) so we can safely
            // compare/use them directly here.
            if (att === 'published_at') {
              return trx.raw('NULL as ??', 'published_at');
            }

            return att;
          })
        )
        .from(meta.tableName)
        // Only select entries that were published
        .whereNotNull('published_at');
    });
}

/**
 * Orchestrates the relation cloning pipeline for a single content type. We duplicate
 * every category of relation (self, inbound, outbound, components) using direct SQL so
 * the migration can scale without calling `discardDraft` entry by entry.
 */
async function copyRelationsToDrafts({ db, trx, uid }: { db: Database; trx: Knex; uid: string }) {
  const meta = db.metadata.get(uid);
  if (!meta) {
    return;
  }

  // Create mapping from published entry ID to draft entry ID
  const publishedToDraftMap = await buildPublishedToDraftMap({ trx, uid, meta });

  if (!publishedToDraftMap || publishedToDraftMap.size === 0) {
    return;
  }

  // Copy relations for this content type
  await copyRelationsForContentType({
    trx,
    uid,
    publishedToDraftMap,
  });

  // Copy relations from other content types that target this content type
  await copyRelationsFromOtherContentTypes({
    trx,
    uid,
    publishedToDraftMap,
  });

  // Copy relations from this content type that target other content types (category 3)
  await copyRelationsToOtherContentTypes({
    trx,
    uid,
    publishedToDraftMap,
  });

  // Copy component relations from published entries to draft entries
  await copyComponentRelations({
    trx,
    uid,
    publishedToDraftMap,
  });
}

/**
 * Splits large input arrays into smaller batches so we can run SQL queries without
 * hitting parameter limits (SQLite) or payload limits (MySQL/Postgres).
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Chooses a safe batch size for bulk operations depending on the database engine,
 * falling back to smaller units on engines (notably SQLite) that have low limits.
 */
function getBatchSize(trx: Knex, defaultSize: number = 1000): number {
  const client = trx.client.config.client;
  const isSQLite =
    typeof client === 'string' && ['sqlite', 'sqlite3', 'better-sqlite3'].includes(client);

  // SQLite documentation states that the maximum number of terms in a
  // compound SELECT statement is 500 by default.
  // See: https://www.sqlite.org/limits.html
  // We use 250 to be safe and account for other query complexity.
  return isSQLite ? Math.min(defaultSize, 250) : defaultSize;
}

/**
 * Applies stable ordering to join-table queries so cloning work is deterministic and
 * matches the ordering logic used by the entity service (important for tests and DZ order).
 */
const applyJoinTableOrdering = (qb: any, joinTable: any, sourceColumnName: string) => {
  const seenColumns = new Set<string>();

  const enqueueColumn = (column?: string, direction: 'asc' | 'desc' = 'asc') => {
    if (!column || seenColumns.has(column)) {
      return;
    }

    seenColumns.add(column);
    qb.orderBy(column, direction);
  };

  enqueueColumn(sourceColumnName, 'asc');

  if (Array.isArray(joinTable?.orderBy)) {
    for (const clause of joinTable.orderBy) {
      if (!clause || typeof clause !== 'object') {
        continue;
      }

      const [column, direction] = Object.entries(clause)[0] ?? [];
      if (!column) {
        continue;
      }

      const normalizedDirection =
        typeof direction === 'string' && direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
      enqueueColumn(column, normalizedDirection as 'asc' | 'desc');
    }
  }

  enqueueColumn(joinTable?.orderColumnName, 'asc');
  enqueueColumn(joinTable?.orderColumn, 'asc');
  enqueueColumn('id', 'asc');
};

type ParentSchemaInfo = { uid: string; collectionName?: string };
type ComponentParentInstance = { uid: string; parentId: number | string };

const componentParentSchemasCache = new Map<string, ParentSchemaInfo[]>();
const joinTableExistsCache = new Map<string, boolean>();
const componentMetaCache = new Map<string, any>();

const SKIPPED_RELATION_SAMPLE_LIMIT = 5;

type SkippedRelationContext = {
  sourceUid: string;
  attributeName: string;
  targetUid?: string;
  joinTable?: string;
};

type SkippedRelationStatsEntry = SkippedRelationContext & {
  count: number;
  samples: Set<string>;
};

const skippedRelationStats = new Map<string, SkippedRelationStatsEntry>();

const DUPLICATE_ERROR_CODES = new Set(['23505', 'ER_DUP_ENTRY', 'SQLITE_CONSTRAINT_UNIQUE']);

const debug = createDebug('strapi::migration::discard-drafts');

/**
 * Converts arbitrary id values into numbers when possible so we can safely index into
 * mapping tables without worrying about string/number mismatches.
 */
const normalizeId = (value: any): number | null => {
  if (value == null) {
    return null;
  }

  const num = Number(value);

  if (Number.isNaN(num)) {
    return null;
  }

  return num;
};

/**
 * Wrapper around map lookups that first normalizes the provided identifier.
 */
const getMappedValue = <T>(map: Map<number, T> | null | undefined, key: any): T | undefined => {
  if (!map) {
    return undefined;
  }

  const normalized = normalizeId(key);

  if (normalized == null) {
    return undefined;
  }

  return map.get(normalized);
};

/**
 * Extracts the inserted row identifier across the various shapes returned by different
 * clients/drivers (numbers, objects, arrays). Falls back to `null` if nothing usable.
 */
const resolveInsertedId = (insertResult: any): number | null => {
  if (insertResult == null) {
    return null;
  }

  if (typeof insertResult === 'number') {
    return insertResult;
  }

  if (Array.isArray(insertResult)) {
    if (insertResult.length === 0) {
      return null;
    }

    const first = insertResult[0];
    if (first == null) {
      return null;
    }

    if (typeof first === 'number') {
      return first;
    }

    if (typeof first === 'object') {
      if ('id' in first) {
        return Number(first.id);
      }

      const idKey = Object.keys(first).find((key) => key.toLowerCase() === 'id');
      if (idKey) {
        return Number((first as Record<string, any>)[idKey]);
      }
    }
  }

  if (typeof insertResult === 'object' && 'id' in insertResult) {
    return Number(insertResult.id);
  }

  return null;
};

/**
 * Detects vendor-specific duplicate key errors so we can safely ignore them when our
 * goal is to insert-or-ignore without branching on the client everywhere.
 */
const isDuplicateEntryError = (error: any): boolean => {
  if (!error) {
    return false;
  }

  if (DUPLICATE_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = typeof error.message === 'string' ? error.message : '';
  return message.includes('duplicate key') || message.includes('UNIQUE constraint failed');
};

/**
 * Inserts a row while tolerating duplicates across all supported clients. Used when
 * bulk operations fall back to single inserts to resolve constraint conflicts.
 */
const insertRowWithDuplicateHandling = async (
  trx: Knex,
  tableName: string,
  row: Record<string, any>,
  context: Record<string, any> = {}
) => {
  try {
    const client = trx.client.config.client;

    if (
      client === 'postgres' ||
      client === 'pg' ||
      client === 'sqlite3' ||
      client === 'better-sqlite3'
    ) {
      await trx(tableName).insert(row).onConflict().ignore();
      return;
    }

    if (client === 'mysql' || client === 'mysql2') {
      await trx.raw(`INSERT IGNORE INTO ?? SET ?`, [tableName, row]);
      return;
    }

    await trx(tableName).insert(row);
  } catch (error: any) {
    if (!isDuplicateEntryError(error)) {
      const details = JSON.stringify(context);
      const wrapped = new Error(
        `Failed to insert row into ${tableName}: ${error.message} | context=${details}`
      );
      (wrapped as any).cause = error;
      throw wrapped;
    }
  }
};

/**
 * Normalizes identifiers into a comparable string so we can dedupe target ids
 * regardless of whether they come in as numbers, strings, or objects.
 */
const toComparisonKey = (value: any): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

/**
 * Formats ids for log output while keeping the log lightweight and JSON-safe.
 */
const toDisplayValue = (value: any): string => {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Tracks how many relation rows we skipped because their targets are missing, so we
 * can emit a consolidated warning once the migration finishes copying relations.
 */
function recordSkippedRelations(context: SkippedRelationContext, skippedIds: any[]) {
  if (!skippedIds.length) {
    return;
  }

  const key = `${context.sourceUid}::${context.attributeName}::${context.joinTable ?? 'NO_JOIN_TABLE'}`;
  let stats = skippedRelationStats.get(key);

  if (!stats) {
    stats = {
      ...context,
      count: 0,
      samples: new Set<string>(),
    };
  }

  stats.count += skippedIds.length;

  for (const id of skippedIds) {
    if (stats.samples.size >= SKIPPED_RELATION_SAMPLE_LIMIT) {
      break;
    }

    stats.samples.add(toDisplayValue(id));
  }

  skippedRelationStats.set(key, stats);
}

/**
 * Emits aggregated warnings for all skipped relations and resets the counters.
 * This keeps the log readable even when millions of orphaned rows exist.
 */
function flushSkippedRelationLogs() {
  if (skippedRelationStats.size === 0) {
    return;
  }

  for (const stats of skippedRelationStats.values()) {
    const sampleArray = Array.from(stats.samples);
    const sampleText = sampleArray.length > 0 ? sampleArray.join(', ') : 'n/a';
    const targetInfo = stats.targetUid ? `target=${stats.targetUid}` : 'target=unknown';
    const joinTableInfo = stats.joinTable ? `joinTable=${stats.joinTable}` : 'joinTable=n/a';
    const ellipsis = stats.count > sampleArray.length ? ', ...' : '';

    strapi.log.warn(
      `[discard-drafts] Skipped ${stats.count} relation(s) for ${stats.sourceUid}.${stats.attributeName} (${targetInfo}, ${joinTableInfo}). Example target ids: ${sampleText}${ellipsis}`
    );
  }

  strapi.log.warn(
    '[discard-drafts] Some join-table relations referenced missing targets and were skipped. Review these warnings and clean up orphaned relations before rerunning the migration if needed.'
  );

  skippedRelationStats.clear();
}

/**
 * Returns every schema (content type or component) that can embed the provided component.
 * Cached because we consult it repeatedly while remapping nested components.
 */
function listComponentParentSchemas(componentUid: string): ParentSchemaInfo[] {
  if (!componentParentSchemasCache.has(componentUid)) {
    const schemas = [
      ...Object.values(strapi.contentTypes),
      ...Object.values(strapi.components),
    ] as any[];

    const parents = schemas
      .filter((schema) => {
        if (!schema?.attributes) {
          return false;
        }

        return Object.values(schema.attributes).some((attr: any) => {
          if (attr.type === 'component') {
            return attr.component === componentUid;
          }

          if (attr.type === 'dynamiczone') {
            return attr.components?.includes(componentUid);
          }

          return false;
        });
      })
      .map((schema) => ({ uid: schema.uid, collectionName: schema.collectionName }));

    componentParentSchemasCache.set(componentUid, parents);
  }

  return componentParentSchemasCache.get(componentUid)!;
}

/**
 * Memoized helper for checking whether a table exists. Avoids repeating expensive
 * information_schema queries when we touch the same join table many times.
 */
async function ensureTableExists(trx: Knex, tableName: string): Promise<boolean> {
  if (!joinTableExistsCache.has(tableName)) {
    const exists = await trx.schema.hasTable(tableName);
    joinTableExistsCache.set(tableName, exists);
  }

  return joinTableExistsCache.get(tableName)!;
}

type FilterRelationsWithExistingTargetsParams<T> = {
  trx: Knex;
  targetUid?: string;
  relations: T[];
  getTargetId: (relation: T) => any;
};

/**
 * Filters out relation rows whose target entity no longer exists, returning the safe
 * rows along with a list of skipped ids so we can log them later.
 */
async function filterRelationsWithExistingTargets<T>({
  trx,
  targetUid,
  relations,
  getTargetId,
}: FilterRelationsWithExistingTargetsParams<T>): Promise<{ relations: T[]; skippedIds: any[] }> {
  if (!relations.length) {
    return { relations, skippedIds: [] };
  }

  if (!targetUid) {
    return { relations, skippedIds: [] };
  }

  const targetMeta = strapi.db.metadata.get(targetUid);
  if (!targetMeta) {
    return { relations, skippedIds: [] };
  }

  const tableName = targetMeta.tableName;
  const primaryKeyColumn = resolvePrimaryKeyColumn(targetMeta);

  if (!tableName) {
    return { relations, skippedIds: [] };
  }

  const uniqueIdMap = new Map<string, any>();

  for (const relation of relations) {
    const targetId = getTargetId(relation);

    if (targetId == null) {
      continue;
    }

    const key = toComparisonKey(targetId);
    if (!uniqueIdMap.has(key)) {
      uniqueIdMap.set(key, targetId);
    }
  }

  if (uniqueIdMap.size === 0) {
    return { relations, skippedIds: [] };
  }

  const hasTable = await ensureTableExists(trx, tableName);
  if (!hasTable) {
    return { relations: [], skippedIds: Array.from(uniqueIdMap.values()) };
  }

  const existingKeys = new Set<string>();
  const uniqueIds = Array.from(uniqueIdMap.values());
  const idChunks = chunkArray(uniqueIds, getBatchSize(trx, 1000));

  for (const chunk of idChunks) {
    const rows = await trx(tableName).select(primaryKeyColumn).whereIn(primaryKeyColumn, chunk);
    for (const row of rows) {
      const value = row[primaryKeyColumn];
      existingKeys.add(toComparisonKey(value));
    }
  }

  const filteredRelations: T[] = [];
  const skippedIds: any[] = [];

  for (const relation of relations) {
    const targetId = getTargetId(relation);

    if (targetId == null) {
      skippedIds.push(targetId);
      continue;
    }

    if (existingKeys.has(toComparisonKey(targetId))) {
      filteredRelations.push(relation);
    } else {
      skippedIds.push(targetId);
    }
  }

  return { relations: filteredRelations, skippedIds };
}

type ComponentHierarchyCaches = {
  parentInstanceCache: Map<string, ComponentParentInstance | null>;
  ancestorDpCache: Map<string, boolean>;
  parentDpCache: Map<string, boolean>;
};

/**
 * Locates the owning entity (content type or component) for a given component instance.
 * This mirrors the document service logic we need in order to decide whether a relation
 * should propagate to drafts, and is cached for performance.
 */
async function findComponentParentInstance(
  trx: Knex,
  identifiers: any,
  componentUid: string,
  componentId: number | string,
  excludeUid: string | undefined,
  caches: ComponentHierarchyCaches
): Promise<ComponentParentInstance | null> {
  const cacheKey = `${componentUid}:${componentId}:${excludeUid ?? 'ALL'}`;
  if (caches.parentInstanceCache.has(cacheKey)) {
    return caches.parentInstanceCache.get(cacheKey)!;
  }

  const parentComponentIdColumn = getComponentJoinColumnInverseName(identifiers);
  const parentComponentTypeColumn = getComponentTypeColumn(identifiers);
  const parentEntityIdColumn = getComponentJoinColumnEntityName(identifiers);

  const potentialParents = listComponentParentSchemas(componentUid).filter(
    (schema) => schema.uid !== excludeUid
  );

  for (const parentSchema of potentialParents) {
    if (!parentSchema.collectionName) {
      continue;
    }

    const parentJoinTableName = getComponentJoinTableName(parentSchema.collectionName, identifiers);

    try {
      if (!(await ensureTableExists(trx, parentJoinTableName))) {
        continue;
      }

      const parentRow = await trx(parentJoinTableName)
        .where({
          [parentComponentIdColumn]: componentId,
          [parentComponentTypeColumn]: componentUid,
        })
        .first(parentEntityIdColumn);

      if (parentRow) {
        const parentInstance: ComponentParentInstance = {
          uid: parentSchema.uid,
          parentId: parentRow[parentEntityIdColumn],
        };

        caches.parentInstanceCache.set(cacheKey, parentInstance);
        return parentInstance;
      }
    } catch {
      continue;
    }
  }

  caches.parentInstanceCache.set(cacheKey, null);
  return null;
}

/**
 * Fetches and caches database metadata for a component uid. Saves repeated lookups while
 * cloning the same component type thousands of times.
 */
const getComponentMeta = (componentUid: string) => {
  if (!componentMetaCache.has(componentUid)) {
    const meta = strapi.db.metadata.get(componentUid);
    componentMetaCache.set(componentUid, meta ?? null);
  }

  return componentMetaCache.get(componentUid);
};

/**
 * Determines whether a component's parent entity participates in draft/publish,
 * short-circuiting a lot of recursion when deciding relation propagation rules.
 */
async function hasDraftPublishAncestorForParent(
  trx: Knex,
  identifiers: any,
  parent: ComponentParentInstance,
  caches: ComponentHierarchyCaches
): Promise<boolean> {
  const cacheKey = `${parent.uid}:${parent.parentId}`;
  if (caches.parentDpCache.has(cacheKey)) {
    return caches.parentDpCache.get(cacheKey)!;
  }

  const parentContentType = strapi.contentTypes[
    parent.uid as keyof typeof strapi.contentTypes
  ] as any;
  if (parentContentType) {
    const result = !!parentContentType?.options?.draftAndPublish;
    caches.parentDpCache.set(cacheKey, result);
    return result;
  }

  const parentComponent = strapi.components[parent.uid as keyof typeof strapi.components] as any;
  if (!parentComponent) {
    caches.parentDpCache.set(cacheKey, false);
    return false;
  }

  const result = await hasDraftPublishAncestorForComponent(
    trx,
    identifiers,
    parent.uid,
    parent.parentId,
    undefined,
    caches
  );
  caches.parentDpCache.set(cacheKey, result);
  return result;
}

/**
 * Recursively checks whether a component lies beneath a draft/publish-enabled parent
 * component or content type. We mirror discardDraft's propagation guard.
 */
async function hasDraftPublishAncestorForComponent(
  trx: Knex,
  identifiers: any,
  componentUid: string,
  componentId: number | string,
  excludeUid: string | undefined,
  caches: ComponentHierarchyCaches
): Promise<boolean> {
  const cacheKey = `${componentUid}:${componentId}:${excludeUid ?? 'ALL'}`;
  if (caches.ancestorDpCache.has(cacheKey)) {
    return caches.ancestorDpCache.get(cacheKey)!;
  }

  const parent = await findComponentParentInstance(
    trx,
    identifiers,
    componentUid,
    componentId,
    excludeUid,
    caches
  );

  if (!parent) {
    caches.ancestorDpCache.set(cacheKey, false);
    return false;
  }

  const result = await hasDraftPublishAncestorForParent(trx, identifiers, parent, caches);
  caches.ancestorDpCache.set(cacheKey, result);
  return result;
}

/**
 * Abstracts `NOW()` handling so that timestamps stay consistent across databases—
 * using Knex's native function when available and falling back to JS dates otherwise.
 */
const resolveNowValue = (trx: Knex) => {
  if (typeof trx.fn?.now === 'function') {
    return trx.fn.now();
  }

  return new Date();
};

/**
 * Builds or retrieves the published→draft id map for a target content type, caching
 * the result so nested relation remapping can reuse the work.
 */
async function getDraftMapForTarget(
  trx: Knex,
  targetUid: string,
  draftMapCache: Map<string, Map<number, number> | null>
): Promise<Map<number, number> | null> {
  if (draftMapCache.has(targetUid)) {
    return draftMapCache.get(targetUid) ?? null;
  }

  const targetMeta = strapi.db.metadata.get(targetUid);
  if (!targetMeta) {
    draftMapCache.set(targetUid, null);
    return null;
  }

  const map = await buildPublishedToDraftMap({
    trx,
    uid: targetUid,
    meta: targetMeta,
    options: { requireDraftAndPublish: true },
  });

  draftMapCache.set(targetUid, map ?? null);
  return map ?? null;
}

/**
 * Maps relation foreign keys so that draft entities reference draft targets when those
 * targets exist; otherwise we preserve the original reference (matching discardDraft).
 */
async function mapTargetId(
  trx: Knex,
  originalId: number | string | null,
  targetUid: string | undefined,
  parentUid: string,
  parentPublishedToDraftMap: Map<number, number>,
  draftMapCache: Map<string, Map<number, number> | null>
) {
  if (originalId == null || !targetUid) {
    return originalId;
  }

  if (targetUid === parentUid) {
    return parentPublishedToDraftMap.get(Number(originalId)) ?? originalId;
  }

  const targetMap = await getDraftMapForTarget(trx, targetUid, draftMapCache);
  if (!targetMap) {
    return originalId;
  }

  return targetMap.get(Number(originalId)) ?? originalId;
}

/**
 * Clones a database row and strips the `id` column so it can be reinserted as a new row.
 */
const ensureObjectWithoutId = (row: Record<string, any>) => {
  const cloned = { ...row };
  if ('id' in cloned) {
    delete cloned.id;
  }
  return cloned;
};

/**
 * Duplicates join-table relations for a component instance while remapping any foreign
 * keys to draft targets. Mirrors the runtime clone logic but operates entirely in SQL.
 */
async function cloneComponentRelationJoinTables(
  trx: Knex,
  componentMeta: any,
  componentUid: string,
  originalComponentId: number,
  newComponentId: number,
  parentUid: string,
  parentPublishedToDraftMap: Map<number, number>,
  draftMapCache: Map<string, Map<number, number> | null>
) {
  for (const [attributeName, attribute] of Object.entries(componentMeta.attributes) as Array<
    [string, any]
  >) {
    if (attribute.type !== 'relation' || !attribute.joinTable) {
      continue;
    }

    const joinTable = attribute.joinTable;
    const sourceColumnName = joinTable.joinColumn.name;
    const targetColumnName = joinTable.inverseJoinColumn.name;

    if (!componentMeta.relationsLogPrinted) {
      debug(
        `[cloneComponentRelationJoinTables] Inspecting join table ${joinTable.name} for component ${componentUid}`
      );
      componentMeta.relationsLogPrinted = true;
    }

    const relations = await trx(joinTable.name)
      .select('*')
      .where(sourceColumnName, originalComponentId);

    if (relations.length === 0) {
      continue;
    }

    const preparedRelations: Array<Record<string, any>> = [];

    for (const relation of relations) {
      const clonedRelation = ensureObjectWithoutId(relation);
      clonedRelation[sourceColumnName] = newComponentId;

      if (targetColumnName in clonedRelation) {
        const originalTargetId = clonedRelation[targetColumnName];
        clonedRelation[targetColumnName] = await mapTargetId(
          trx,
          clonedRelation[targetColumnName],
          attribute.target,
          parentUid,
          parentPublishedToDraftMap,
          draftMapCache
        );

        debug(
          `[cloneComponentRelationJoinTables] ${componentUid} join ${joinTable.name}: mapped ${targetColumnName} from ${originalTargetId} to ${clonedRelation[targetColumnName]} (target=${attribute.target})`
        );
      }

      preparedRelations.push(clonedRelation);
    }

    let relationsToInsert = preparedRelations;

    if (preparedRelations.some((relation) => targetColumnName in relation)) {
      const { relations: safeRelations, skippedIds } = await filterRelationsWithExistingTargets({
        trx,
        targetUid: attribute.target,
        relations: preparedRelations,
        getTargetId: (relation) => relation[targetColumnName],
      });

      recordSkippedRelations(
        {
          sourceUid: componentUid,
          attributeName,
          targetUid: attribute.target,
          joinTable: joinTable.name,
        },
        skippedIds
      );

      relationsToInsert = safeRelations;
    }

    if (relationsToInsert.length === 0) {
      continue;
    }

    for (const relation of relationsToInsert) {
      debug(
        `[cloneComponentRelationJoinTables] inserting relation into ${joinTable.name} (component=${componentUid}, source=${relation[sourceColumnName]})`
      );

      await insertRowWithDuplicateHandling(trx, joinTable.name, relation, {
        componentUid,
        originalComponentId,
        newComponentId,
        joinTable: joinTable.name,
        sourceColumnName,
        targetColumnName,
        targetUid: attribute.target,
        parentUid,
      });
    }
  }
}

/**
 * Clones a component row (including nested relations) so the newly created draft entity
 * owns its own copy, matching what the document service would have produced.
 */
async function cloneComponentInstance({
  trx,
  componentUid,
  componentId,
  parentUid,
  parentPublishedToDraftMap,
  draftMapCache,
}: {
  trx: Knex;
  componentUid: string;
  componentId: number;
  parentUid: string;
  parentPublishedToDraftMap: Map<number, number>;
  draftMapCache: Map<string, Map<number, number> | null>;
}): Promise<number> {
  const componentMeta = getComponentMeta(componentUid);
  if (!componentMeta) {
    return componentId;
  }

  const componentTableName = componentMeta.tableName;
  const componentPrimaryKey = Number.isNaN(Number(componentId)) ? componentId : Number(componentId);
  const componentRow = await trx(componentTableName)
    .select('*')
    .where('id', componentPrimaryKey)
    .first();

  if (!componentRow) {
    return componentId;
  }

  const newComponentRow: Record<string, any> = ensureObjectWithoutId(componentRow);

  // `document_id`, `created_at`, `updated_at` are Strapi system columns whose names remain stable across the
  // identifier-shortening migration, so it’s safe to check them directly here.
  if ('document_id' in newComponentRow) {
    newComponentRow.document_id = createId();
  }

  if ('updated_at' in newComponentRow) {
    newComponentRow.updated_at = resolveNowValue(trx);
  }

  if ('created_at' in newComponentRow && newComponentRow.created_at == null) {
    newComponentRow.created_at = resolveNowValue(trx);
  }

  for (const attribute of Object.values(componentMeta.attributes) as any) {
    if (attribute.type !== 'relation') {
      continue;
    }

    const joinColumn = attribute.joinColumn;
    if (!joinColumn) {
      continue;
    }

    const columnName = joinColumn.name;
    if (!columnName || !(columnName in newComponentRow)) {
      continue;
    }

    newComponentRow[columnName] = await mapTargetId(
      trx,
      newComponentRow[columnName],
      attribute.target,
      parentUid,
      parentPublishedToDraftMap,
      draftMapCache
    );
  }

  let insertResult;
  try {
    insertResult = await trx(componentTableName).insert(newComponentRow, ['id']);
  } catch (error: any) {
    insertResult = await trx(componentTableName).insert(newComponentRow);
  }

  let newComponentId = resolveInsertedId(insertResult);

  if (!newComponentId) {
    if ('document_id' in newComponentRow && newComponentRow.document_id) {
      const insertedRow = await trx(componentTableName)
        .select('id')
        .where('document_id', newComponentRow.document_id)
        .orderBy('id', 'desc')
        .first();
      newComponentId = insertedRow?.id ?? null;
    }

    if (!newComponentId) {
      const insertedRow = await trx(componentTableName).select('id').orderBy('id', 'desc').first();
      newComponentId = insertedRow?.id ?? null;
    }
  }

  if (!newComponentId) {
    throw new Error(`Failed to clone component ${componentUid} (id: ${componentId})`);
  }

  newComponentId = Number(newComponentId);

  if (Number.isNaN(newComponentId)) {
    throw new Error(`Invalid cloned component identifier for ${componentUid} (id: ${componentId})`);
  }

  await cloneComponentRelationJoinTables(
    trx,
    componentMeta,
    componentUid,
    Number(componentPrimaryKey),
    newComponentId,
    parentUid,
    parentPublishedToDraftMap,
    draftMapCache
  );

  return newComponentId;
}

type DraftMapOptions = {
  requireDraftAndPublish?: boolean;
};

/**
 * Generates a map between published row ids and their corresponding draft ids so we can
 * rewire relations in bulk. Handles localization nuances and caches the newest draft.
 */
async function buildPublishedToDraftMap({
  trx,
  uid,
  meta,
  options = {},
}: {
  trx: Knex;
  uid: string;
  meta: any;
  options?: DraftMapOptions;
}): Promise<Map<number, number> | null> {
  if (!meta) {
    return null;
  }

  const model = strapi.getModel(uid as UID.ContentType);
  const hasDraftAndPublishEnabled = contentTypes.hasDraftAndPublish(model);

  if (options.requireDraftAndPublish && !hasDraftAndPublishEnabled) {
    return null;
  }

  const [publishedEntries, draftEntries] = await Promise.all([
    // `document_id`, `locale`, and `published_at` are core columns that keep their exact names after the
    // identifier-shortening migration, so selecting them by literal is safe.
    trx(meta.tableName).select(['id', 'document_id', 'locale']).whereNotNull('published_at') as any,
    trx(meta.tableName).select(['id', 'document_id', 'locale']).whereNull('published_at') as any,
  ]);

  if (publishedEntries.length === 0 || draftEntries.length === 0) {
    return null;
  }

  const i18nService = strapi.plugin('i18n')?.service('content-types');
  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes] as any;
  const isLocalized = i18nService?.isLocalizedContentType(contentType) ?? false;

  const draftByDocumentId = new Map<string, (typeof draftEntries)[0]>();
  for (const draft of draftEntries) {
    if (!draft.document_id) {
      continue;
    }

    const key = isLocalized ? `${draft.document_id}:${draft.locale || ''}` : draft.document_id;
    const existing = draftByDocumentId.get(key);
    if (!existing) {
      draftByDocumentId.set(key, draft);
      continue;
    }

    const existingId = Number(existing.id);
    const draftId = Number(draft.id);

    if (Number.isNaN(existingId) || Number.isNaN(draftId)) {
      draftByDocumentId.set(key, draft);
      continue;
    }

    if (draftId > existingId) {
      draftByDocumentId.set(key, draft);
    }
  }

  const publishedToDraftMap = new Map<number, number>();
  for (const published of publishedEntries) {
    if (!published.document_id) {
      continue;
    }

    const key = isLocalized
      ? `${published.document_id}:${published.locale || ''}`
      : published.document_id;

    const draft = draftByDocumentId.get(key);
    if (draft) {
      const publishedId = normalizeId(published.id);
      const draftId = normalizeId(draft.id);

      if (publishedId == null || draftId == null) {
        continue;
      }

      publishedToDraftMap.set(publishedId, draftId);
    }
  }

  return publishedToDraftMap.size > 0 ? publishedToDraftMap : null;
}

/**
 * Copy relations within the same content type (self-referential relations)
 */
async function copyRelationsForContentType({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) return;

  const publishedIds = Array.from(publishedToDraftMap.keys());

  for (const attribute of Object.values(meta.attributes) as any) {
    if (attribute.type !== 'relation' || attribute.target !== uid) {
      continue;
    }

    const joinTable = attribute.joinTable;
    if (!joinTable) {
      continue;
    }

    // Skip component join tables - they are handled by copyComponentRelations
    if (joinTable.name.includes('_cmps')) {
      continue;
    }

    const { name: sourceColumnName } = joinTable.joinColumn;
    const { name: targetColumnName } = joinTable.inverseJoinColumn;

    // Process in batches to avoid MySQL query size limits and SQLite expression tree limits
    const publishedIdsChunks = chunkArray(publishedIds, getBatchSize(trx, 1000));

    for (const publishedIdsChunk of publishedIdsChunks) {
      // Get relations where the source is a published entry (in batches)
      const relationsQuery = trx(joinTable.name)
        .select('*')
        .whereIn(sourceColumnName, publishedIdsChunk);

      applyJoinTableOrdering(relationsQuery, joinTable, sourceColumnName);

      const relations = await relationsQuery;

      if (relations.length === 0) {
        continue;
      }

      // Create new relations pointing to draft entries
      // Remove the 'id' field to avoid duplicate key errors
      const newRelations = relations
        .map((relation) => {
          const newSourceId = getMappedValue(publishedToDraftMap, relation[sourceColumnName]);
          const newTargetId = getMappedValue(publishedToDraftMap, relation[targetColumnName]);

          if (!newSourceId || !newTargetId) {
            // Skip if no mapping found
            return null;
          }

          // Create new relation object without the 'id' field
          const { id, ...relationWithoutId } = relation;
          return {
            ...relationWithoutId,
            [sourceColumnName]: newSourceId,
            [targetColumnName]: newTargetId,
          };
        })
        .filter(Boolean);

      if (newRelations.length > 0) {
        await trx.batchInsert(joinTable.name, newRelations, getBatchSize(trx, 1000));
      }
    }
  }
}

/**
 * Copy relations from other content types that target this content type
 */
async function copyRelationsFromOtherContentTypes({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const targetMeta = strapi.db.metadata.get(uid);
  if (!targetMeta) {
    return;
  }

  const publishedTargetIds = Array.from(publishedToDraftMap.keys())
    .map((value) => normalizeId(value))
    .filter((value): value is number => value != null);

  if (publishedTargetIds.length === 0) {
    return;
  }

  const draftTargetIds = Array.from(publishedToDraftMap.values())
    .map((value) => normalizeId(value))
    .filter((value): value is number => value != null);

  const models = [
    ...(Object.values(strapi.contentTypes) as any[]),
    ...(Object.values(strapi.components) as any[]),
  ];

  // Compose a stable key for join-table rows so we can detect duplicates regardless
  // of ordering or whether we already created the “draft” relation earlier.
  const buildRelationKey = (
    relation: Record<string, any>,
    sourceColumnName: string,
    targetId: number | string | null
  ) => {
    const sourceId = normalizeId(relation[sourceColumnName]) ?? relation[sourceColumnName];
    const fieldValue = 'field' in relation ? (relation.field ?? '') : '';
    const componentTypeValue = 'component_type' in relation ? (relation.component_type ?? '') : '';

    return `${sourceId ?? 'null'}::${targetId ?? 'null'}::${fieldValue}::${componentTypeValue}`;
  };

  for (const model of models) {
    const dbModel = strapi.db.metadata.get(model.uid);
    if (!dbModel) {
      continue;
    }

    const sourceHasDraftAndPublish = Boolean(model.options?.draftAndPublish);

    for (const attribute of Object.values(dbModel.attributes) as any) {
      if (attribute.type !== 'relation' || attribute.target !== uid) {
        continue;
      }

      const joinTable = attribute.joinTable;
      if (!joinTable) {
        continue;
      }

      // Component join tables are handled separately when cloning components.
      if (joinTable.name.includes('_cmps')) {
        continue;
      }

      // If the source content type also has draft/publish, its own cloning routine will recreate its relations.
      if (sourceHasDraftAndPublish) {
        continue;
      }

      const { name: sourceColumnName } = joinTable.joinColumn;
      const { name: targetColumnName } = joinTable.inverseJoinColumn;

      const existingKeys = new Set<string>();

      if (draftTargetIds.length > 0) {
        const draftIdChunks = chunkArray(draftTargetIds, getBatchSize(trx, 1000));
        for (const draftChunk of draftIdChunks) {
          const existingRelationsQuery = trx(joinTable.name)
            .select('*')
            .whereIn(targetColumnName, draftChunk);

          applyJoinTableOrdering(existingRelationsQuery, joinTable, sourceColumnName);

          const existingRelations = await existingRelationsQuery;

          for (const relation of existingRelations) {
            existingKeys.add(
              buildRelationKey(relation, sourceColumnName, normalizeId(relation[targetColumnName]))
            );
          }
        }
      }

      const publishedIdChunks = chunkArray(publishedTargetIds, getBatchSize(trx, 1000));

      for (const chunk of publishedIdChunks) {
        const relationsQuery = trx(joinTable.name).select('*').whereIn(targetColumnName, chunk);

        applyJoinTableOrdering(relationsQuery, joinTable, sourceColumnName);

        const relations = await relationsQuery;
        if (relations.length === 0) {
          continue;
        }

        const newRelations: Array<Record<string, any>> = [];

        for (const relation of relations) {
          const newTargetId = getMappedValue(publishedToDraftMap, relation[targetColumnName]);
          if (!newTargetId) {
            continue;
          }

          const key = buildRelationKey(relation, sourceColumnName, newTargetId);
          if (existingKeys.has(key)) {
            continue;
          }

          existingKeys.add(key);

          const { id, ...relationWithoutId } = relation;
          newRelations.push({
            ...relationWithoutId,
            [targetColumnName]: newTargetId,
          });
        }

        if (newRelations.length === 0) {
          continue;
        }

        try {
          await trx.batchInsert(joinTable.name, newRelations, getBatchSize(trx, 1000));
        } catch (error: any) {
          if (!isDuplicateEntryError(error)) {
            throw error;
          }

          for (const relation of newRelations) {
            await insertRowWithDuplicateHandling(trx, joinTable.name, relation, {
              reason: 'duplicate-draft-target-relation',
              sourceUid: model.uid,
              targetUid: uid,
            });
          }
        }
      }
    }
  }
}

/**
 * Copy relations from this content type that target other content types (category 3)
 * Example: Article -> Categories/Tags
 */
async function copyRelationsToOtherContentTypes({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) return;

  const publishedIds = Array.from(publishedToDraftMap.keys());

  // Cache target publishedToDraftMap to avoid duplicate calls for same target
  const targetMapCache = new Map<string, Map<number, number> | null>();

  for (const [attributeName, attribute] of Object.entries(meta.attributes) as Array<
    [string, any]
  >) {
    if (attribute.type !== 'relation' || attribute.target === uid) {
      // Skip self-referential relations (handled by copyRelationsForContentType)
      continue;
    }

    const joinTable = attribute.joinTable;
    if (!joinTable) {
      continue;
    }

    // Skip component join tables - they are handled by copyComponentRelations
    if (joinTable.name.includes('_cmps')) {
      continue;
    }

    const { name: sourceColumnName } = joinTable.joinColumn;
    const { name: targetColumnName } = joinTable.inverseJoinColumn;

    // Get target content type's publishedToDraftMap if it has draft/publish (cached)
    const targetUid = attribute.target;
    if (!targetMapCache.has(targetUid)) {
      const targetMeta = strapi.db.metadata.get(targetUid);
      const targetMap = await buildPublishedToDraftMap({
        trx,
        uid: targetUid,
        meta: targetMeta,
        options: { requireDraftAndPublish: true },
      });
      targetMapCache.set(targetUid, targetMap);
    }
    const targetPublishedToDraftMap = targetMapCache.get(targetUid);

    // Process in batches to avoid MySQL query size limits and SQLite expression tree limits
    const publishedIdsChunks = chunkArray(publishedIds, getBatchSize(trx, 1000));

    for (const publishedIdsChunk of publishedIdsChunks) {
      // Get relations where the source is a published entry of our content type (in batches)
      const relationsQuery = trx(joinTable.name)
        .select('*')
        .whereIn(sourceColumnName, publishedIdsChunk);

      applyJoinTableOrdering(relationsQuery, joinTable, sourceColumnName);

      const relations = await relationsQuery;

      if (relations.length === 0) {
        continue;
      }

      // Create new relations pointing to draft entries
      // Remove the 'id' field to avoid duplicate key errors
      const newRelations = relations
        .map((relation) => {
          const newSourceId = getMappedValue(publishedToDraftMap, relation[sourceColumnName]);

          if (!newSourceId) {
            return null;
          }

          // Map target ID to draft if target has draft/publish enabled
          // This matches discard() behavior: drafts relate to drafts
          let newTargetId = relation[targetColumnName];
          if (targetPublishedToDraftMap) {
            const mappedTargetId = getMappedValue(
              targetPublishedToDraftMap,
              relation[targetColumnName]
            );
            if (mappedTargetId) {
              newTargetId = mappedTargetId;
            }
            // If no draft mapping, keep published target (target might not have DP or was deleted)
          }

          // Create new relation object without the 'id' field
          const { id, ...relationWithoutId } = relation;
          return {
            ...relationWithoutId,
            [sourceColumnName]: newSourceId,
            [targetColumnName]: newTargetId,
          };
        })
        .filter(Boolean);

      const { relations: safeRelations, skippedIds } = await filterRelationsWithExistingTargets({
        trx,
        targetUid,
        relations: newRelations as Array<Record<string, any>>,
        getTargetId: (relation) => relation[targetColumnName],
      });

      recordSkippedRelations(
        {
          sourceUid: uid,
          attributeName,
          targetUid,
          joinTable: joinTable.name,
        },
        skippedIds
      );

      if (safeRelations.length > 0) {
        try {
          await trx.batchInsert(joinTable.name, safeRelations, 1000);
        } catch (error: any) {
          // If batch insert fails due to duplicates, try with conflict handling
          if (error.code === '23505' || error.message?.includes('duplicate key')) {
            const client = trx.client.config.client;
            if (client === 'postgres' || client === 'pg') {
              for (const relation of safeRelations) {
                try {
                  await trx(joinTable.name).insert(relation).onConflict().ignore();
                } catch (err: any) {
                  if (err.code !== '23505' && !err.message?.includes('duplicate key')) {
                    throw err;
                  }
                }
              }
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
    }
  }
}

/**
 * Update JoinColumn relations (oneToOne, manyToOne foreign keys) to point to draft versions
 * This matches discard() behavior: when creating drafts, foreign keys should point to draft targets
 */
async function updateJoinColumnRelations({
  db,
  trx,
  uid,
}: {
  db: Database;
  trx: Knex;
  uid: string;
}) {
  const meta = db.metadata.get(uid);
  if (!meta) {
    return;
  }

  // Create mapping from published entry ID to draft entry ID
  const publishedToDraftMap = await buildPublishedToDraftMap({ trx, uid, meta });

  if (!publishedToDraftMap || publishedToDraftMap.size === 0) {
    return;
  }

  // Cache target publishedToDraftMap to avoid duplicate calls for same target
  const targetMapCache = new Map<string, Map<number, number> | null>();

  // Find all JoinColumn relations (oneToOne, manyToOne without joinTable)
  for (const attribute of Object.values(meta.attributes) as any) {
    if (attribute.type !== 'relation') {
      continue;
    }

    // Skip relations with joinTable (handled by copyRelationsToOtherContentTypes)
    if (attribute.joinTable) {
      continue;
    }

    // Only handle oneToOne and manyToOne relations that use joinColumn
    const joinColumn = attribute.joinColumn;
    if (!joinColumn) {
      continue;
    }

    const targetUid = attribute.target;
    const foreignKeyColumn = joinColumn.name;

    // Get target content type's publishedToDraftMap if it has draft/publish (cached)
    if (!targetMapCache.has(targetUid)) {
      const targetMeta = strapi.db.metadata.get(targetUid);
      const targetMap = await buildPublishedToDraftMap({
        trx,
        uid: targetUid,
        meta: targetMeta,
        options: { requireDraftAndPublish: true },
      });
      targetMapCache.set(targetUid, targetMap);
    }
    const targetPublishedToDraftMap = targetMapCache.get(targetUid);

    if (!targetPublishedToDraftMap) {
      // Target doesn't have draft/publish, foreign keys are fine as-is
      continue;
    }

    const draftIds = Array.from(publishedToDraftMap.values());
    if (draftIds.length === 0) {
      continue;
    }

    const draftIdsChunks = chunkArray(draftIds, getBatchSize(trx, 1000));

    for (const draftIdsChunk of draftIdsChunks) {
      // Get draft entries with their foreign key values
      const draftEntriesWithFk = await trx(meta.tableName)
        .select(['id', foreignKeyColumn])
        .whereIn('id', draftIdsChunk)
        .whereNotNull(foreignKeyColumn);

      const updates = draftEntriesWithFk.reduce<
        Array<{ id: number | string; draftTargetId: number | string }>
      >((acc, draftEntry) => {
        const publishedTargetIdRaw = draftEntry[foreignKeyColumn];
        const normalizedPublishedTargetId = normalizeId(publishedTargetIdRaw);
        const draftTargetId =
          normalizedPublishedTargetId == null
            ? undefined
            : targetPublishedToDraftMap.get(normalizedPublishedTargetId);

        if (draftTargetId != null && normalizeId(draftTargetId) !== normalizedPublishedTargetId) {
          acc.push({ id: draftEntry.id as number | string, draftTargetId });
        }

        return acc;
      }, []);

      if (updates.length === 0) {
        continue;
      }

      const caseFragments = updates.map(() => 'WHEN ? THEN ?').join(' ');
      const idsPlaceholders = updates.map(() => '?').join(', ');

      await trx.raw(
        `UPDATE ?? SET ?? = CASE ?? ${caseFragments} ELSE ?? END WHERE ?? IN (${idsPlaceholders})`,
        [
          meta.tableName,
          foreignKeyColumn,
          'id',
          ...updates.flatMap(({ id, draftTargetId }) => [id, draftTargetId]),
          foreignKeyColumn,
          'id',
          ...updates.map(({ id }) => id),
        ]
      );
    }
  }
}

/**
 * Copy component relations from published entries to draft entries
 */
async function copyComponentRelations({
  trx,
  uid,
  publishedToDraftMap,
}: {
  trx: Knex;
  uid: string;
  publishedToDraftMap: Map<number, number>;
}) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) {
    return;
  }

  // Get collectionName from content type schema (Meta only has tableName which may be shortened)
  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes] as any;
  const collectionName = contentType?.collectionName;
  if (!collectionName) {
    return;
  }

  const identifiers = strapi.db.metadata.identifiers;
  const joinTableName = getComponentJoinTableName(collectionName, identifiers);
  const entityIdColumn = getComponentJoinColumnEntityName(identifiers);
  const componentIdColumn = getComponentJoinColumnInverseName(identifiers);
  const componentTypeColumn = getComponentTypeColumn(identifiers);
  const fieldColumn = identifiers.FIELD_COLUMN;
  const orderColumn = identifiers.ORDER_COLUMN;

  // Check if component join table exists
  const hasTable = await trx.schema.hasTable(joinTableName);
  if (!hasTable) {
    return;
  }

  const publishedIds = Array.from(publishedToDraftMap.keys());

  // Process in batches to avoid MySQL query size limits and SQLite expression tree limits
  const publishedIdsChunks = chunkArray(publishedIds, getBatchSize(trx, 1000));

  for (const publishedIdsChunk of publishedIdsChunks) {
    // Get component relations for published entries
    const componentRelations = await trx(joinTableName)
      .select('*')
      .whereIn(entityIdColumn, publishedIdsChunk);

    if (componentRelations.length === 0) {
      continue;
    }

    const componentCloneCache = new Map<string, Map<string, number>>();
    const componentTargetDraftMapCache = new Map<string, Map<number, number> | null>();
    const componentHierarchyCaches: ComponentHierarchyCaches = {
      parentInstanceCache: new Map(),
      ancestorDpCache: new Map(),
      parentDpCache: new Map(),
    };

    // Filter component relations: only propagate if component's parent in the component hierarchy doesn't have draft/publish
    // This matches discardDraft() behavior via shouldPropagateComponentRelationToNewVersion
    //
    // The logic: find what contains this component instance (could be a content type or another component).
    // If it's a component, recursively check its parents. If any parent in the chain has DP, filter out the relation.
    const filteredComponentRelations = await Promise.all(
      componentRelations.map(async (relation) => {
        const componentId = relation[componentIdColumn];
        const componentType = relation[componentTypeColumn];
        const entityId = relation[entityIdColumn];

        const componentSchema = strapi.components[
          componentType as keyof typeof strapi.components
        ] as any;

        if (!componentSchema) {
          debug(
            `[copyComponentRelations] ${uid}: Keeping relation - unknown component type ${componentType} (entity: ${entityId}, componentId: ${componentId})`
          );
          return relation;
        }

        const componentParent = await findComponentParentInstance(
          trx,
          identifiers,
          componentSchema.uid,
          componentId,
          uid,
          componentHierarchyCaches
        );

        if (!componentParent) {
          debug(
            `[copyComponentRelations] ${uid}: Keeping relation - component ${componentType} (id: ${componentId}) is directly on entity ${entityId} (no nested parent found)`
          );
          return relation;
        }

        debug(
          `[copyComponentRelations] ${uid}: Component ${componentType} (id: ${componentId}, entity: ${entityId}) has parent in hierarchy: ${componentParent.uid} (parentId: ${componentParent.parentId})`
        );

        const hasDPParent = await hasDraftPublishAncestorForParent(
          trx,
          identifiers,
          componentParent,
          componentHierarchyCaches
        );

        if (hasDPParent) {
          debug(
            `[copyComponentRelations] Filtering: component ${componentType} (id: ${componentId}, entity: ${entityId}) has DP parent in hierarchy (${componentParent.uid})`
          );
          return null;
        }

        debug(
          `[copyComponentRelations] ${uid}: Keeping relation - component ${componentType} (id: ${componentId}, entity: ${entityId}) has no DP parent in hierarchy`
        );

        return relation;
      })
    );

    // Filter out null values (filtered relations)
    const relationsToProcess = filteredComponentRelations.filter(Boolean) as Array<
      Record<string, any>
    >;

    const filteredCount = componentRelations.length - relationsToProcess.length;
    if (filteredCount > 0) {
      debug(
        `[copyComponentRelations] ${uid}: Filtered ${filteredCount} of ${componentRelations.length} component relations (removed ${filteredCount} with DP parents)`
      );
    }

    // Create new component relations for draft entries
    // Remove the 'id' field to avoid duplicate key errors
    const mappedRelations = (
      await Promise.all(
        relationsToProcess.map(async (relation) => {
          const newEntityId = getMappedValue(publishedToDraftMap, relation[entityIdColumn]);

          if (!newEntityId) {
            return null;
          }

          const componentId = relation[componentIdColumn];
          const componentType = relation[componentTypeColumn];
          const componentKey = `${componentId}:${newEntityId}`;

          let cloneMap = componentCloneCache.get(componentType);
          if (!cloneMap) {
            cloneMap = new Map();
            componentCloneCache.set(componentType, cloneMap);
          }

          let newComponentId = cloneMap.get(componentKey);

          if (!newComponentId) {
            newComponentId = await cloneComponentInstance({
              trx,
              componentUid: componentType,
              componentId: Number(componentId),
              parentUid: uid,
              parentPublishedToDraftMap: publishedToDraftMap,
              draftMapCache: componentTargetDraftMapCache,
            });

            cloneMap.set(componentKey, newComponentId);
          }

          const { id, ...relationWithoutId } = relation;
          return {
            ...relationWithoutId,
            [entityIdColumn]: newEntityId,
            [componentIdColumn]: newComponentId,
          };
        })
      )
    ).filter(Boolean) as Array<Record<string, any>>;

    // Deduplicate relations based on the unique constraint columns
    // This prevents duplicates within the same batch that could cause conflicts
    const uniqueKeyMap = new Map<string, Record<string, any>>();
    for (const relation of mappedRelations) {
      const uniqueKey = `${relation[entityIdColumn]}_${relation[componentIdColumn]}_${relation[fieldColumn]}_${relation[componentTypeColumn]}`;
      if (!uniqueKeyMap.has(uniqueKey)) {
        uniqueKeyMap.set(uniqueKey, relation);
      }
    }
    const deduplicatedRelations = Array.from(uniqueKeyMap.values());

    if (deduplicatedRelations.length === 0) {
      continue;
    }

    // Check which relations already exist in the database to avoid conflicts
    // We need to check all unique constraint columns (entity_id, cmp_id, field, component_type)
    // Batch the check to avoid SQLite expression tree depth limits
    // Use smaller batches for OR queries (50 for SQLite, 100 for others)
    const batchSize = getBatchSize(trx, 50);
    const relationChunks = chunkArray(deduplicatedRelations, batchSize);
    const existingKeys = new Set<string>();

    for (const relationChunk of relationChunks) {
      const existingRelations = await trx(joinTableName)
        .select([entityIdColumn, componentIdColumn, fieldColumn, componentTypeColumn])
        .where((qb) => {
          // Build OR conditions for each relation in this chunk
          for (const relation of relationChunk) {
            qb.orWhere((subQb) => {
              subQb
                .where(entityIdColumn, relation[entityIdColumn])
                .where(componentIdColumn, relation[componentIdColumn])
                .where(fieldColumn, relation[fieldColumn])
                .where(componentTypeColumn, relation[componentTypeColumn]);
            });
          }
        });

      // Add existing relation keys to the set
      for (const existing of existingRelations) {
        const key = `${existing[entityIdColumn]}_${existing[componentIdColumn]}_${existing[fieldColumn]}_${existing[componentTypeColumn]}`;
        existingKeys.add(key);
      }
    }

    // Filter out relations that already exist
    const newComponentRelations = deduplicatedRelations.filter((relation) => {
      const key = `${relation[entityIdColumn]}_${relation[componentIdColumn]}_${relation[fieldColumn]}_${relation[componentTypeColumn]}`;
      return !existingKeys.has(key);
    });

    if (newComponentRelations.length > 0) {
      // Insert component relations while surfacing unexpected constraint issues.
      // Use INSERT ... ON CONFLICT DO NOTHING (PostgreSQL) or catch duplicate key errors explicitly for other clients.
      const client = trx.client.config.client;

      if (client === 'postgres' || client === 'pg') {
        // PostgreSQL: Insert one at a time with ON CONFLICT DO NOTHING
        // Use raw SQL for more reliable conflict handling
        let insertedCount = 0;
        let skippedCount = 0;
        for (const relation of newComponentRelations) {
          try {
            // Use raw SQL - ?? is for identifiers, ? is for values in Knex
            const orderValue = relation[orderColumn] ?? null;

            await trx.raw(
              `INSERT INTO ?? (??, ??, ??, ??, ??) VALUES (?, ?, ?, ?, ?) 
               ON CONFLICT (??, ??, ??, ??) DO NOTHING`,
              [
                joinTableName,
                entityIdColumn,
                componentIdColumn,
                fieldColumn,
                componentTypeColumn,
                orderColumn,
                relation[entityIdColumn],
                relation[componentIdColumn],
                relation[fieldColumn],
                relation[componentTypeColumn],
                orderValue,
                entityIdColumn,
                componentIdColumn,
                fieldColumn,
                componentTypeColumn,
              ]
            );
            insertedCount += 1;
          } catch (error: any) {
            // Ignore duplicate key errors (PostgreSQL error code 23505)
            // This can happen if the record already exists in the database
            if (error.code !== '23505' && !error.message?.includes('duplicate key')) {
              throw error;
            } else {
              skippedCount += 1;
            }
          }
        }
        if (insertedCount > 0 || skippedCount > 0) {
          debug(
            `[copyComponentRelations] ${uid}: Inserted ${insertedCount} component relations, skipped ${skippedCount} duplicates`
          );
        }
      } else if (client === 'mysql' || client === 'mysql2') {
        try {
          await trx(joinTableName).insert(newComponentRelations);
        } catch (error: any) {
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }

          for (const relation of newComponentRelations) {
            try {
              await trx(joinTableName).insert(relation);
            } catch (err: any) {
              if (err.code !== 'ER_DUP_ENTRY') {
                throw err;
              }
            }
          }
        }
      } else {
        // SQLite: Try to insert and ignore errors
        for (const relation of newComponentRelations) {
          try {
            await trx(joinTableName).insert(relation);
          } catch (error: any) {
            // Ignore duplicate key errors
            if (error.code !== 'SQLITE_CONSTRAINT_UNIQUE' && error.code !== '23505') {
              throw error;
            }
          }
        }
      }
    }
  }
}

/**
 * 2 pass migration to create the draft entries for all the published entries.
 * And then copy relations directly using database queries.
 */
const migrateUp = async (trx: Knex, db: Database) => {
  strapi.log.info('[discard-drafts] Migration started');
  const dpModels = [];
  for (const meta of db.metadata.values()) {
    const hasDP = await hasDraftAndPublish(trx, meta);
    if (hasDP) {
      dpModels.push(meta);
    }
  }

  debug(`Found ${dpModels.length} draft/publish content types to process`);

  /**
   * Create plain draft entries for all the entries that were published.
   */
  strapi.log.info('[discard-drafts] Stage 1/3 – cloning published entries into draft rows');
  for (const model of dpModels) {
    debug(` • cloning scalars for ${model.uid}`);
    await copyPublishedEntriesToDraft({ db, trx, uid: model.uid });
  }
  strapi.log.info('[discard-drafts] Stage 1/3 complete');

  /**
   * Copy relations from published entries to draft entries using direct database queries.
   * This is much more efficient than calling discardDraft for each entry.
   */
  strapi.log.info('[discard-drafts] Stage 2/3 – copying relations and components to drafts');
  for (const model of dpModels) {
    debug(` • copying relations for ${model.uid}`);
    await copyRelationsToDrafts({ db, trx, uid: model.uid });
  }
  flushSkippedRelationLogs();
  strapi.log.info('[discard-drafts] Stage 2/3 complete');

  /**
   * Update JoinColumn relations (foreign keys) to point to draft versions
   * This matches discard() behavior: drafts relate to drafts
   */
  strapi.log.info('[discard-drafts] Stage 3/3 – updating foreign key references to draft targets');
  for (const model of dpModels) {
    debug(` • updating join columns for ${model.uid}`);
    await updateJoinColumnRelations({ db, trx, uid: model.uid });
  }
  strapi.log.info('[discard-drafts] Stage 3/3 complete');

  strapi.log.info('[discard-drafts] Migration completed successfully');
};

/**
 * Load a batch of versions to discard.
 *
 * Versions with only a draft version will be ignored.
 * Only versions with a published version (which always have a draft version) will be discarded.
 */
export async function* getBatchToDiscard({
  db,
  trx,
  uid,
  defaultBatchSize = 1000,
}: {
  db: Database;
  trx: Knex;
  uid: string;
  defaultBatchSize?: number;
}) {
  const client = db.config.connection.client;
  const isSQLite =
    typeof client === 'string' && ['sqlite', 'sqlite3', 'better-sqlite3'].includes(client);

  // The SQLite documentation states that the maximum number of terms in a
  // compound SELECT statement is 500 by default.
  // See: https://www.sqlite.org/limits.html
  // To ensure a successful migration, we limit the batch size to 500 for SQLite.
  const batchSize = isSQLite ? Math.min(defaultBatchSize, 500) : defaultBatchSize;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // Look for the published entries to discard
    const batch: DocumentVersion[] = await db
      .queryBuilder(uid)
      .select(['id', 'documentId', 'locale'])
      .where({ publishedAt: { $ne: null } })
      .limit(batchSize)
      .offset(offset)
      .orderBy('id')
      .transacting(trx)
      .execute();

    if (batch.length < batchSize) {
      hasMore = false;
    }

    offset += batchSize;
    yield batch;
  }
}

export const discardDocumentDrafts: Migration = {
  name: 'core::5.0.0-discard-drafts',
  async up(trx, db) {
    await migrateUp(trx, db);
  },
  async down() {
    throw new Error('not implemented');
  },
};

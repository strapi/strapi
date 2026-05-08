import { keyBy, omit } from 'lodash/fp';
import type { UID, Schema } from '@strapi/types';
import type { JoinTable } from '@strapi/database';

interface LoadContext {
  oldVersions: { id: string; locale: string }[];
  newVersions: { id: string; locale: string }[];
}

interface RelationEntry {
  joinTable: JoinTable;
  relations: Record<string, unknown>[];
  /** FK column for the entity being published */
  entityColumn: string;
  /** FK column for the related entity */
  relatedColumn: string;
}

/** Draft id → published id for rows that already have a published counterpart (same document_id + locale). */
const draftToPublishedMap = async (trx: any, tableName: string, rowIds: unknown[]) => {
  const uniqueIds = [...new Set(rowIds)];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const draftEntries = await strapi.db
    .getConnection()
    .select('id', 'document_id', 'locale')
    .from(tableName)
    .whereIn('id', uniqueIds as any)
    .transacting(trx);

  if (draftEntries.length === 0) {
    return new Map<string, string>();
  }

  const pubEntries = await strapi.db
    .getConnection()
    .select('id', 'document_id', 'locale')
    .from(tableName)
    .whereNotNull('published_at')
    .whereIn(
      'document_id',
      draftEntries.map((e: any) => e.document_id)
    )
    .transacting(trx);

  const pubByDocLocale = new Map(
    pubEntries.map((e: any) => [`${e.document_id}_${e.locale}`, e.id])
  );

  const map = new Map<string, string>();
  for (const d of draftEntries) {
    const pubId = pubByDocLocale.get(`${d.document_id}_${d.locale}`);
    if (pubId) {
      map.set(String(d.id), String(pubId));
    }
  }
  return map;
};

const remapRelatedIds = (rows: any[], relatedCol: string, idMap: Map<string, string>) =>
  rows.map((row) => {
    const next = idMap.get(String(row[relatedCol]));
    return next ? { ...row, [relatedCol]: next } : row;
  });

/**
 * Reads join rows tied to the entry being published (`publishedCol` IN draft/old ids) and returns
 * batches for `sync()`. When the FK in `relatedCol` points at a D&P type, maps known draft ids to
 * published ids; otherwise keeps draft ids so sync can still run after both sides exist.
 */
const captureJoinBatches = async (
  trx: any,
  opts: {
    joinTable: any;
    /** Column holding ids of the document being published (the `uid` passed to load). */
    publishedCol: string;
    /** The other FK; may be remapped via draftToPublishedMap. */
    relatedCol: string;
    /** Content type behind `relatedCol` (used for D&P + table name). */
    relatedUid: UID.ContentType;
    relatedHasDraftAndPublish: boolean;
    /** Model that owns this attribute; draft capture is skipped for components. */
    schemaUid: UID.ContentType;
    oldVersions: LoadContext['oldVersions'];
    newVersions: LoadContext['newVersions'];
  }
): Promise<RelationEntry[]> => {
  const {
    joinTable,
    publishedCol,
    relatedCol,
    relatedUid,
    relatedHasDraftAndPublish,
    schemaUid,
    oldVersions,
    newVersions,
  } = opts;

  const batches: RelationEntry[] = [];
  const { name: table } = joinTable;

  const oldIds = oldVersions.map((e) => e.id);
  if (oldIds.length > 0) {
    const existing = await strapi.db
      .getConnection()
      .select('*')
      .from(table)
      .whereIn(publishedCol, oldIds)
      .transacting(trx);
    if (existing.length > 0) {
      batches.push({
        joinTable,
        relations: existing,
        entityColumn: publishedCol,
        relatedColumn: relatedCol,
      });
    }
  }

  if (!strapi.contentTypes[schemaUid]) {
    return batches;
  }

  const oldLocales = new Set(oldVersions.map((e) => e.locale));
  const draftsOnly = newVersions.filter((v) => !oldLocales.has(v.locale));
  if (draftsOnly.length === 0) {
    return batches;
  }

  const draftIds = draftsOnly.map((e) => e.id);
  const draftRows = await strapi.db
    .getConnection()
    .select('*')
    .from(table)
    .whereIn(publishedCol, draftIds)
    .transacting(trx);

  if (draftRows.length === 0) {
    return batches;
  }

  let relations = draftRows;
  if (relatedHasDraftAndPublish) {
    const meta = strapi.db.metadata.get(relatedUid);
    const relatedIds = draftRows.map((r: any) => r[relatedCol]);
    const map = await draftToPublishedMap(trx, meta.tableName, relatedIds);
    relations = remapRelatedIds(draftRows, relatedCol, map);
  }

  batches.push({ joinTable, relations, entityColumn: publishedCol, relatedColumn: relatedCol });
  return batches;
};

/**
 * Loads all bidirectional relations that need to be synchronized when content entries change state
 * (e.g., during publish/unpublish operations).
 *
 * In Strapi, bidirectional relations allow maintaining order from both sides of the relation.
 * When an entry is published, the following occurs:
 *
 * 1. The old published entry is deleted
 * 2. A new entry is created with all its relations
 *
 * This process affects relation ordering in the following way:
 *
 * Initial state (Entry A related to X, Y, Z):
 * ```
 *   Entry A (draft)     Entry A (published)
 *      │                     │
 *      ├──(1)→ X            ├──(1)→ X
 *      ├──(2)→ Y            ├──(2)→ Y
 *      └──(3)→ Z            └──(3)→ Z
 *
 *   X's perspective:         Y's perspective:         Z's perspective:
 *      └──(2)→ Entry A         └──(1)→ Entry A         └──(3)→ Entry A
 * ```
 *
 * After publishing Entry A (without relation order sync):
 * ```
 *   Entry A (draft)     Entry A (new published)
 *      │                     │
 *      ├──(1)→ X            ├──(1)→ X
 *      ├──(2)→ Y            ├──(2)→ Y
 *      └──(3)→ Z            └──(3)→ Z
 *
 *   X's perspective:         Y's perspective:         Z's perspective:
 *      └──(3)→ Entry A         └──(3)→ Entry A         └──(3)→ Entry A
 *                           (all relations appear last in order)
 * ```
 *
 * This module preserves the original ordering from both perspectives by:
 * 1. Capturing the relation order before the entry state changes
 * 2. Restoring this order after the new relations are created
 *
 * @param uid - The unique identifier of the content type being processed
 * @param context - Object containing arrays of old and new entry versions
 * @returns Array of objects containing join table metadata and relations to be updated
 */
const load = async (uid: UID.ContentType, { oldVersions, newVersions }: LoadContext) => {
  const relationsToUpdate: RelationEntry[] = [];

  await strapi.db.transaction(async ({ trx }) => {
    const models = [
      ...(Object.values(strapi.contentTypes) as Schema.ContentType[]),
      ...Object.values(strapi.components),
    ];

    for (const model of models) {
      const dbModel = strapi.db.metadata.get(model.uid);

      for (const attribute of Object.values(dbModel.attributes) as Record<string, any>[]) {
        const joinTable = attribute.joinTable;

        if (attribute.type !== 'relation' || !joinTable) {
          continue;
        }

        if (!(attribute.inversedBy || attribute.mappedBy)) {
          continue;
        }

        // Owning side: e.g. Author.articles when publishing an Author.
        const isOwningSide =
          !!attribute.inversedBy &&
          model.uid === uid &&
          attribute.relation === 'manyToMany' &&
          model.uid !== attribute.target;

        // Inverse side: e.g. Article.authors when publishing an Article.
        const isInverseSide = attribute.target === uid && model.uid !== uid;

        if (!isOwningSide && !isInverseSide) {
          continue;
        }

        // Direction determines which join column belongs to the entity being published
        const publishedCol = isOwningSide
          ? joinTable.joinColumn.name
          : joinTable.inverseJoinColumn.name;
        const relatedCol = isOwningSide
          ? joinTable.inverseJoinColumn.name
          : joinTable.joinColumn.name;

        const relatedUid = (isOwningSide ? attribute.target : model.uid) as UID.ContentType;

        const batches = await captureJoinBatches(trx, {
          joinTable,
          publishedCol,
          relatedCol,
          relatedUid,
          relatedHasDraftAndPublish: isOwningSide
            ? !!strapi.contentTypes[relatedUid]?.options?.draftAndPublish
            : !!model.options?.draftAndPublish,
          schemaUid: model.uid as UID.ContentType,
          oldVersions,
          newVersions,
        });
        relationsToUpdate.push(...batches);
      }
    }
  });

  return relationsToUpdate;
};

/**
 * Synchronizes the order of bidirectional relations after content entries have changed state.
 *
 * When entries change state (e.g., draft → published), their IDs change and all relations are recreated.
 * While the order of relations from the entry's perspective is maintained (as they're created in order),
 * the inverse relations (from related entries' perspective) would all appear last in order since they're new.
 *
 * Example:
 * ```
 * Before publish:
 *   Article(id:1) →(order:1)→ Category(id:5)
 *   Category(id:5) →(order:3)→ Article(id:1)
 *
 * After publish (without sync):
 *   Article(id:2) →(order:1)→ Category(id:5)    [order preserved]
 *   Category(id:5) →(order:99)→ Article(id:2)   [order lost - appears last]
 *
 * After sync:
 *   Article(id:2) →(order:1)→ Category(id:5)    [order preserved]
 *   Category(id:5) →(order:3)→ Article(id:2)    [order restored]
 * ```
 *
 * @param oldEntries - Array of previous entry versions with their IDs and locales
 * @param newEntries - Array of new entry versions with their IDs and locales
 * @param existingRelations - Array of join table data containing the relations to be updated
 */
const sync = async (
  oldEntries: { id: string; locale: string }[],
  newEntries: { id: string; locale: string }[],
  existingRelations: RelationEntry[]
) => {
  const newEntriesByLocale = keyBy('locale', newEntries);

  const entryIdMapping = oldEntries.reduce(
    (acc, oldEntry) => {
      const newEntry = newEntriesByLocale[oldEntry.locale];
      if (!newEntry) {
        return acc;
      }
      acc[oldEntry.id] = newEntry.id;
      return acc;
    },
    {} as Record<string, string>
  );

  const republishedEntryIds = new Set(newEntries.map((e) => String(e.id)));
  const isRepublishedEntry = (id: string | number) => republishedEntryIds.has(String(id));

  await strapi.db.transaction(async ({ trx }) => {
    for (const {
      joinTable,
      relations,
      entityColumn: sourceColumn,
      relatedColumn: targetColumn,
    } of existingRelations) {
      const orderColumn = joinTable.orderColumnName;

      // Failsafe in case those don't exist
      if (!sourceColumn || !targetColumn || !orderColumn) {
        continue;
      }

      const mappedRelations = relations
        .map((relation) => ({
          relation,
          oldSourceId: relation[sourceColumn] as string,
          targetId: relation[targetColumn] as string,
          originalOrder: relation[orderColumn],
          newSourceId: entryIdMapping[relation[sourceColumn] as string],
        }))
        .filter((r): r is typeof r & { newSourceId: string } => Boolean(r.newSourceId));

      if (!mappedRelations.length) continue;

      const newSourceIds = mappedRelations.map((r) => r.newSourceId);

      // Batch UPDATE: set each row's order in a single statement using CASE
      const caseFragments = mappedRelations.map(() => `WHEN ?? = ? AND ?? = ? THEN ?`);
      const caseBindings = mappedRelations.flatMap(({ newSourceId, targetId, originalOrder }) => [
        sourceColumn,
        newSourceId,
        targetColumn,
        targetId,
        originalOrder,
      ]);

      await trx(joinTable.name)
        .whereIn(sourceColumn, newSourceIds)
        .update({
          [orderColumn]: trx.raw(`CASE ${caseFragments.join(' ')} ELSE ?? END`, [
            ...caseBindings,
            orderColumn,
          ]),
        });

      // Batch SELECT: find which rows exist so we know what to insert
      const existingRows = await trx(joinTable.name)
        .whereIn(sourceColumn, newSourceIds)
        .select(sourceColumn, targetColumn);

      const existingSet = new Set(
        existingRows.map((r: Record<string, unknown>) => `${r[sourceColumn]}:${r[targetColumn]}`)
      );

      // Batch INSERT: insert cascade-deleted rows that aren't from republished sources
      const toInsert = mappedRelations
        .filter(
          ({ newSourceId, targetId }) =>
            !existingSet.has(`${newSourceId}:${targetId}`) && !isRepublishedEntry(newSourceId)
        )
        .map(({ relation, newSourceId, originalOrder }) => ({
          ...omit(strapi.db.metadata.identifiers.ID_COLUMN, relation),
          [sourceColumn]: newSourceId,
          [orderColumn]: originalOrder,
        }));

      if (toInsert.length) {
        const batchSize = strapi.db.dialect.getBatchInsertSize();
        await trx.batchInsert(joinTable.name, toInsert, batchSize);
      }
    }
  });
};

export { load, sync };

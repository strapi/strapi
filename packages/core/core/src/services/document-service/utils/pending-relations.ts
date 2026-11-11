/* eslint-disable no-continue */
import { chunk, groupBy, uniqBy } from 'lodash';

import { contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Data, Schema, UID } from '@strapi/types';
import type { Model } from '@strapi/database';

import {
  getComponentJoinColumnEntityName,
  getComponentJoinColumnInverseName,
  getComponentJoinTableName,
  getComponentTypeColumn,
} from '../../../utils/transform-content-types-to-models';
import { findComponentParent, getParentSchemasForComponent } from '../components';

/**
 * Publishing an entry (the root) drops its links to entries that have no published version.
 * Each dropped link is recorded in `strapi_pending_relations`, so that it can be restored when
 * the target gets published, but only if the last publish of the root had the link.
 *
 * A record describes the published row that lost the link (the published row of the root or one
 * of its published component instances), the relation attribute, and the target document.
 *
 * Bidirectional relations, and relations of a content type to itself, are restored by
 * `bidirectional-relations.ts` and `self-referential-relations.ts` instead.
 */

const PENDING_RELATION_UID = 'strapi::pending-relation';

const pendingRelationModel: Model = {
  uid: PENDING_RELATION_UID,
  singularName: 'strapi_pending_relations',
  tableName: 'strapi_pending_relations',
  attributes: {
    id: { type: 'increments' },
    rootUid: { type: 'string' },
    rootDocumentId: { type: 'string' },
    rootLocale: { type: 'string' },
    sourceUid: { type: 'string' },
    sourceId: { type: 'integer' },
    field: { type: 'string' },
    targetUid: { type: 'string' },
    targetDocumentId: { type: 'string' },
    targetLocale: { type: 'string' },
    afterDocumentId: { type: 'string' },
    afterLocale: { type: 'string' },
    createdAt: { type: 'datetime' },
  },
  indexes: [
    {
      name: 'strapi_pending_relations_target_idx',
      columns: ['target_uid', 'target_document_id', 'target_locale'],
    },
    {
      name: 'strapi_pending_relations_root_idx',
      columns: ['root_uid', 'root_document_id', 'root_locale'],
    },
  ],
};

interface VersionEntry {
  id: Data.ID;
  documentId?: string;
  locale?: string | null;
}

interface PendingRelation {
  rootUid: string;
  rootDocumentId: string;
  rootLocale: string | null;
  sourceUid: string;
  sourceId: Data.ID;
  field: string;
  targetUid: string;
  targetDocumentId: string;
  targetLocale: string | null;
  afterDocumentId: string | null;
  afterLocale: string | null;
  createdAt: Date;
}

interface RootRef {
  uid: string;
  documentId: string;
  locale: string | null;
}

type JoinRow = Record<string, any>;
type SourceModel = Schema.ContentType | Schema.Component;
type SourcePair = {
  model: SourceModel;
  draftId: Data.ID;
  publishedId: Data.ID;
  root: RootRef;
  /**
   * The published row inherited its non-localized component fields from a sibling locale instead
   * of this draft, so the draft's components say nothing about what the published row had.
   */
  inheritsComponents?: boolean;
};

const LOOKUP_BATCH_SIZE = 500;

const isAnyToOne = (attribute: { relation?: string }) =>
  attribute.relation === 'oneToOne' || attribute.relation === 'manyToOne';

const pendingRelations = () => strapi.db.query(PENDING_RELATION_UID as any);

const selectInBatches = async (
  trx: any,
  tableName: string,
  column: string,
  values: unknown[],
  columns: string[],
  orderBy?: string[]
) => {
  const rows: JoinRow[] = [];
  for (const batch of chunk(uniqBy(values, String), LOOKUP_BATCH_SIZE)) {
    let qb = strapi.db
      .getConnection()
      .select(columns)
      .from(tableName)
      .whereIn(column, batch as Data.ID[]);
    if (orderBy) {
      qb = qb.orderBy(orderBy);
    }
    rows.push(...(await qb.transacting(trx)));
  }
  return rows;
};

/**
 * The relation attributes the records cover: unidirectional relations with a join table to
 * content types with draft and publish.
 * Relations of a root content type to its own content type are left to the self-referential
 * relations. Relations of components may target any content type.
 */
const getRelationAttributes = (model: SourceModel, excludedTarget?: string) => {
  const dbModel = strapi.db.metadata.get(model.uid);

  return (Object.entries(dbModel.attributes) as [string, any][]).filter(([, attribute]) => {
    if (
      attribute.type !== 'relation' ||
      !attribute.joinTable ||
      attribute.inversedBy ||
      attribute.mappedBy ||
      String(attribute.relation).startsWith('morph')
    ) {
      return false;
    }

    const target = strapi.contentTypes[attribute.target as UID.ContentType];
    if (!target || !contentTypesUtils.hasDraftAndPublish(target)) {
      return false;
    }

    return attribute.target !== excludedTarget;
  });
};

/**
 * Whether a root attribute is copied from a sibling locale when a locale is first published:
 * components and dynamic zones that are not localized. Relations are always localized.
 */
const isInheritedAttribute = (model: SourceModel, field: string) => {
  const attribute = (model.attributes as Record<string, any>)[field];

  return (
    (attribute?.type === 'component' || attribute?.type === 'dynamiczone') &&
    attribute?.pluginOptions?.i18n?.localized !== true
  );
};

const analysisCaches = new WeakMap<
  object,
  { roots: Map<string, boolean>; targets: Map<string, boolean> }
>();

const getCaches = () => {
  let caches = analysisCaches.get(strapi.db);
  if (!caches) {
    caches = { roots: new Map(), targets: new Map() };
    analysisCaches.set(strapi.db, caches);
  }
  return caches;
};

/**
 * Whether the content type, or a component reachable from it, has a relation the records cover.
 * Schemas are fixed after bootstrap, so the answer is cached.
 */
const hasRecordableRelations = (uid: string): boolean => {
  const { roots } = getCaches();
  const cached = roots.get(uid);
  if (cached !== undefined) {
    return cached;
  }

  const visited = new Set<string>();
  const visit = (model: SourceModel): boolean => {
    if (visited.has(model.uid)) {
      return false;
    }
    visited.add(model.uid);

    if (
      getRelationAttributes(model, model.modelType === 'contentType' ? model.uid : undefined)
        .length > 0
    ) {
      return true;
    }

    return Object.values(model.attributes as Record<string, any>).some((attribute) => {
      let uids: string[] = [];
      if (attribute.type === 'component') {
        uids = [attribute.component];
      } else if (attribute.type === 'dynamiczone') {
        uids = attribute.components;
      }
      return uids.some((componentUid) => {
        const component = strapi.components[componentUid as UID.Component];
        return component ? visit(component) : false;
      });
    });
  };

  const contentType = strapi.contentTypes[uid as UID.ContentType];
  const result = contentType ? visit(contentType) : false;
  roots.set(uid, result);
  return result;
};

/**
 * Whether any model has a relation the records cover that targets the content type.
 */
const isRecordableTarget = (uid: string): boolean => {
  const { targets } = getCaches();
  const cached = targets.get(uid);
  if (cached !== undefined) {
    return cached;
  }

  const models = [
    ...(Object.values(strapi.contentTypes) as Schema.ContentType[]).filter(
      (contentType) => contentType.uid !== uid && contentTypesUtils.hasDraftAndPublish(contentType)
    ),
    ...(Object.values(strapi.components) as Schema.Component[]),
  ];
  const result = models.some((model) =>
    getRelationAttributes(model).some(([, attribute]) => attribute.target === uid)
  );
  targets.set(uid, result);
  return result;
};

/**
 * Pairs the component instances of the draft with the instances created from them when
 * publishing. Both hold the same components in the same order, so they are paired by position
 * in each field of the `_cmps` join tables.
 * Returns the root pairs followed by the pairs of their components, at any depth.
 */
const collectSourcePairs = async (trx: any, rootPairs: SourcePair[]) => {
  const { identifiers } = strapi.db.metadata;
  const entityColumn = getComponentJoinColumnEntityName(identifiers);
  const componentColumn = getComponentJoinColumnInverseName(identifiers);
  const typeColumn = getComponentTypeColumn(identifiers);
  const { FIELD_COLUMN: fieldColumn, ORDER_COLUMN: orderColumn, ID_COLUMN: idColumn } = identifiers;

  const all = [...rootPairs];
  let level = rootPairs;

  while (level.length > 0) {
    const next: SourcePair[] = [];

    for (const group of Object.values(groupBy(level, (pair) => pair.model.uid))) {
      const { model } = group[0];
      if (!model.collectionName) continue;

      const joinTableName = getComponentJoinTableName(model.collectionName, identifiers);
      if (!strapi.db.metadata.has(joinTableName)) continue;

      const rows = await selectInBatches(
        trx,
        joinTableName,
        entityColumn,
        group.flatMap((pair) => [pair.draftId, pair.publishedId]),
        [entityColumn, componentColumn, typeColumn, fieldColumn],
        [orderColumn, idColumn]
      );
      const rowsByEntity = groupBy(rows, (row) => String(row[entityColumn]));

      for (const pair of group) {
        const draftRows = rowsByEntity[String(pair.draftId)] ?? [];
        const publishedRows = rowsByEntity[String(pair.publishedId)] ?? [];

        for (const field of new Set(draftRows.map((row) => row[fieldColumn]))) {
          if (pair.inheritsComponents && isInheritedAttribute(pair.model, field as string)) {
            continue;
          }

          const draftField = draftRows.filter((row) => row[fieldColumn] === field);
          const publishedField = publishedRows.filter((row) => row[fieldColumn] === field);

          if (draftField.length !== publishedField.length) continue;

          draftField.forEach((draftRow, index) => {
            const publishedRow = publishedField[index];
            const component = strapi.components[draftRow[typeColumn] as UID.Component];

            if (component && draftRow[typeColumn] === publishedRow[typeColumn]) {
              next.push({
                model: component,
                draftId: draftRow[componentColumn],
                publishedId: publishedRow[componentColumn],
                root: pair.root,
              });
            }
          });
        }
      }
    }

    all.push(...next);
    level = next;
  }

  return all;
};

/**
 * Reads the document id and locale of entries by id.
 */
const getDocuments = async (trx: any, tableName: string, ids: unknown[]) => {
  const rows = await selectInBatches(trx, tableName, 'id', ids, [
    'id',
    'document_id',
    'locale',
    'published_at',
  ]);
  return new Map(rows.map((row) => [String(row.id), row]));
};

const localesScope = (locales: Array<string | null | undefined>) => {
  const concrete = locales.filter((locale): locale is string => locale != null);
  return concrete.length > 0 && concrete.length === locales.length ? concrete : undefined;
};

/**
 * Removes the records of the given roots, to be called when their published versions are
 * replaced or removed.
 */
const removeRecordsOfRoot = async (
  uid: string,
  documentId: string,
  locales: Array<string | null | undefined>
) => {
  if (!hasRecordableRelations(uid)) {
    return;
  }

  const scope = localesScope(locales);

  await pendingRelations().deleteMany({
    where: {
      rootUid: uid,
      rootDocumentId: documentId,
      ...(scope && { rootLocale: { $in: scope } }),
    },
  });
};

/**
 * Removes every record about a document, where it is the root or the target.
 * To be called when the document is deleted.
 */
const removeRecordsOfDocument = async (
  uid: string,
  documentId: string,
  locales: Array<string | null | undefined>
) => {
  const scope = localesScope(locales);

  await removeRecordsOfRoot(uid, documentId, locales);

  if (!isRecordableTarget(uid)) {
    return;
  }

  await pendingRelations().deleteMany({
    where: {
      targetUid: uid,
      targetDocumentId: documentId,
      ...(scope && { targetLocale: { $in: scope } }),
    },
  });
};

/**
 * Records the links the new published versions of a document lost, to be called right after
 * they are created. The records of the previous publish of the document are replaced.
 *
 * A draft link is lost when the published source has no link to the published version of the
 * draft link's target. Paired draft and published components are exact here: the published
 * ones were just created from the draft ones.
 */
const record = async (
  uid: UID.ContentType,
  drafts: VersionEntry[],
  publishedEntries: VersionEntry[],
  options: { inheritedLocales?: Array<string | null | undefined> } = {}
) => {
  if (!hasRecordableRelations(uid)) {
    return;
  }

  const contentType = strapi.contentTypes[uid];
  const inheritedLocales = new Set((options.inheritedLocales ?? []).map(String));
  const publishedByLocale = new Map(publishedEntries.map((entry) => [String(entry.locale), entry]));

  const rootPairs = drafts.flatMap((draft): SourcePair[] => {
    const published = publishedByLocale.get(String(draft.locale));
    if (!published) {
      return [];
    }

    return [
      {
        model: contentType,
        draftId: draft.id,
        publishedId: published.id,
        root: {
          uid,
          documentId: String(published.documentId),
          locale: published.locale ?? null,
        },
        inheritsComponents: inheritedLocales.has(String(draft.locale)),
      },
    ];
  });

  if (rootPairs.length === 0) {
    return;
  }

  await removeRecordsOfRoot(
    uid,
    rootPairs[0].root.documentId,
    rootPairs.map((pair) => pair.root.locale)
  );

  await strapi.db.transaction(async ({ trx }) => {
    const sourcePairs = await collectSourcePairs(trx, rootPairs);
    const records: PendingRelation[] = [];
    const now = new Date();

    for (const group of Object.values(groupBy(sourcePairs, (pair) => pair.model.uid))) {
      const { model } = group[0];
      const attributes = getRelationAttributes(
        model,
        model.modelType === 'contentType' ? model.uid : undefined
      );
      const { ID_COLUMN: idColumn } = strapi.db.metadata.identifiers;

      for (const [field, attribute] of attributes) {
        const { joinTable } = attribute;
        const sourceColumn = joinTable.joinColumn.name;
        const targetColumn = joinTable.inverseJoinColumn.name;
        const orderColumn = isAnyToOne(attribute) ? undefined : joinTable.orderColumnName;
        const targetTable = strapi.db.metadata.get(attribute.target).tableName;
        const columns = [sourceColumn, targetColumn, ...(orderColumn ? [orderColumn] : [])];

        const draftRows = await selectInBatches(
          trx,
          joinTable.name,
          sourceColumn,
          group.map((pair) => pair.draftId),
          columns,
          orderColumn ? [orderColumn, idColumn] : [idColumn]
        );
        if (draftRows.length === 0) continue;

        const publishedRows = await selectInBatches(
          trx,
          joinTable.name,
          sourceColumn,
          group.map((pair) => pair.publishedId),
          columns
        );

        const targets = await getDocuments(trx, targetTable, [
          ...draftRows.map((row) => row[targetColumn]),
          ...publishedRows.map((row) => row[targetColumn]),
        ]);
        const draftRowsBySource = groupBy(draftRows, (row) => String(row[sourceColumn]));
        const publishedRowsBySource = groupBy(publishedRows, (row) => String(row[sourceColumn]));

        for (const pair of group) {
          const linkedDocuments = new Set(
            (publishedRowsBySource[String(pair.publishedId)] ?? []).map((row) =>
              String(targets.get(String(row[targetColumn]))?.document_id)
            )
          );

          const links = draftRowsBySource[String(pair.draftId)] ?? [];
          links.forEach((row, index) => {
            const target = targets.get(String(row[targetColumn]));

            if (!target || linkedDocuments.has(String(target.document_id))) {
              return;
            }

            const previous = index > 0 ? targets.get(String(links[index - 1][targetColumn])) : null;

            records.push({
              rootUid: pair.root.uid,
              rootDocumentId: pair.root.documentId,
              rootLocale: pair.root.locale,
              sourceUid: model.uid,
              sourceId: pair.publishedId,
              field,
              targetUid: attribute.target,
              targetDocumentId: target.document_id,
              targetLocale: target.locale ?? null,
              afterDocumentId: orderColumn && previous ? previous.document_id : null,
              afterLocale: orderColumn && previous ? (previous.locale ?? null) : null,
              createdAt: now,
            });
          });
        }
      }
    }

    if (records.length > 0) {
      await pendingRelations().createMany({ data: records });
    }
  });
};

/**
 * Finds the published entry a published component instance belongs to, going up through the
 * parent components. Returns null when it belongs to an entry that is not a published entry of
 * a content type with draft and publish.
 */
const findRootOfComponent = async (
  trx: any,
  component: Schema.Component,
  componentId: Data.ID
): Promise<RootRef | null> => {
  let current = component;
  let currentId = componentId;

  // Components are nested a finite number of levels, the bound only guards against cycles
  for (let depth = 0; depth < 25; depth += 1) {
    const parent = await findComponentParent(
      current,
      currentId,
      getParentSchemasForComponent(current),
      { trx }
    );

    if (!parent) {
      return null;
    }

    const parentSchema = strapi.getModel(parent.uid as UID.Schema);

    if (parentSchema.modelType === 'component') {
      current = parentSchema as Schema.Component;
      currentId = parent.parentId;
      continue;
    }

    if (!contentTypesUtils.hasDraftAndPublish(parentSchema as Schema.ContentType)) {
      return null;
    }

    const rows = await getDocuments(trx, parent.table, [parent.parentId]);
    const row = rows.get(String(parent.parentId));

    return row?.published_at
      ? { uid: parent.uid, documentId: row.document_id, locale: row.locale ?? null }
      : null;
  }

  return null;
};

/**
 * Records the links of published entries that point to the published versions that are about
 * to be deleted by an unpublish, so that publishing the target again restores them.
 * Sources are the published rows of other content types with draft and publish and their
 * published components. The root of a component is found through its parents, so it has to
 * be reachable through the `_cmps` join tables.
 */
const recordIncoming = async (uid: UID.ContentType, publishedVersions: VersionEntry[]) => {
  if (publishedVersions.length === 0 || !isRecordableTarget(uid)) {
    return;
  }

  const targetsById = new Map(publishedVersions.map((entry) => [String(entry.id), entry]));
  const { ID_COLUMN: idColumn } = strapi.db.metadata.identifiers;

  const contentTypes = (Object.values(strapi.contentTypes) as Schema.ContentType[]).filter(
    (contentType) => contentType.uid !== uid && contentTypesUtils.hasDraftAndPublish(contentType)
  );
  const components = Object.values(strapi.components) as Schema.Component[];

  await strapi.db.transaction(async ({ trx }) => {
    const records: PendingRelation[] = [];
    const now = new Date();

    for (const model of [...contentTypes, ...components]) {
      for (const [field, attribute] of getRelationAttributes(model)) {
        if (attribute.target !== uid) continue;

        const { joinTable } = attribute;
        const sourceColumn = joinTable.joinColumn.name;
        const targetColumn = joinTable.inverseJoinColumn.name;
        const orderColumn = isAnyToOne(attribute) ? undefined : joinTable.orderColumnName;

        const incoming = await selectInBatches(
          trx,
          joinTable.name,
          targetColumn,
          [...targetsById.keys()],
          [sourceColumn, targetColumn]
        );
        if (incoming.length === 0) continue;

        const sourceIds = uniqBy(
          incoming.map((row) => row[sourceColumn]),
          String
        );

        const roots = new Map<string, RootRef>();
        if (model.modelType === 'contentType') {
          const sources = await getDocuments(
            trx,
            strapi.db.metadata.get(model.uid).tableName,
            sourceIds
          );
          for (const [id, source] of sources) {
            if (source.published_at) {
              roots.set(id, {
                uid: model.uid,
                documentId: source.document_id,
                locale: source.locale ?? null,
              });
            }
          }
        } else {
          for (const sourceId of sourceIds) {
            const root = await findRootOfComponent(trx, model as Schema.Component, sourceId);
            if (root) {
              roots.set(String(sourceId), root);
            }
          }
        }

        if (roots.size === 0) continue;

        // The links of each source in order, to remember what precedes the incoming link
        const links = await selectInBatches(
          trx,
          joinTable.name,
          sourceColumn,
          [...roots.keys()],
          [sourceColumn, targetColumn],
          orderColumn ? [orderColumn, idColumn] : [idColumn]
        );
        const linksBySource = groupBy(links, (row) => String(row[sourceColumn]));
        const neighbours = orderColumn
          ? await getDocuments(
              trx,
              strapi.db.metadata.get(attribute.target).tableName,
              links.map((row) => row[targetColumn])
            )
          : new Map<string, JoinRow>();

        for (const [sourceId, root] of roots) {
          const sourceLinks = linksBySource[sourceId] ?? [];

          sourceLinks.forEach((row, index) => {
            const target = targetsById.get(String(row[targetColumn]));
            if (!target) return;

            const previous = index > 0 ? sourceLinks[index - 1] : undefined;

            records.push({
              rootUid: root.uid,
              rootDocumentId: root.documentId,
              rootLocale: root.locale,
              sourceUid: model.uid,
              sourceId,
              field,
              targetUid: uid,
              targetDocumentId: String(target.documentId),
              targetLocale: target.locale ?? null,
              afterDocumentId:
                orderColumn && previous
                  ? (neighbours.get(String(previous[targetColumn]))?.document_id ?? null)
                  : null,
              afterLocale:
                orderColumn && previous
                  ? (neighbours.get(String(previous[targetColumn]))?.locale ?? null)
                  : null,
              createdAt: now,
            });
          });
        }
      }
    }

    if (records.length > 0) {
      await pendingRelations().createMany({ data: records });
    }
  });
};

/**
 * Restores the recorded links to the document that was just published, on the published rows
 * that lost them, then deletes the records.
 *
 * - A record whose source row is gone is dropped.
 * - An xToOne relation is left alone when the source already links to another entry.
 * - A link the source already has is not added again.
 * - An xToMany link is inserted after the published version of the entry that preceded it in
 *   the draft when the record was made, or first.
 */
const restore = async (uid: UID.ContentType, publishedEntries: VersionEntry[]) => {
  const publishedIdByKey = new Map(
    publishedEntries.map((entry) => [`${entry.documentId}:${entry.locale ?? ''}`, entry.id])
  );

  if (publishedIdByKey.size === 0 || !isRecordableTarget(uid)) {
    return;
  }

  const records: Array<PendingRelation & { id: Data.ID }> = await pendingRelations().findMany({
    where: {
      targetUid: uid,
      $or: publishedEntries.map((entry) => ({
        targetDocumentId: entry.documentId,
        targetLocale: entry.locale ?? { $null: true },
      })),
    },
    orderBy: { id: 'asc' },
  });

  if (records.length === 0) {
    return;
  }

  const { ID_COLUMN: idColumn } = strapi.db.metadata.identifiers;
  const targetTable = strapi.db.metadata.get(uid).tableName;

  await strapi.db.transaction(async ({ trx }) => {
    for (const pending of records) {
      const publishedId = publishedIdByKey.get(
        `${pending.targetDocumentId}:${pending.targetLocale ?? ''}`
      );
      const attribute =
        publishedId !== undefined && strapi.db.metadata.has(pending.sourceUid)
          ? (strapi.db.metadata.get(pending.sourceUid).attributes[pending.field] as any)
          : undefined;

      if (!attribute?.joinTable) continue;

      const { joinTable } = attribute;
      const sourceColumn = joinTable.joinColumn.name;
      const targetColumn = joinTable.inverseJoinColumn.name;
      const orderColumn = isAnyToOne(attribute) ? undefined : joinTable.orderColumnName;

      const source = await strapi.db
        .getConnection()
        .select(idColumn)
        .from(strapi.db.metadata.get(pending.sourceUid).tableName)
        .where(idColumn, pending.sourceId)
        .first()
        .transacting(trx);
      if (!source) continue;

      const existing: JoinRow[] = await strapi.db
        .getConnection()
        .select([idColumn, targetColumn, ...(orderColumn ? [orderColumn] : [])])
        .from(joinTable.name)
        .where(sourceColumn, pending.sourceId)
        .orderBy(orderColumn ? [orderColumn, idColumn] : [idColumn])
        .transacting(trx);

      if (isAnyToOne(attribute) && existing.length > 0) continue;
      if (existing.some((row) => String(row[targetColumn]) === String(publishedId))) continue;

      const newRow: JoinRow = { [sourceColumn]: pending.sourceId, [targetColumn]: publishedId };

      if (orderColumn) {
        let position = 0;

        if (pending.afterDocumentId) {
          const after = await strapi.db
            .getConnection()
            .select(idColumn)
            .from(targetTable)
            .where('document_id', pending.afterDocumentId)
            .whereNotNull('published_at')
            .modify((qb: any) => {
              if (pending.afterLocale) {
                qb.where('locale', pending.afterLocale);
              } else {
                qb.whereNull('locale');
              }
            })
            .first()
            .transacting(trx);
          const afterIndex = after
            ? existing.findIndex((row) => String(row[targetColumn]) === String(after[idColumn]))
            : -1;
          position = afterIndex + 1;
        }

        // Keep the existing links in order and make room for the new one
        for (const [index, row] of existing.entries()) {
          const order = index < position ? index + 1 : index + 2;
          if (row[orderColumn] !== order) {
            await strapi.db
              .getConnection()(joinTable.name)
              .where(idColumn, row[idColumn])
              .update({ [orderColumn]: order })
              .transacting(trx);
          }
        }
        newRow[orderColumn] = position + 1;
      }

      if (joinTable.inverseOrderColumnName) {
        const max = await strapi.db
          .getConnection()
          .max({ max: joinTable.inverseOrderColumnName })
          .from(joinTable.name)
          .where(targetColumn, publishedId)
          .first()
          .transacting(trx);
        newRow[joinTable.inverseOrderColumnName] = Number(max?.max ?? 0) + 1;
      }

      await strapi.db.getConnection()(joinTable.name).insert(newRow).transacting(trx);
    }

    await pendingRelations().deleteMany({ where: { id: { $in: records.map(({ id }) => id) } } });
  });
};

export {
  pendingRelationModel,
  PENDING_RELATION_UID,
  record,
  recordIncoming,
  restore,
  removeRecordsOfRoot,
  removeRecordsOfDocument,
};

/* eslint-disable no-continue */
import { chunk, groupBy, keyBy, omit, uniqBy } from 'lodash';

import { contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Data, Schema, UID } from '@strapi/types';

import { findPublishedComponentCounterparts } from '../components';
import { getCounterparts } from './counterparts';

interface VersionEntry {
  id: Data.ID;
  locale: string;
}

type JoinRow = Record<string, any>;

const LOOKUP_BATCH_SIZE = 500;

const isAnyToOne = (attribute: { relation?: string }) =>
  attribute.relation === 'oneToOne' || attribute.relation === 'manyToOne';

const selectInBatches = async (
  trx: any,
  tableName: string,
  column: string,
  values: unknown[],
  columns: string[]
) => {
  const rows: JoinRow[] = [];
  for (const batch of chunk(uniqBy(values, String), LOOKUP_BATCH_SIZE)) {
    rows.push(
      ...(await strapi.db
        .getConnection()
        .select(columns)
        .from(tableName)
        .whereIn(column, batch as Data.ID[])
        .transacting(trx))
    );
  }
  return rows;
};

const findCounterpartsInBatches = async (
  trx: any,
  model: Schema.ContentType | Schema.Component,
  ids: unknown[]
) => {
  const counterparts = new Map<string, Data.ID>();
  for (const batch of chunk(uniqBy(ids, String), LOOKUP_BATCH_SIZE)) {
    const found =
      model.modelType === 'component'
        ? await findPublishedComponentCounterparts(model, batch as Data.ID[], trx)
        : Object.entries(
            await getCounterparts(
              trx,
              strapi.db.metadata.get(model.uid).tableName,
              batch,
              'published'
            )
          );

    for (const [draftId, publishedId] of found) {
      counterparts.set(draftId, publishedId);
    }
  }
  return counterparts;
};

/**
 * Renumbers the links of each published source so they follow the order of its draft.
 * Links the draft does not have keep their relative order after the others.
 */
const reorderLikeDrafts = async (
  trx: any,
  uid: UID.ContentType,
  joinTable: any,
  draftSourceByPublishedSource: Map<string, Data.ID>
) => {
  const { orderColumnName } = joinTable;
  const sourceColumn = joinTable.joinColumn.name;
  const targetColumn = joinTable.inverseJoinColumn.name;
  const idColumn = strapi.db.metadata.identifiers.ID_COLUMN;

  const draftRows = await selectInBatches(
    trx,
    joinTable.name,
    sourceColumn,
    [...draftSourceByPublishedSource.values()],
    [idColumn, sourceColumn, targetColumn, orderColumnName]
  );
  const publishedTargets = new Map<string, Data.ID>();
  for (const batch of chunk(
    uniqBy(
      draftRows.map((row) => row[targetColumn]),
      String
    ),
    LOOKUP_BATCH_SIZE
  )) {
    const found = await getCounterparts(
      trx,
      strapi.db.metadata.get(uid).tableName,
      batch,
      'published'
    );
    for (const [draftId, publishedId] of Object.entries(found)) {
      publishedTargets.set(draftId, publishedId);
    }
  }
  const publishedRows = await selectInBatches(
    trx,
    joinTable.name,
    sourceColumn,
    [...draftSourceByPublishedSource.keys()],
    [idColumn, sourceColumn, targetColumn, orderColumnName]
  );

  const byOrder = (a: JoinRow, b: JoinRow) =>
    (a[orderColumnName] ?? 0) - (b[orderColumnName] ?? 0) || a[idColumn] - b[idColumn];
  const draftRowsBySource = groupBy(draftRows, (row) => String(row[sourceColumn]));
  const publishedRowsBySource = groupBy(publishedRows, (row) => String(row[sourceColumn]));

  for (const [publishedSource, draftSource] of draftSourceByPublishedSource) {
    const draftPosition = new Map<string, number>();
    for (const [index, row] of (draftRowsBySource[String(draftSource)] ?? [])
      .sort(byOrder)
      .entries()) {
      const publishedTarget = publishedTargets.get(String(row[targetColumn]));
      if (publishedTarget !== undefined) {
        draftPosition.set(String(publishedTarget), index);
      }
    }
    const position = (row: JoinRow) =>
      draftPosition.get(String(row[targetColumn])) ?? Number.MAX_SAFE_INTEGER;

    const rows = (publishedRowsBySource[publishedSource] ?? [])
      .sort(byOrder)
      .sort((a, b) => position(a) - position(b));

    for (const [index, row] of rows.entries()) {
      if (row[orderColumnName] !== index + 1) {
        await strapi.db
          .getConnection()(joinTable.name)
          .where(idColumn, row[idColumn])
          .update({ [orderColumnName]: index + 1 })
          .transacting(trx);
      }
    }
  }
};

/**
 * Publishing an entry drops its relations to entries that have no published version yet.
 * When such a target is published, this adds the link to the published version of every
 * draft and publish entry whose draft still has it, including links from its components.
 *
 * Bidirectional relations are restored by `bidirectionalRelations`, and relations of the
 * published content type to itself by `selfReferentialRelations`.
 *
 * An xToOne relation is left alone when the published version already links to another entry.
 */
const restore = async (
  uid: UID.ContentType,
  drafts: VersionEntry[],
  publishedEntries: VersionEntry[]
) => {
  const publishedByLocale = keyBy(publishedEntries, 'locale');
  const publishedTargetByDraftId = new Map<string, Data.ID>();
  for (const draft of drafts) {
    const published = publishedByLocale[draft.locale];
    if (published) {
      publishedTargetByDraftId.set(String(draft.id), published.id);
    }
  }

  if (publishedTargetByDraftId.size === 0) {
    return;
  }

  const contentTypes = (Object.values(strapi.contentTypes) as Schema.ContentType[]).filter(
    (contentType) => contentType.uid !== uid && contentTypesUtils.hasDraftAndPublish(contentType)
  );
  const components = Object.values(strapi.components) as Schema.Component[];

  await strapi.db.transaction(async ({ trx }) => {
    for (const model of [...contentTypes, ...components]) {
      const dbModel = strapi.db.metadata.get(model.uid);

      for (const attribute of Object.values(dbModel.attributes) as any[]) {
        if (
          attribute.type !== 'relation' ||
          attribute.target !== uid ||
          attribute.inversedBy ||
          attribute.mappedBy ||
          !attribute.joinTable
        ) {
          continue;
        }

        const { joinTable } = attribute;
        const sourceColumn = joinTable.joinColumn.name;
        const targetColumn = joinTable.inverseJoinColumn.name;

        const draftRelations = await selectInBatches(
          trx,
          joinTable.name,
          targetColumn,
          [...publishedTargetByDraftId.keys()],
          ['*']
        );

        if (draftRelations.length === 0) {
          continue;
        }

        const publishedSources = await findCounterpartsInBatches(
          trx,
          model,
          draftRelations.map((relation) => relation[sourceColumn])
        );

        if (publishedSources.size === 0) {
          continue;
        }

        const draftSourceByPublishedSource = new Map<string, Data.ID>();
        const relations = draftRelations.flatMap((relation): JoinRow[] => {
          const source = publishedSources.get(String(relation[sourceColumn]));
          const target = publishedTargetByDraftId.get(String(relation[targetColumn]));

          if (source === undefined || target === undefined) {
            return [];
          }

          draftSourceByPublishedSource.set(String(source), relation[sourceColumn]);
          return [
            {
              ...omit(relation, strapi.db.metadata.identifiers.ID_COLUMN),
              [sourceColumn]: source,
              [targetColumn]: target,
            },
          ];
        });

        const existingRelations = await selectInBatches(
          trx,
          joinTable.name,
          sourceColumn,
          relations.map((relation) => relation[sourceColumn]),
          [sourceColumn, targetColumn]
        );

        const linkKey = (relation: JoinRow) =>
          isAnyToOne(attribute)
            ? String(relation[sourceColumn])
            : `${String(relation[sourceColumn])}:${String(relation[targetColumn])}`;

        const linked = new Set(existingRelations.map(linkKey));
        const relationsToInsert = relations.filter((relation) => {
          const key = linkKey(relation);
          if (linked.has(key)) {
            return false;
          }

          linked.add(key);
          return true;
        });

        if (relationsToInsert.length === 0) {
          continue;
        }

        await trx.batchInsert(
          joinTable.name,
          relationsToInsert,
          strapi.db.dialect.getBatchInsertSize()
        );

        if (joinTable.orderColumnName && !isAnyToOne(attribute)) {
          const insertedSources = new Set(
            relationsToInsert.map((relation) => String(relation[sourceColumn]))
          );
          await reorderLikeDrafts(
            trx,
            uid,
            joinTable,
            new Map(
              [...draftSourceByPublishedSource].filter(([source]) => insertedSources.has(source))
            )
          );
        }
      }
    }
  });
};

export { restore };

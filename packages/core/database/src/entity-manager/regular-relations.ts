/* eslint-disable @typescript-eslint/no-namespace */
import { map, isEmpty } from 'lodash/fp';
import type { Knex } from 'knex';

import {
  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  hasOrderColumn,
  hasInverseOrderColumn,
} from '../metadata';
import { createQueryBuilder } from '../query';
import { addSchema } from '../utils/knex';
import type { Database } from '..';
import type { ID, Relation, Model } from '../types';

declare module 'knex' {
  namespace Knex {
    interface ChainableInterface {
      transacting(trx?: Knex.Transaction): this;
    }
  }
}

//  TODO: This is a short term solution, to not steal relations from the same document.
const getDocumentSiblingIdsQuery = (tableName: string, id: ID) => {
  // Find if the model is a content type or something else (e.g. component)
  // to only get the documentId if it's a content type
  const models: Model[] = Array.from(strapi.db.metadata.values());

  const isContentType = models.find((model) => {
    return model.tableName === tableName && model.attributes.documentId;
  });

  if (!isContentType) {
    return [id];
  }

  // NOTE: SubQueries are wrapped in a function to not reuse the same connection,
  // which causes infinite self references
  return function findDocumentSiblingIds(query) {
    query
      .select('id')
      .from(tableName)
      // Get all child ids of the document id
      .whereIn('document_id', (documentIDSubQuery) => {
        documentIDSubQuery
          .from(tableName)
          // get document id related to the current id
          .select('document_id')
          .where('id', id);
      });
  } satisfies Knex.QueryCallback;
};

/**
 * If some relations currently exist for this oneToX relation, on the one side, this function removes them and update the inverse order if needed.
 */
const deletePreviousOneToAnyRelations = async ({
  id,
  attribute,
  relIdsToadd,
  db,
  transaction: trx,
}: {
  id: ID;
  attribute: Relation.Bidirectional;
  relIdsToadd: ID[];
  db: Database;
  transaction?: Knex.Transaction;
}) => {
  if (!(isBidirectional(attribute) && isOneToAny(attribute))) {
    throw new Error(
      'deletePreviousOneToAnyRelations can only be called for bidirectional oneToAny relations'
    );
  }
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn } = joinTable;

  const con = db.getConnection();

  await con
    .delete()
    .from(joinTable.name)
    // Exclude the ids of the current document
    .whereNotIn(joinColumn.name, getDocumentSiblingIdsQuery(joinColumn.referencedTable!, id))
    // Include all the ids that are being connected
    .whereIn(inverseJoinColumn.name, relIdsToadd)
    .where(joinTable.on || {})
    .transacting(trx);

  await cleanOrderColumns({ attribute, db, inverseRelIds: relIdsToadd, transaction: trx });
};

/**
 * If a relation currently exists for this xToOne relations, this function removes it and update the inverse order if needed.
 */
const deletePreviousAnyToOneRelations = async ({
  id,
  attribute,
  relIdToadd,
  db,
  transaction: trx,
}: {
  id: ID;
  attribute: Relation.Bidirectional;
  relIdToadd: ID;
  db: Database;
  transaction?: Knex.Transaction;
}) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn } = joinTable;
  const con = db.getConnection();

  if (!isAnyToOne(attribute)) {
    throw new Error('deletePreviousAnyToOneRelations can only be called for anyToOne relations');
  }
  // handling manyToOne
  if (isManyToAny(attribute)) {
    // if the database integrity was not broken relsToDelete is supposed to be of length 1
    const relsToDelete = await con
      .select(inverseJoinColumn.name)
      .from(joinTable.name)
      .where(joinColumn.name, id)
      .whereNotIn(
        inverseJoinColumn.name,
        getDocumentSiblingIdsQuery(inverseJoinColumn.referencedTable!, relIdToadd)
      )
      .where(joinTable.on || {})
      .transacting(trx);

    const relIdsToDelete = map(inverseJoinColumn.name, relsToDelete);

    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({
        [joinColumn.name]: id,
        [inverseJoinColumn.name]: { $in: relIdsToDelete },
      })
      .where(joinTable.on || {})
      .transacting(trx)
      .execute();

    await cleanOrderColumns({ attribute, db, inverseRelIds: relIdsToDelete, transaction: trx });

    // handling oneToOne
  } else {
    await con
      .delete()
      .from(joinTable.name)
      .where(joinColumn.name, id)
      // Exclude the ids of the current document
      .whereNotIn(
        inverseJoinColumn.name,
        getDocumentSiblingIdsQuery(inverseJoinColumn.referencedTable!, relIdToadd)
      )
      .where(joinTable.on || {})
      .transacting(trx);
  }
};

/**
 * Delete all or some relations of entity field
 */
const deleteRelations = async ({
  id,
  attribute,
  db,
  relIdsToNotDelete = [],
  relIdsToDelete = [],
  transaction: trx,
}: {
  id: ID;
  attribute: Relation.Bidirectional;
  db: Database;
  relIdsToNotDelete?: ID[];
  relIdsToDelete?: ID[] | 'all';
  transaction?: Knex.Transaction;
}) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn } = joinTable;
  const all = relIdsToDelete === 'all';

  if (hasOrderColumn(attribute) || hasInverseOrderColumn(attribute)) {
    let lastId: ID = 0;
    let done = false;
    const batchSize = 100;

    while (!done) {
      const batchToDelete: { id: ID }[] = await createQueryBuilder(joinTable.name, db)
        .select(inverseJoinColumn.name)
        .where({
          [joinColumn.name]: id,
          id: { $gt: lastId },
          [inverseJoinColumn.name]: { $notIn: relIdsToNotDelete },
          ...(all ? {} : { [inverseJoinColumn.name]: { $in: relIdsToDelete } }),
        })
        .where(joinTable.on || {})
        .orderBy('id')
        .limit(batchSize)
        .transacting(trx)
        .execute();

      done = batchToDelete.length < batchSize;
      lastId = batchToDelete[batchToDelete.length - 1]?.id || 0;

      const batchIds = map(inverseJoinColumn.name, batchToDelete);

      await createQueryBuilder(joinTable.name, db)
        .delete()
        .where({
          [joinColumn.name]: id,
          [inverseJoinColumn.name]: { $in: batchIds },
        })
        .where(joinTable.on || {})
        .transacting(trx)
        .execute();

      await cleanOrderColumns({ attribute, db, id, inverseRelIds: batchIds, transaction: trx });
    }
  } else {
    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({
        [joinColumn.name]: id,
        [inverseJoinColumn.name]: { $notIn: relIdsToNotDelete },
        ...(all ? {} : { [inverseJoinColumn.name]: { $in: relIdsToDelete } }),
      })
      .where(joinTable.on || {})
      .transacting(trx)
      .execute();
  }
};

/**
 * Clean the order columns by ensuring the order value are continuous (ex: 1, 2, 3 and not 1, 5, 10)
 */
const cleanOrderColumns = async ({
  id,
  attribute,
  db,
  inverseRelIds = [],
  transaction: trx,
}: {
  id?: ID;
  attribute: Relation.Bidirectional;
  db: Database;
  inverseRelIds?: ID[];
  transaction?: Knex.Transaction;
}) => {
  if (
    !(hasOrderColumn(attribute) && id) &&
    !(hasInverseOrderColumn(attribute) && !isEmpty(inverseRelIds))
  ) {
    return;
  }

  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;

  /**
  UPDATE :joinTable: as a,
  (
    SELECT
      id,
      ROW_NUMBER() OVER ( PARTITION BY :joinColumn: ORDER BY :orderColumn:) AS src_order,
    FROM :joinTable:
    WHERE :joinColumn: = :id
  ) AS b
  SET :orderColumn: = b.src_order
  WHERE b.id = a.id;
  */
  const updateOrderColumn = async () => {
    if (!hasOrderColumn(attribute) || !id) {
      return;
    }

    const selectRowsToOrder = (joinTableName: string) =>
      db
        .connection(joinTableName)
        .select('id')
        .rowNumber('src_order', orderColumnName, joinColumn.name)
        .where(joinColumn.name, id)
        .toSQL();

    switch (strapi.db.dialect.client) {
      case 'mysql': {
        // Here it's MariaDB and MySQL 8
        // NOTE: A multi-table UPDATE joined to a derived ROW_NUMBER() table is rejected by
        // MariaDB Galera Cluster (errno 4165, "Galera replication not supported"). Compute the
        // ranking app-side and apply it as a single-table, PK-keyed UPDATE instead.
        const rows: { id: ID }[] = await db
          .connection(joinTable.name)
          .select('id')
          .where(joinColumn.name, id)
          .orderBy([{ column: orderColumnName }, { column: 'id' }])
          .transacting(trx);

        if (rows.length > 0) {
          const ids = rows.map((row) => row.id);
          const cases = ids.map(() => 'WHEN ? THEN ?').join(' ');
          const casesBindings = ids.flatMap((rowId, index) => [rowId, index + 1]);
          const placeholders = ids.map(() => '?').join(', ');

          await db
            .getConnection()
            .raw(
              `UPDATE ?? SET ?? = CASE id ${cases} END WHERE id IN (${placeholders})`,
              [joinTable.name, orderColumnName, ...casesBindings, ...ids]
            )
            .transacting(trx);
        }

        break;
      }
      default: {
        const joinTableName = addSchema(db, joinTable.name);
        const select = selectRowsToOrder(joinTableName);

        // raw query as knex doesn't allow updating from a subquery
        await db.connection
          .raw(
            `UPDATE ?? as a
            SET ?? = b.src_order
            FROM ( ${select.sql} ) AS b
            WHERE b.id = a.id`,
            [joinTableName, orderColumnName, ...select.bindings]
          )
          .transacting(trx);
      }
    }
  };

  /**
  UPDATE :joinTable: as a,
  (
    SELECT
      id,
      ROW_NUMBER() OVER ( PARTITION BY :inverseJoinColumn: ORDER BY :inverseOrderColumn:) AS inv_order
    FROM :joinTable:
    WHERE :inverseJoinColumn: IN (:inverseRelIds)
  ) AS b
  SET :inverseOrderColumn: = b.inv_order
  WHERE b.id = a.id;
  */
  const updateInverseOrderColumn = async () => {
    if (!hasInverseOrderColumn(attribute) || isEmpty(inverseRelIds)) return;

    const selectRowsToOrder = (joinTableName: string) =>
      db
        .connection(joinTableName)
        .select('id')
        .rowNumber('inv_order', inverseOrderColumnName, inverseJoinColumn.name)
        .where(inverseJoinColumn.name, 'in', inverseRelIds)
        .toSQL();

    switch (strapi.db.dialect.client) {
      case 'mysql': {
        // Here it's MariaDB and MySQL 8
        // NOTE: A multi-table UPDATE joined to a derived ROW_NUMBER() table is rejected by
        // MariaDB Galera Cluster (errno 4165, "Galera replication not supported"). Compute the
        // per-partition ranking app-side and apply it as a single-table, PK-keyed UPDATE instead.
        const rows: { id: ID; [key: string]: ID }[] = await db
          .connection(joinTable.name)
          .select('id', inverseJoinColumn.name)
          .where(inverseJoinColumn.name, 'in', inverseRelIds)
          .orderBy([
            { column: inverseJoinColumn.name },
            { column: inverseOrderColumnName },
            { column: 'id' },
          ])
          .transacting(trx);

        if (rows.length > 0) {
          const counters = new Map<ID, number>();
          const ranked = rows.map((row) => {
            const partition = row[inverseJoinColumn.name];
            const next = (counters.get(partition) ?? 0) + 1;
            counters.set(partition, next);
            return { id: row.id, order: next };
          });

          const cases = ranked.map(() => 'WHEN ? THEN ?').join(' ');
          const casesBindings = ranked.flatMap((row) => [row.id, row.order]);
          const ids = ranked.map((row) => row.id);
          const placeholders = ids.map(() => '?').join(', ');

          await db
            .getConnection()
            .raw(
              `UPDATE ?? SET ?? = CASE id ${cases} END WHERE id IN (${placeholders})`,
              [joinTable.name, inverseOrderColumnName, ...casesBindings, ...ids]
            )
            .transacting(trx);
        }
        break;
      }
      default: {
        const joinTableName = addSchema(db, joinTable.name);
        const select = selectRowsToOrder(joinTableName);

        // raw query as knex doesn't allow updating from a subquery
        await db.connection
          .raw(
            `UPDATE ?? as a
            SET ?? = b.inv_order
            FROM ( ${select.sql} ) AS b
            WHERE b.id = a.id`,
            [joinTableName, inverseOrderColumnName, ...select.bindings]
          )
          .transacting(trx);
      }
    }
  };

  // Run updates in a deterministic order to avoid lock cycles on the same join table.
  await updateOrderColumn();
  await updateInverseOrderColumn();
};

export {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
};

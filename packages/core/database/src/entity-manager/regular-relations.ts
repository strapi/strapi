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
import type { ID, Relation } from '../types';

declare module 'knex' {
  namespace Knex {
    interface ChainableInterface {
      transacting(trx?: Knex.Transaction): this;
    }
  }
}

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

  await createQueryBuilder(joinTable.name, db)
    .delete()
    .where({
      [inverseJoinColumn.name]: relIdsToadd,
      [joinColumn.name]: { $ne: id },
    })
    .where(joinTable.on || {})
    .transacting(trx)
    .execute();

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

  if (!isAnyToOne(attribute)) {
    throw new Error('deletePreviousAnyToOneRelations can only be called for anyToOne relations');
  }
  // handling manyToOne
  if (isManyToAny(attribute)) {
    // if the database integrity was not broken relsToDelete is supposed to be of length 1
    const relsToDelete = await createQueryBuilder(joinTable.name, db)
      .select(inverseJoinColumn.name)
      .where({
        [joinColumn.name]: id,
        [inverseJoinColumn.name]: { $ne: relIdToadd },
      })
      .where(joinTable.on || {})
      .transacting(trx)
      .execute<{ [key: string]: ID }[]>();

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
    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({
        [joinColumn.name]: id,
        [inverseJoinColumn.name]: { $ne: relIdToadd },
      })
      .where(joinTable.on || {})
      .transacting(trx)
      .execute();
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
        const select = selectRowsToOrder(joinTable.name);

        await db
          .getConnection()
          .raw(
            `UPDATE ?? as a, ( ${select.sql} ) AS b
            SET ?? = b.src_order
            WHERE b.id = a.id`,
            [joinTable.name, ...select.bindings, orderColumnName]
          )
          .transacting(trx);

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
        const select = selectRowsToOrder(joinTable.name);

        await db
          .getConnection()
          .raw(
            `UPDATE ?? as a, ( ${select.sql} ) AS b
            SET ?? = b.inv_order
            WHERE b.id = a.id`,
            [joinTable.name, ...select.bindings, inverseOrderColumnName]
          )
          .transacting(trx);
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

  return Promise.all([updateOrderColumn(), updateInverseOrderColumn()]);
};

/**
 * Use this when a relation is added or removed and its inverse order column
 * needs to be re-calculated
 *
 * Example: In this following table
 *
 *   | joinColumn      | inverseJoinColumn | order       | inverseOrder       |
 *   | --------------- | --------          | ----------- | ------------------ |
 *   | 1               | 1                 | 1           | 1                  |
 *   | 2               | 1                 | 3           | 2                  |
 *   | 2               | 2                 | 3           | 1                  |
 *
 * You add a new relation { joinColumn: 1, inverseJoinColumn: 2 }
 *
 *   | joinColumn      | inverseJoinColumn | order       | inverseOrder       |
 *   | --------------- | --------          | ----------- | ------------------ |
 *   | 1               | 1                 | 1           | 1                  |
 *   | 1               | 2                 | 2           | 1                  | <- inverseOrder should be 2
 *   | 2               | 1                 | 3           | 2                  |
 *   | 2               | 2                 | 3           | 1                  |
 *
 * This function would make such update, so all inverse order columns related
 * to the given id (1 in this example) are following a 1, 2, 3 sequence, without gap.
 *
 */
const cleanInverseOrderColumn = async ({
  id,
  attribute,
  trx,
}: {
  id: ID;
  attribute: Relation.Bidirectional;
  trx: Knex.Transaction;
}) => {
  const con = strapi.db.connection;
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn, inverseOrderColumnName } = joinTable;

  switch (strapi.db.dialect.client) {
    /*
      UPDATE `:joinTableName` AS `t1`
      JOIN (
          SELECT
            `inverseJoinColumn`,
            MAX(`:inverseOrderColumnName`) AS `max_inv_order`
          FROM `:joinTableName`
          GROUP BY `:inverseJoinColumn`
      ) AS `t2`
      ON `t1`.`:inverseJoinColumn` = `t2`.`:inverseJoinColumn`
      SET `t1`.`:inverseOrderColumnNAme` = `t2`.`max_inv_order` + 1
      WHERE `t1`.`:joinColumnName` = :id;
    */
    case 'mysql': {
      // Group by the inverse join column and get the max value of the inverse order column
      const subQuery = con(joinTable.name)
        .select(inverseJoinColumn.name)
        .max(inverseOrderColumnName, { as: 'max_inv_order' })
        .groupBy(inverseJoinColumn.name)
        .as('t2');

      //  Update ids with the new inverse order
      await con(`${joinTable.name} as t1`)
        .join(subQuery, `t1.${inverseJoinColumn.name}`, '=', `t2.${inverseJoinColumn.name}`)
        .where(joinColumn.name, id)
        .update({
          [inverseOrderColumnName]: con.raw('t2.max_inv_order + 1'),
        })
        .transacting(trx);
      break;
    }
    default: {
      /*
        UPDATE `:joinTableName` as `t1`
        SET `:inverseOrderColumnName` = (
          SELECT max(`:inverseOrderColumnName`) + 1
          FROM `:joinTableName` as `t2`
          WHERE t2.:inverseJoinColumn = t1.:inverseJoinColumn
        )
        WHERE `t1`.`:joinColumnName` = :id
      */
      // New inverse order will be the max value + 1
      const selectMaxInverseOrder = con.raw(`max(${inverseOrderColumnName}) + 1`);

      const subQuery = con(`${joinTable.name} as t2`)
        .select(selectMaxInverseOrder)
        .whereRaw(`t2.${inverseJoinColumn.name} = t1.${inverseJoinColumn.name}`);

      await con(`${joinTable.name} as t1`)
        .where(`t1.${joinColumn.name}`, id)
        .update({ [inverseOrderColumnName]: subQuery })
        .transacting(trx);
    }
  }
};

export {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
  cleanInverseOrderColumn,
};

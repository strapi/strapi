'use strict';

const { map, isEmpty } = require('lodash/fp');
const { randomBytes } = require('crypto');

const {
  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  hasOrderColumn,
  hasInverseOrderColumn,
} = require('../metadata/relations');
const { createQueryBuilder } = require('../query');
const { addSchema } = require('../utils/knex');

/**
 * If some relations currently exist for this oneToX relation, on the one side, this function removes them and update the inverse order if needed.
 * @param {Object} params
 * @param {string} params.id - entity id on which the relations for entities relIdsToadd are created
 * @param {string} params.attribute - attribute of the relation
 * @param {string} params.inverseRelIds - entity ids of the inverse side for which the current relations will be deleted
 * @param {string} params.db - database instance
 */
const deletePreviousOneToAnyRelations = async ({
  id,
  attribute,
  relIdsToadd,
  db,
  transaction: trx,
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
 * @param {Object} params
 * @param {string} params.id - entity id on which the relation for entity relIdToadd is created
 * @param {string} params.attribute - attribute of the relation
 * @param {string} params.relIdToadd - entity id of the new relation
 * @param {string} params.db - database instance
 */
const deletePreviousAnyToOneRelations = async ({
  id,
  attribute,
  relIdToadd,
  db,
  transaction: trx,
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
      .execute();

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
 * @param {Object} params
 * @param {string} params.id - entity id for which the relations will be deleted
 * @param {string} params.attribute - attribute of the relation
 * @param {string} params.db - database instance
 * @param {string} params.relIdsToDelete - ids of entities to remove from the relations. Also accepts 'all'
 * @param {string} params.relIdsToNotDelete - ids of entities to not remove from the relation when relIdsToDelete equals 'all'
 */
const deleteRelations = async ({
  id,
  attribute,
  db,
  relIdsToNotDelete = [],
  relIdsToDelete = [],
  transaction: trx,
}) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn } = joinTable;
  const all = relIdsToDelete === 'all';

  if (hasOrderColumn(attribute) || hasInverseOrderColumn(attribute)) {
    let lastId = 0;
    let done = false;
    const batchSize = 100;
    while (!done) {
      const batchToDelete = await createQueryBuilder(joinTable.name, db)
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
 * @param {Object} params
 * @param {string} params.id - entity id for which the clean will be done
 * @param {string} params.attribute - attribute of the relation
 * @param {string} params.db - database instance
 * @param {string} params.inverseRelIds - entity ids of the inverse side for which the clean will be done
 */
const cleanOrderColumns = async ({ id, attribute, db, inverseRelIds, transaction: trx }) => {
  if (
    !(hasOrderColumn(attribute) && id) &&
    !(hasInverseOrderColumn(attribute) && !isEmpty(inverseRelIds))
  ) {
    return;
  }

  // Handle databases that don't support window function ROW_NUMBER (here it's MySQL 5)
  if (!strapi.db.dialect.supportsWindowFunctions()) {
    await cleanOrderColumnsForOldDatabases({ id, attribute, db, inverseRelIds, transaction: trx });
    return;
  }

  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;
  const update = [];
  const updateBinding = [];
  const select = ['??'];
  const selectBinding = ['id'];
  const where = [];
  const whereBinding = [];

  if (hasOrderColumn(attribute) && id) {
    update.push('?? = b.src_order');
    updateBinding.push(orderColumnName);
    select.push('ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ??) AS src_order');
    selectBinding.push(joinColumn.name, orderColumnName);
    where.push('?? = ?');
    whereBinding.push(joinColumn.name, id);
  }

  if (hasInverseOrderColumn(attribute) && !isEmpty(inverseRelIds)) {
    update.push('?? = b.inv_order');
    updateBinding.push(inverseOrderColumnName);
    select.push('ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ??) AS inv_order');
    selectBinding.push(inverseJoinColumn.name, inverseOrderColumnName);
    where.push(`?? IN (${inverseRelIds.map(() => '?').join(', ')})`);
    whereBinding.push(inverseJoinColumn.name, ...inverseRelIds);
  }

  switch (strapi.db.dialect.client) {
    case 'mysql':
      // Here it's MariaDB and MySQL 8
      await db
        .getConnection()
        .raw(
          `UPDATE
            ?? as a,
            (
              SELECT ${select.join(', ')}
              FROM ??
              WHERE ${where.join(' OR ')}
            ) AS b
          SET ${update.join(', ')}
          WHERE b.id = a.id`,
          [joinTable.name, ...selectBinding, joinTable.name, ...whereBinding, ...updateBinding]
        )
        .transacting(trx);
      break;
    /*
      UPDATE
        :joinTable: as a,
        (
          SELECT
            id,
            ROW_NUMBER() OVER ( PARTITION BY :joinColumn: ORDER BY :orderColumn:) AS src_order,
            ROW_NUMBER() OVER ( PARTITION BY :inverseJoinColumn: ORDER BY :inverseOrderColumn:) AS inv_order
          FROM :joinTable:
          WHERE :joinColumn: = :id OR :inverseJoinColumn: IN (:inverseRelIds)
        ) AS b
      SET :orderColumn: = b.src_order, :inverseOrderColumn: = b.inv_order
      WHERE b.id = a.id;
    */
    default: {
      const joinTableName = addSchema(joinTable.name);

      // raw query as knex doesn't allow updating from a subquery
      // https://github.com/knex/knex/issues/2504
      await db.connection
        .raw(
          `UPDATE ?? as a
              SET ${update.join(', ')}
              FROM (
                SELECT ${select.join(', ')}
                FROM ??
                WHERE ${where.join(' OR ')}
              ) AS b
              WHERE b.id = a.id`,
          [joinTableName, ...updateBinding, ...selectBinding, joinTableName, ...whereBinding]
        )
        .transacting(trx);

      /*
        UPDATE :joinTable: as a
        SET :orderColumn: = b.src_order, :inverseOrderColumn: = b.inv_order
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER ( PARTITION BY :joinColumn: ORDER BY :orderColumn:) AS src_order,
            ROW_NUMBER() OVER ( PARTITION BY :inverseJoinColumn: ORDER BY :inverseOrderColumn:) AS inv_order
          FROM :joinTable:
          WHERE :joinColumn: = :id OR :inverseJoinColumn: IN (:inverseRelIds)
        ) AS b
        WHERE b.id = a.id;
      */
    }
  }
};

/*
 * Ensure that orders are following a 1, 2, 3 sequence, without gap.
 * The use of a session variable instead of a window function makes the query compatible with MySQL 5
 */
const cleanOrderColumnsForOldDatabases = async ({
  id,
  attribute,
  db,
  inverseRelIds,
  transaction: trx,
}) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;

  const randomSuffix = `${new Date().valueOf()}_${randomBytes(16).toString('hex')}`;

  if (hasOrderColumn(attribute) && id) {
    // raw query as knex doesn't allow updating from a subquery
    // https://github.com/knex/knex/issues/2504
    const orderVar = `order_${randomSuffix}`;
    await db.connection.raw(`SET @${orderVar} = 0;`).transacting(trx);
    await db.connection
      .raw(
        `UPDATE :joinTableName: as a, (
          SELECT id, (@${orderVar}:=@${orderVar} + 1) AS src_order
          FROM :joinTableName:
	        WHERE :joinColumnName: = :id
	        ORDER BY :orderColumnName:
        ) AS b
        SET :orderColumnName: = b.src_order
        WHERE a.id = b.id
        AND a.:joinColumnName: = :id`,
        {
          joinTableName: joinTable.name,
          orderColumnName,
          joinColumnName: joinColumn.name,
          id,
        }
      )
      .transacting(trx);
  }

  if (hasInverseOrderColumn(attribute) && !isEmpty(inverseRelIds)) {
    const orderVar = `order_${randomSuffix}`;
    const columnVar = `col_${randomSuffix}`;
    await db.connection.raw(`SET @${orderVar} = 0;`).transacting(trx);
    await db.connection
      .raw(
        `UPDATE ?? as a, (
          SELECT
          	id,
            @${orderVar}:=CASE WHEN @${columnVar} = ?? THEN @${orderVar} + 1 ELSE 1 END AS inv_order,
        	  @${columnVar}:=?? ??
        	FROM ?? a
        	WHERE ?? IN(${inverseRelIds.map(() => '?').join(', ')})
        	ORDER BY ??, ??
        ) AS b
        SET ?? = b.inv_order
        WHERE a.id = b.id
        AND a.?? IN(${inverseRelIds.map(() => '?').join(', ')})`,
        [
          joinTable.name,
          inverseJoinColumn.name,
          inverseJoinColumn.name,
          inverseJoinColumn.name,
          joinTable.name,
          inverseJoinColumn.name,
          ...inverseRelIds,
          inverseJoinColumn.name,
          joinColumn.name,
          inverseOrderColumnName,
          inverseJoinColumn.name,
          ...inverseRelIds,
        ]
      )
      .transacting(trx);
  }
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
 * @param {Object} params
 * @param {string} params.id - entity id to find which inverse order column to clean
 * @param {Object} params.attribute - attribute of the relation
 * @param {Object} params.trx - knex transaction
 *
 */

const cleanInverseOrderColumn = async ({ id, attribute, trx }) => {
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

module.exports = {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
  cleanInverseOrderColumn,
};

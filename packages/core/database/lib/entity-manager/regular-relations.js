'use strict';

const { map, isEmpty } = require('lodash/fp');
const {
  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  hasOrderColumn,
  hasInverseOrderColumn,
} = require('../metadata/relations');
const { createQueryBuilder } = require('../query');

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
      lastId = batchToDelete[batchToDelete.length - 1]?.id;

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

  // raw query as knex doesn't allow updating from a subquery
  // https://github.com/knex/knex/issues/2504
  switch (strapi.db.dialect.client) {
    case 'mysql': {
      const [results] = await strapi.db.connection.raw('SELECT version() as version');
      const version = results[0].version;
      console.log('AAAA', version);
      await db.connection
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
    }
    default:
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
          [joinTable.name, ...updateBinding, ...selectBinding, joinTable.name, ...whereBinding]
        )
        .transacting(trx);
    /*
      `UPDATE :joinTable: as a
        SET :orderColumn: = b.src_order, :inverseOrderColumn: = b.inv_order
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER ( PARTITION BY :joinColumn: ORDER BY :orderColumn:) AS src_order,
            ROW_NUMBER() OVER ( PARTITION BY :inverseJoinColumn: ORDER BY :inverseOrderColumn:) AS inv_order
          FROM :joinTable:
          WHERE :joinColumn: = :id OR :inverseJoinColumn: IN (:inverseRelIds)
        ) AS b
        WHERE b.id = a.id`,
    */
  }
};

module.exports = {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
};

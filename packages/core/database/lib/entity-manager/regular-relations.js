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
const deletePreviousOneToAnyRelations = async ({ id, attribute, relIdsToadd, db }) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn } = joinTable;

  // need to delete the previous relations for oneToAny relations
  if (isBidirectional(attribute) && isOneToAny(attribute)) {
    // delete previous oneToAny relations
    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({
        [inverseJoinColumn.name]: relIdsToadd,
        [joinColumn.name]: { $ne: id },
      })
      .where(joinTable.on || {})
      .execute();

    await cleanOrderColumns({ attribute, db, inverseRelIds: relIdsToadd });
  }
};

/**
 * If a relation currently exists for this xToOne relations, this function removes it and update the inverse order if needed.
 * @param {Object} params
 * @param {string} params.id - entity id on which the relation for entity relIdToadd is created
 * @param {string} params.attribute - attribute of the relation
 * @param {string} params.relIdToadd - entity id of the new relation
 * @param {string} params.db - database instance
 */
const deletePreviousAnyToOneRelations = async ({ id, attribute, relIdToadd, db }) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn } = joinTable;

  // Delete the previous relations for anyToOne relations
  if (isBidirectional(attribute) && isAnyToOne(attribute)) {
    // update orders for previous anyToOne relations that will be deleted if it has order (manyToOne)

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
        .execute();

      const relIdsToDelete = map(inverseJoinColumn.name, relsToDelete);

      await createQueryBuilder(joinTable.name, db)
        .delete()
        .where({
          [joinColumn.name]: id,
          [inverseJoinColumn.name]: { $in: relIdsToDelete },
        })
        .where(joinTable.on || {})
        .execute();

      await cleanOrderColumns({ attribute, db, inverseRelIds: relIdsToDelete });

      // handling oneToOne
    } else {
      await createQueryBuilder(joinTable.name, db)
        .delete()
        .where({
          [joinColumn.name]: id,
          [inverseJoinColumn.name]: { $ne: relIdToadd },
        })
        .where(joinTable.on || {})
        .execute();
    }
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
        .execute();

      await cleanOrderColumns({ attribute, db, id, inverseRelIds: batchIds });
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
const cleanOrderColumns = async ({ id, attribute, db, inverseRelIds }) => {
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
    update.push('?? = t.src_order');
    updateBinding.push(orderColumnName);
    select.push('ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ??) AS src_order');
    selectBinding.push(joinColumn.name, orderColumnName);
    where.push('?? = ?');
    whereBinding.push(joinColumn.name, id);
  }

  if (hasInverseOrderColumn(attribute) && !isEmpty(inverseRelIds)) {
    update.push('?? = t.inv_order');
    updateBinding.push(inverseOrderColumnName);
    select.push('ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ??) AS inv_order');
    selectBinding.push(inverseJoinColumn.name, inverseOrderColumnName);
    where.push(`?? IN (${inverseRelIds.map(() => '?').join(', ')})`);
    whereBinding.push(inverseJoinColumn.name, ...inverseRelIds);
  }

  // raw query as knex doesn't allow updating from a subquery
  // https://github.com/knex/knex/issues/2504
  /*
  `UPDATE :joinTable:
    SET :orderColumn: = t.src_order, :inverseOrderColumn: = t.inv_order
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER ( PARTITION BY :joinColumn: ORDER BY :orderColumn:) AS src_order,
        ROW_NUMBER() OVER ( PARTITION BY :inverseJoinColumn: ORDER BY :inverseOrderColumn:) AS inv_order
      FROM :joinTable:
      WHERE :joinColumn: = :id OR :inverseJoinColumn: IN (:inverseRelIds)
    ) AS t
    WHERE t.id = :joinTable:.id`,
*/
  await db.getConnection().raw(
    `UPDATE ??
      SET ${update.join(', ')}
      FROM (
        SELECT ${select.join(', ')}
        FROM ??
        WHERE ${where.join(' OR ')}
      ) AS t
      WHERE t.id = ??.id`,
    [
      joinTable.name,
      ...updateBinding,
      ...selectBinding,
      joinTable.name,
      ...whereBinding,
      joinTable.name,
    ]
  );
};

module.exports = {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
};

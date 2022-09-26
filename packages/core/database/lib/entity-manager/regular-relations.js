'use strict';

const { map, isEmpty } = require('lodash/fp');
const {
  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  isAnyToMany,
} = require('../metadata/relations');
const { createQueryBuilder } = require('../query');

const deletePreviousOneToAnyRelations = async ({ id, attribute, joinTable, relIdsToadd, db }) => {
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

    await cleanOrderColumns({ joinTable, attribute, db, inverseRelIds: relIdsToadd });
  }
};

const deletePreviousAnyToOneRelations = async ({ id, attribute, joinTable, relIdToadd, db }) => {
  const { joinColumn, inverseJoinColumn } = joinTable;

  // Delete the previous relations for anyToOne relations
  if (isBidirectional(attribute) && isAnyToOne(attribute)) {
    // update orders for previous anyToOne relations that will be deleted if it has order (manyToOne)
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

      // delete previous anyToOne relations
      await createQueryBuilder(joinTable.name, db)
        .delete()
        .where({
          [joinColumn.name]: id,
          [inverseJoinColumn.name]: { $in: relIdsToDelete },
        })
        .where(joinTable.on || {})
        .execute();

      await cleanOrderColumns({ joinTable, attribute, db, inverseRelIds: relIdsToDelete });
    } else {
      // delete previous anyToOne relations
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

// INVERSE ORDER UPDATE
const deleteRelations = async (
  { id, attribute, joinTable, db },
  { relIdsToNotDelete = [], relIdsToDelete = [] }
) => {
  const { joinColumn, inverseJoinColumn } = joinTable;
  const all = relIdsToDelete === 'all';

  if (isAnyToMany(attribute) || (isBidirectional(attribute) && isManyToAny(attribute))) {
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

      await cleanOrderColumns({ joinTable, attribute, db, id, inverseRelIds: batchIds });
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
 * @param {string} params.joinTable - joinTable of the relation where the clean will be done
 * @param {string} params.attribute - attribute on which the clean will be done
 * @param {string} params.db - Database instance
 * @param {string} params.id - Entity ID for which the clean will be done
 * @param {string} params.inverseRelIds - Entity ids of the inverse side for which the clean will be done
 */
const cleanOrderColumns = async ({ joinTable, attribute, db, id, inverseRelIds }) => {
  if (
    !(isAnyToMany(attribute) && id) &&
    !(isBidirectional(attribute) && isManyToAny(attribute) && !isEmpty(inverseRelIds))
  ) {
    return;
  }

  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;
  const knex = db.getConnection();
  const update = {};
  const subQuery = knex(joinTable.name).select('id');

  if (isAnyToMany(attribute) && id) {
    update[orderColumnName] = knex.raw('t.src_order');
    const on = [joinColumn.name, ...Object.keys(joinTable.on)];
    subQuery
      .select(
        knex.raw(`ROW_NUMBER() OVER (PARTITION BY ${on.join(', ')} ORDER BY ??) AS src_order`, [
          ...on,
          orderColumnName,
        ])
      )
      .where(joinColumn.name, id);
  }

  if (isBidirectional(attribute) && isManyToAny(attribute) && !isEmpty(inverseRelIds)) {
    update[inverseOrderColumnName] = knex.raw('t.inv_order');
    const on = [inverseJoinColumn.name, ...Object.keys(joinTable.on)];
    subQuery
      .select(
        knex.raw(`ROW_NUMBER() OVER (PARTITION BY ${on.join(', ')} ORDER BY ??) AS inv_order`, [
          ...on,
          inverseOrderColumnName,
        ])
      )
      .orWhereIn(inverseJoinColumn.name, inverseRelIds);
  }

  await knex(joinTable.name)
    .update(update)
    .from(subQuery)
    .where('t.id', knex.raw('??.id', joinTable.name));

  /*
    `UPDATE :joinTable:
      SET :orderColumn: = t.order, :inverseOrderColumn: = t.inv_order
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER ( PARTITION BY :joinColumn: ORDER BY :orderColumn:) AS order,
          ROW_NUMBER() OVER ( PARTITION BY :inverseJoinColumn: ORDER BY :inverseOrderColumn:) AS inv_order
        FROM :joinTable:
        WHERE :joinColumn: = :id OR :inverseJoinColumn: IN (:inverseRelIds)
      ) AS t
      WHERE t.id = :joinTable:.id`,
  */
};

module.exports = {
  deletePreviousOneToAnyRelations,
  deletePreviousAnyToOneRelations,
  deleteRelations,
  cleanOrderColumns,
};

'use strict';

const { groupBy, pipe, mapValues, map, isEmpty } = require('lodash/fp');
const { createQueryBuilder } = require('../../query');

const getMorphToManyRowsLinkedToMorphOne = (rows, { uid, attributeName, typeColumn, db }) =>
  rows.filter((row) => {
    const relatedType = row[typeColumn.name];
    const field = row.field;

    const targetAttribute = db.metadata.get(relatedType).attributes[field];

    // ensure targeted field is the right one + check if it is a morphOne
    return (
      targetAttribute?.target === uid &&
      targetAttribute?.morphBy === attributeName &&
      targetAttribute?.relation === 'morphOne'
    );
  });

const deleteRelatedMorphOneRelationsAfterMorphToManyUpdate = async (
  rows,
  { uid, attributeName, joinTable, db, transaction: trx }
) => {
  const { morphColumn } = joinTable;
  const { idColumn, typeColumn } = morphColumn;

  const morphOneRows = getMorphToManyRowsLinkedToMorphOne(rows, {
    uid,
    attributeName,
    typeColumn,
    db,
  });

  const groupByType = groupBy(typeColumn.name);
  const groupByField = groupBy('field');

  const typeAndFieldIdsGrouped = pipe(groupByType, mapValues(groupByField))(morphOneRows);

  const orWhere = [];

  for (const [type, v] of Object.entries(typeAndFieldIdsGrouped)) {
    for (const [field, arr] of Object.entries(v)) {
      orWhere.push({
        [typeColumn.name]: type,
        field,
        [idColumn.name]: { $in: map(idColumn.name, arr) },
      });
    }
  }

  if (!isEmpty(orWhere)) {
    await createQueryBuilder(joinTable.name, db)
      .delete()
      .where({ $or: orWhere })
      .transacting(trx)
      .execute();
  }
};

const deleteMorphRelations = async ({
  id,
  uid,
  attributeName,
  targetAttribute,
  db,
  relIdsToDelete = [],
  transaction: trx,
}) => {
  const { joinTable } = targetAttribute;
  const { joinColumn, morphColumn } = joinTable;
  const { idColumn, typeColumn } = morphColumn;
  const all = relIdsToDelete === 'all';

  const where = {
    [idColumn.name]: id,
    ...(all ? {} : { [joinColumn.name]: { $in: relIdsToDelete } }),
  };
  if (uid) where[typeColumn.name] = uid;
  if (attributeName) where.field = attributeName;

  await createQueryBuilder(joinTable.name, db).delete().where(where).transacting(trx).execute();

  if (!all) {
    await cleanMorphOrderColumns({ uid, attributeName, targetAttribute, db, transaction: trx });
  }
};

const cleanMorphOrderColumns = async ({
  uid,
  attributeName,
  targetAttribute,
  db,
  transaction: trx,
}) => {
  const { joinTable } = targetAttribute;
  const { joinColumn, morphColumn } = joinTable;
  const { typeColumn } = morphColumn;

  const update = [];
  const updateBinding = [];
  const select = ['??'];
  const selectBinding = ['id'];
  const where = [];
  const whereBinding = [];

  update.push('?? = b.src_order');
  updateBinding.push('order');
  select.push('ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ??) AS src_order');
  selectBinding.push(joinColumn.name, 'order');
  where.push('?? = ?');
  whereBinding.push(typeColumn.name, uid);
  where.push('?? = ?');
  whereBinding.push('field', attributeName);

  // raw query as knex doesn't allow updating from a subquery
  // https://github.com/knex/knex/issues/2504
  switch (strapi.db.dialect.client) {
    case 'mysql':
      await db
        .getConnection()
        .raw(
          `UPDATE
            ?? as a,
            (
              SELECT ${select.join(', ')}
              FROM ??
              WHERE ${where.join(' AND ')}
            ) AS b
          SET ${update.join(', ')}
          WHERE b.id = a.id`,
          [joinTable.name, ...selectBinding, joinTable.name, ...whereBinding, ...updateBinding]
        )
        .transacting(trx);
      break;
    default:
      await db
        .getConnection()
        .raw(
          `UPDATE ?? as a
            SET ${update.join(', ')}
            FROM (
              SELECT ${select.join(', ')}
              FROM ??
              WHERE ${where.join(' AND ')}
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
          WHERE (:joinColumn: = :id) AND (:typeColum: = :uid) AND (:field: = :attributeName:)),
        ) AS b
        WHERE b.id = a.id`
    */
  }
};

module.exports = {
  deleteRelatedMorphOneRelationsAfterMorphToManyUpdate,
  cleanMorphOrderColumns,
  deleteMorphRelations,
};

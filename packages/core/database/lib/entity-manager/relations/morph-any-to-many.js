'use strict';

/*

In a polymorphic relationship, the link table can be associated with multiple tables.
A morph anyToMany relationship is a polymorphic anyToMany relationship.

One example of a morph oneToMany relationship is a single media attribute in a content-type.
One example of a morph anyToMany relationship is a multiple media attribute in a content-type.

*/

const { isEmpty, differenceWith, isEqual, has } = require('lodash/fp');
const { createQueryBuilder } = require('../../query');
const { deleteMorphRelations } = require('./morph-relations');
const { toIds } = require('./utils');

/**
 * For a given join table and a list of ids, returns a map of ids and the max order value
 */
async function getRelationIdsMaxOrder(joinTable, relIdsToadd, { db, trx }) {
  const { joinColumn } = joinTable;

  const maxOrder = await db
    .getConnection()
    .select(joinColumn.name)
    .max('order', { as: 'max' })
    .whereIn(joinColumn.name, relIdsToadd)
    .where(joinTable.on || {})
    .groupBy(joinColumn.name)
    .from(joinTable.name)
    .transacting(trx);

  const maxMap = maxOrder.reduce((acc, curr) => {
    acc[curr[joinColumn.name]] = curr.max;
    return acc;
  }, {});

  return maxMap;
}

/**
 * Create entity with a morph any to many relation
 *
 * @param {string} uid - entity uid
 * @param {ID} id - entity id on which the relation for entity relIdToadd is created
 * @param {string} attributeName - attribute name of the relation
 * @param {object} targetAttribute - attribute of the related entity
 * @param {object} relationData - all relations to connect
 * @param {object} { db, trx }
 */
async function attachMorphAnyToOneRelation(
  uid,
  id,
  attributeName,
  targetAttribute,
  relationData,
  { db, trx }
) {
  const { joinTable } = targetAttribute;
  const { joinColumn, morphColumn } = joinTable;

  const { idColumn, typeColumn } = morphColumn;

  const relsToAdd = relationData.set || relationData.connect;
  const relIdsToadd = toIds(relsToAdd);

  if (isEmpty(relIdsToadd)) {
    return;
  }

  // Prepare new relations to insert
  const insert = relsToAdd.map((data) => {
    return {
      [joinColumn.name]: data.id,
      [idColumn.name]: id,
      [typeColumn.name]: uid,
      ...(joinTable.on || {}),
      ...(data.__pivot || {}),
      field: attributeName,
    };
  });

  // get order value from max value
  const maxOrderMap = await getRelationIdsMaxOrder(joinTable, relIdsToadd, { db, trx });

  insert.forEach((rel) => {
    rel.order = (maxOrderMap[rel[joinColumn.name]] || 0) + 1;
  });

  await createQueryBuilder(joinTable.name, db).insert(insert).transacting(trx).execute();
}

/**
 * Update entity with a morph any to many relation
 *
 * @param {string} uid - entity uid
 * @param {ID} id - entity id on which the relation for entity relIdToadd is created
 * @param {string} attributeName - attribute name of the relation
 * @param {object} targetAttribute - attribute of the related entity
 * @param {object} relationData - all relations to connect and disconnect to entity id
 * @param {object} { db, trx }
 */
async function updateMorphAnyToManyRelation(
  uid,
  id,
  attributeName,
  targetAttribute,
  relationData,
  { db, trx }
) {
  const { joinTable } = targetAttribute;
  const { joinColumn, morphColumn } = joinTable;

  const { idColumn, typeColumn } = morphColumn;

  const isPartialUpdate = !has('set', relationData);
  const relsToAdd = relationData.set || relationData.connect;
  const relIdsToadd = toIds(relsToAdd);

  if (isPartialUpdate) {
    // Calculate relations to delete
    const relIdsToDelete = toIds(differenceWith(isEqual, relationData.disconnect, relsToAdd));
    if (!isEmpty(relIdsToDelete)) {
      await deleteMorphRelations({
        id,
        uid,
        attributeName,
        targetAttribute,
        db,
        relIdsToDelete,
        transaction: trx,
      });
    }
  } else {
    await deleteMorphRelations({
      id,
      uid,
      attributeName,
      targetAttribute,
      db,
      relIdsToDelete: 'all',
      transaction: trx,
    });
  }

  if (isEmpty(relsToAdd)) {
    return;
  }

  const insert = relsToAdd.map((data) => ({
    [joinColumn.name]: data.id,
    [idColumn.name]: id,
    [typeColumn.name]: uid,
    ...(joinTable.on || {}),
    ...(data.__pivot || {}),
    field: attributeName,
  }));

  // get order value from max value
  const maxOrderMap = getRelationIdsMaxOrder(joinTable, relIdsToadd, { db, trx });

  insert.forEach((rel) => {
    rel.order = (maxOrderMap[rel[joinColumn.name]] || 0) + 1;
  });

  await createQueryBuilder(joinTable.name, db).insert(insert).transacting(trx).execute();
}

module.exports = {
  attachMorphAnyToOneRelation,
  updateMorphAnyToManyRelation,
};

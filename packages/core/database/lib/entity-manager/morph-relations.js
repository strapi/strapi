'use strict';

const { groupBy, pipe, mapValues, map, isEmpty } = require('lodash/fp');
const { createQueryBuilder } = require('../query');

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
  { uid, attributeName, joinTable, db }
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
    await createQueryBuilder(joinTable.name, db).delete().where({ $or: orWhere }).execute();
  }
};

module.exports = {
  deleteRelatedMorphOneRelationsAfterMorphToManyUpdate,
};

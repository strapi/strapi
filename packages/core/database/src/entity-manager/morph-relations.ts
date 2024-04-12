import { groupBy, pipe, mapValues, map, isEmpty } from 'lodash/fp';
import type { Knex } from 'knex';

import { createQueryBuilder } from '../query';
import type { Database } from '..';
import type { MorphJoinTable, Relation } from '../types';

type Rows = Record<string, unknown>[];

const getMorphToManyRowsLinkedToMorphOne = (
  rows: Rows,
  {
    uid,
    attributeName,
    typeColumn,
    db,
  }: {
    uid: string;
    attributeName: string;
    typeColumn: { name: string };
    db: Database;
  }
) =>
  rows.filter((row) => {
    const relatedType = row[typeColumn.name] as string;
    const field = row.field as any;

    const targetAttribute = db.metadata.get(relatedType).attributes[field] as Relation.MorphOne;

    // ensure targeted field is the right one + check if it is a morphOne
    return (
      targetAttribute?.target === uid &&
      targetAttribute?.morphBy === attributeName &&
      targetAttribute?.relation === 'morphOne'
    );
  });

export const deleteRelatedMorphOneRelationsAfterMorphToManyUpdate = async (
  rows: Rows,
  {
    uid,
    attributeName,
    joinTable,
    db,
    transaction: trx,
  }: {
    uid: string;
    attributeName: string;
    joinTable: MorphJoinTable;
    db: Database;
    transaction?: Knex.Transaction;
  }
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

  const orWhere: object[] = [];

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

/* eslint-disable @typescript-eslint/naming-convention */ // allow __type
import { curry, groupBy, mapValues, map, isEmpty } from 'lodash';
import type { Knex } from 'knex';

import { createQueryBuilder } from '../query';
import { addSchema } from '../utils/knex';
import type { Database } from '..';
import type { ID, MorphJoinTable, Relation } from '../types';

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

  const typeAndFieldIdsGrouped = mapValues(groupBy(morphOneRows, typeColumn.name), (typeRows) =>
    groupBy(typeRows, 'field')
  );

  const orWhere: object[] = [];

  for (const [type, v] of Object.entries(typeAndFieldIdsGrouped)) {
    for (const [field, arr] of Object.entries(v)) {
      orWhere.push({
        [typeColumn.name]: type,
        field,
        [idColumn.name]: { $in: map(arr, idColumn.name) },
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

/**
 * Renumber the order column of an entry's morphToMany relations so the values are continuous (1, 2, 3...)
 */
export const cleanMorphToManyOrderColumn = async ({
  id,
  joinTable,
  db,
  transaction: trx,
}: {
  id: ID;
  joinTable: MorphJoinTable;
  db: Database;
  transaction?: Knex.Transaction;
}) => {
  const { joinColumn } = joinTable;

  const selectRowsToOrder = (joinTableName: string) =>
    db
      .connection(joinTableName)
      .select('id')
      .rowNumber('src_order', 'order', joinColumn.name)
      .where(joinColumn.name, id)
      .toSQL();

  switch (db.dialect.client) {
    case 'mysql': {
      const select = selectRowsToOrder(joinTable.name);

      await db
        .getConnection()
        .raw(
          `UPDATE ?? as a, ( ${select.sql} ) AS b
          SET ?? = b.src_order
          WHERE b.id = a.id`,
          [joinTable.name, ...select.bindings, 'order']
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
          [joinTableName, 'order', ...select.bindings]
        )
        .transacting(trx);
    }
  }
};

/**
 * Encoding utilities for polymorphic relations.
 *
 * In some scenarios is useful to encode both the id & __type of the relation
 * to have a unique identifier for the relation. (e.g. relations reordering)
 */

export const encodePolymorphicId = (id: number | string, __type: string) => {
  return `${id}:::${__type}`;
};

export const encodePolymorphicRelation = curry(({ idColumn, typeColumn }, relation?: any): any => {
  // Encode the id of the relation and the positional argument if it exist
  const newRelation = {
    ...relation,
    [idColumn]: encodePolymorphicId(relation[idColumn], relation[typeColumn]),
  };

  if (relation.position) {
    const { before, after } = relation.position;
    const __type = relation.position.__type || relation.__type;

    newRelation.position = { ...relation.position };

    if (before) newRelation.position.before = encodePolymorphicId(before, __type);
    if (after) newRelation.position.after = encodePolymorphicId(after, __type);
  }

  return newRelation;
});

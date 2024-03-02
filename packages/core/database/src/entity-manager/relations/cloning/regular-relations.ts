import { Knex } from 'knex';

import { cleanInverseOrderColumn } from '../../regular-relations';
import type { ID, Relation } from '../../../types';
import type { Database } from '../../..';

const replaceRegularRelations = async ({
  targetId,
  sourceId,
  attribute,
  omitIds,
  db,
  transaction: trx,
}: {
  targetId: ID;
  sourceId: ID;
  attribute: Relation.Bidirectional;
  omitIds: ID[];
  db: Database,
  transaction?: Knex.Transaction;
}) => {
  const { joinTable } = attribute;

  const { joinColumn, inverseJoinColumn } = joinTable;

  // We are effectively stealing the relation from the cloned entity
  await db.entityManager
    .createQueryBuilder(joinTable.name)
    .update({ [joinColumn.name]: targetId })
    .where({ [joinColumn.name]: sourceId })
    .where({ $not: { [inverseJoinColumn.name]: omitIds } })
    .onConflict([joinColumn.name, inverseJoinColumn.name])
    .ignore()
    .transacting(trx)
    .execute();
};

const cloneRegularRelations = async ({
  targetId,
  sourceId,
  attribute,
  db,
  transaction: trx,
}: {
  targetId: ID;
  sourceId: ID;
  attribute: Relation.Bidirectional;
  db: Database;
  transaction?: Knex.Transaction;
}) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;

  // Get the columns to select
  const columns = [joinColumn.name, inverseJoinColumn.name];
  if (orderColumnName) {
    columns.push(orderColumnName);
  }

  if (inverseOrderColumnName) {
    columns.push(inverseOrderColumnName);
  }

  if (joinTable.on) {
    columns.push(...Object.keys(joinTable.on));
  }

  const selectStatement = db.getConnection()
    .select(
      // Override joinColumn with the new id
      { [joinColumn.name]: targetId },
      // The rest of columns will be the same
      ...columns.slice(1)
    )
    .where(joinColumn.name, sourceId)
    .from(joinTable.name)
    .toSQL();

  // Insert the clone relations
  await db.entityManager
    .createQueryBuilder(joinTable.name)
    .insert(
      db.connection.raw(
        `(${columns.join(',')})  ${selectStatement.sql}`,
        selectStatement.bindings
      ) as any
    )
    .onConflict([joinColumn.name, inverseJoinColumn.name])
    .ignore()
    .transacting(trx)
    .execute();

  // Clean the inverse order column
  if (inverseOrderColumnName) {
    await cleanInverseOrderColumn({
      id: targetId,
      attribute,
      db,
      transaction: trx as Knex.Transaction,
    });
  }
};

export { replaceRegularRelations, cloneRegularRelations };

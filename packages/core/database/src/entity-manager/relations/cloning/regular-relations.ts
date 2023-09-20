import { Knex } from 'knex';

import { cleanInverseOrderColumn } from '../../regular-relations';
import type { ID, Relation } from '../../../types';

const replaceRegularRelations = async ({
  targetId,
  sourceId,
  attribute,
  omitIds,
  transaction: trx,
}: {
  targetId: ID;
  sourceId: ID;
  attribute: Relation.Bidirectional;
  omitIds: ID[];
  transaction?: Knex.Transaction;
}) => {
  const { joinTable } = attribute;

  const { joinColumn, inverseJoinColumn } = joinTable;

  // We are effectively stealing the relation from the cloned entity
  await strapi.db.entityManager
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
  transaction: trx,
}: {
  targetId: ID;
  sourceId: ID;
  attribute: Relation.Bidirectional;
  transaction?: Knex.Transaction;
}) => {
  const { joinTable } = attribute;
  const { joinColumn, inverseJoinColumn, orderColumnName, inverseOrderColumnName } = joinTable;
  const connection = strapi.db.getConnection();

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

  const selectStatement = connection
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
  await strapi.db.entityManager
    .createQueryBuilder(joinTable.name)
    .insert(
      strapi.db.connection.raw(
        `(${columns.join(',')})  ${selectStatement.sql}`,
        selectStatement.bindings
      )
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
      trx: trx as Knex.Transaction,
    });
  }
};

export { replaceRegularRelations, cloneRegularRelations };

import { Knex } from 'knex';

import type { ID, Relation } from '../../../types';

export const cloneMorphMediaRelations = async ({
  uid,
  targetId,
  sourceId,
  attribute,
  transaction: trx,
}: {
  uid: string;
  targetId: ID;
  sourceId: ID;
  attribute: Relation.MorphOne | Relation.MorphMany;
  transaction?: Knex.Transaction;
}) => {
  const { attributes } = strapi.db.metadata.get(attribute.target);
  const { related } = attributes;
  const { joinTable } = related;

  const records = await strapi.db.entityManager
    .createQueryBuilder(joinTable.name)
    .select('*')
    .where({
      [joinTable.morphColumn.typeColumn.name]:  uid,
      [joinTable.morphColumn.idColumn.name]: sourceId
    })
    .transacting(trx)
    .execute();

  await strapi.db.entityManager
    .createQueryBuilder(joinTable.name)
    .insert(
      records.map((record: Record<string, unknown>) => {
        const { id, ...rest } = record;

        return {
          ...rest,
          [joinTable.morphColumn.idColumn.name]: targetId
        };
      })
    )
    .ignore()
    .transacting(trx)
    .execute();
};

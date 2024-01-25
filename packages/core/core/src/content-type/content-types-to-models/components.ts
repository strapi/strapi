import type { Attribute, Common } from '@strapi/types';
import type { Model } from '@strapi/database';

// TODO: load the relation attribute type from @strapi/database

export const transformComponentAttribute = (
  name: string,
  attribute: Attribute.Component<Common.UID.Component, boolean>,
  model: Model
) => {
  return {
    type: 'relation',
    relation: attribute.repeatable === true ? 'oneToMany' : 'oneToOne',
    target: attribute.component,

    // We need the join table name to be deterministic,
    // We need to allow passing the join table name as an option
    joinTable: {
      name: `${model.tableName}_components`,
      joinColumn: {
        name: 'entity_id',
        referencedColumn: 'id',
      },
      inverseJoinColumn: {
        name: 'component_id',
        referencedColumn: 'id',
      },
      on: {
        field: name,
      },
      orderColumnName: 'order',
      orderBy: {
        order: 'asc',
      },
      pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
    },
  };
};

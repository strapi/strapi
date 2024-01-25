import type { Model } from '@strapi/database';

// TODO: load the relation attribute type from @strapi/database

export const transformDynamicZoneAttribute = (name: string, model: Model) => {
  return {
    type: 'relation',
    relation: 'morphToMany',
    // TODO: handle restrictions at some point
    // target: attribute.components,
    joinTable: {
      name: `${model.tableName}_components`,
      joinColumn: {
        name: 'entity_id',
        referencedColumn: 'id',
      },
      morphColumn: {
        idColumn: {
          name: 'component_id',
          referencedColumn: 'id',
        },
        typeColumn: {
          name: 'component_type',
        },
        typeField: '__component',
      },
      on: {
        field: name,
      },
      orderBy: {
        order: 'asc',
      },
      pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
    },
  };
};

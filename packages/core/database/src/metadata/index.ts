import _ from 'lodash/fp';

import * as types from '../types';
import { createRelation } from './relations';
import { Metadata, Relation } from './types';
import type { Attribute, Model, Meta, ComponentLinkMeta } from './types';

export { Metadata };

// TODO: check if there isn't an attribute with an id already
/**
 * Create Metadata from models configurations
 */
export const createMetadata = (models: Model[] = []): Metadata => {
  const metadata = new Metadata();

  // init pass
  for (const model of _.cloneDeep(models)) {
    if ('id' in model.attributes) {
      throw new Error('The attribute "id" is reserved and cannot be used in a model');
    }

    metadata.add({
      singularName: model.singularName,
      uid: model.uid,
      tableName: model.tableName,
      attributes: {
        id: {
          type: 'increments',
        },
        ...model.attributes,
      },
      lifecycles: model.lifecycles ?? ({} as Meta['lifecycles']),
      indexes: model.indexes || [],
    });
  }

  // build compos / relations
  for (const meta of metadata.values()) {
    if (hasComponentsOrDz(meta)) {
      const compoLinkModelMeta = createCompoLinkModelMeta(meta);
      meta.componentLink = compoLinkModelMeta;
      metadata.add(compoLinkModelMeta);
    }

    for (const [attributeName, attribute] of Object.entries(meta.attributes)) {
      try {
        if (types.isComponent(attribute.type) && hasComponentsOrDz(meta)) {
          createComponent(attributeName, attribute, meta);
          continue;
        }

        if (types.isDynamicZone(attribute.type) && hasComponentsOrDz(meta)) {
          createDynamicZone(attributeName, attribute, meta);
          continue;
        }

        if (types.isRelationalAttribute(attribute)) {
          createRelation(attributeName, attribute, meta, metadata);
          continue;
        }

        createAttribute(attributeName, attribute);
      } catch (error) {
        console.log(error);
        if (error instanceof Error) {
          throw new Error(
            `Error on attribute ${attributeName} in model ${meta.singularName}(${meta.uid}): ${error.message}`
          );
        }
      }
    }
  }

  for (const meta of metadata.values()) {
    const columnToAttribute = Object.keys(meta.attributes).reduce((acc, key) => {
      const attribute = meta.attributes[key];
      if ('columnName' in attribute) {
        return Object.assign(acc, { [attribute.columnName || key]: key });
      }

      return acc;
    }, {});

    meta.columnToAttribute = columnToAttribute;
  }

  metadata.validate();
  return metadata;
};

const hasComponentsOrDz = (model: Meta): model is ComponentLinkMeta => {
  return Object.values(model.attributes).some(
    ({ type }) => types.isComponent(type) || types.isDynamicZone(type)
  );
};

// NOTE: we might just move the compo logic outside this layer too at some point
const createCompoLinkModelMeta = (baseModelMeta: Meta): Meta => {
  return {
    // TODO: make sure there can't be any conflicts with a prefix
    // singularName: 'compo',
    uid: `${baseModelMeta.tableName}_components`,
    tableName: `${baseModelMeta.tableName}_components`,
    attributes: {
      id: {
        type: 'increments',
      },
      entity_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_id: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      component_type: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
      },
    },
    indexes: [
      {
        name: `${baseModelMeta.tableName}_field_index`,
        columns: ['field'],
      },
      {
        name: `${baseModelMeta.tableName}_component_type_index`,
        columns: ['component_type'],
      },
      {
        name: `${baseModelMeta.tableName}_entity_fk`,
        columns: ['entity_id'],
      },
      {
        name: `${baseModelMeta.tableName}_unique`,
        columns: ['entity_id', 'component_id', 'field', 'component_type'],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: `${baseModelMeta.tableName}_entity_fk`,
        columns: ['entity_id'],
        referencedColumns: ['id'],
        referencedTable: baseModelMeta.tableName,
        onDelete: 'CASCADE',
      },
    ],
  };
};

const createDynamicZone = (
  attributeName: string,
  attribute: Attribute,
  meta: ComponentLinkMeta
) => {
  Object.assign(attribute, {
    type: 'relation',
    relation: 'morphToMany',
    // TODO: handle restrictions at some point
    // target: attribute.components,
    joinTable: {
      name: meta.componentLink.tableName,
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
        field: attributeName,
      },
      orderBy: {
        order: 'asc',
      },
      pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
    },
  } satisfies Relation.MorphToMany);
};

const createComponent = (attributeName: string, attribute: Attribute, meta: ComponentLinkMeta) => {
  Object.assign(attribute, {
    type: 'relation',
    relation: 'repeatable' in attribute && attribute.repeatable === true ? 'oneToMany' : 'oneToOne',
    target: 'component' in attribute && attribute.component,
    joinTable: {
      name: meta.componentLink.tableName,
      joinColumn: {
        name: 'entity_id',
        referencedColumn: 'id',
      },
      inverseJoinColumn: {
        name: 'component_id',
        referencedColumn: 'id',
      },
      on: {
        field: attributeName,
      },
      orderColumnName: 'order',
      orderBy: {
        order: 'asc',
      },
      pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
    },
  });
};

const createAttribute = (attributeName: string, attribute: Attribute) => {
  const columnName = _.snakeCase(attributeName);
  Object.assign(attribute, { columnName });
};

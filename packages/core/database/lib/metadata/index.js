'use strict';

const _ = require('lodash/fp');

const types = require('../types');
const { createRelation } = require('./relations');

class Metadata extends Map {
  add(meta) {
    return this.set(meta.uid, meta);
  }
}

// TODO: check if there isn't an attribute with an id already
/**
 * Create Metadata from models configurations
 * @param {object[]} models
 * @returns {Metadata}
 */
const createMetadata = (models = []) => {
  const metadata = new Metadata();

  // init pass
  for (const model of _.cloneDeep(models)) {
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
      lifecycles: model.lifecycles || {},
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
        if (types.isComponent(attribute.type)) {
          createComponent(attributeName, attribute, meta, metadata);
          continue;
        }

        if (types.isDynamicZone(attribute.type)) {
          createDynamicZone(attributeName, attribute, meta, metadata);
          continue;
        }

        if (types.isRelation(attribute.type)) {
          createRelation(attributeName, attribute, meta, metadata);
          continue;
        }

        createAttribute(attributeName, attribute, meta, metadata);
      } catch (error) {
        console.log(error);
        throw new Error(
          `Error on attribute ${attributeName} in model ${meta.singularName}(${meta.uid}): ${error.message}`
        );
      }
    }
  }

  for (const meta of metadata.values()) {
    const columnToAttribute = Object.keys(meta.attributes).reduce((acc, key) => {
      const attribute = meta.attributes[key];
      return Object.assign(acc, { [attribute.columnName || key]: key });
    }, {});

    meta.columnToAttribute = columnToAttribute;
  }

  return metadata;
};

const hasComponentsOrDz = (model) => {
  return Object.values(model.attributes).some(
    ({ type }) => types.isComponent(type) || types.isDynamicZone(type)
  );
};

// NOTE: we might just move the compo logic outside this layer too at some point
const createCompoLinkModelMeta = (baseModelMeta) => {
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
        type: null,
      },
      {
        name: `${baseModelMeta.tableName}_component_type_index`,
        columns: ['component_type'],
        type: null,
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

const createDynamicZone = (attributeName, attribute, meta) => {
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
  });
};

const createComponent = (attributeName, attribute, meta) => {
  Object.assign(attribute, {
    type: 'relation',
    relation: attribute.repeatable === true ? 'oneToMany' : 'oneToOne',
    target: attribute.component,
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

const createAttribute = (attributeName, attribute) => {
  const columnName = _.snakeCase(attributeName);
  Object.assign(attribute, { columnName });
};

module.exports = createMetadata;

'use strict';

const _ = require('lodash/fp');

const types = require('../types');
const { createRelation } = require('./relations');

class Metadata extends Map {
  add(meta) {
    return this.set(meta.uid, meta);
  }

  // FIXME POC - to be discussed
  // Might not be the right place to put this logic?
  hideRelation(modelUID, attributeKey, hidden = true) {
    const meta = this.get(modelUID);

    if (!meta) {
      return;
    }

    for (const [key, value] of Object.entries(meta.attributes)) {
      if (key === attributeKey && value.type === 'relation') {
        value.hidden = hidden;
      }
    }
    return this.set(meta.uid, meta);
  }

  /**
   * Validate the DB metadata, throwing an error if a duplicate DB table name is detected
   */
  validate() {
    const seenTables = new Map();
    for (const meta of this.values()) {
      if (seenTables.get(meta.tableName)) {
        throw new Error(
          `DB table "${meta.tableName}" already exists. Change the collectionName of the related content type.`
        );
      }
      seenTables.set(meta.tableName, true);
    }
  }
}

const getMetadataFromContentType = (model) => ({
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

const enhanceMetadataModel = (metaModel, metadataMap) => {
  if (hasComponentsOrDz(metaModel)) {
    const compoLinkModelMeta = createCompoLinkModelMeta(metaModel);
    metaModel.componentLink = compoLinkModelMeta;
    metadataMap.add(compoLinkModelMeta);
  }

  for (const [attributeName, attribute] of Object.entries(metaModel.attributes)) {
    try {
      if (types.isComponent(attribute.type)) {
        createComponent(attributeName, attribute, metaModel, metadataMap);
        continue;
      }

      if (types.isDynamicZone(attribute.type)) {
        createDynamicZone(attributeName, attribute, metaModel, metadataMap);
        continue;
      }

      if (types.isRelation(attribute.type)) {
        createRelation(attributeName, attribute, metaModel, metadataMap);
        continue;
      }

      createAttribute(attributeName, attribute, metaModel, metadataMap);
    } catch (error) {
      console.log(error);
      throw new Error(
        `Error on attribute ${attributeName} in model ${metaModel.singularName}(${metaModel.uid}): ${error.message}`
      );
    }
  }
};

const assignColumnNameAttribute = (metaModel) => {
  metaModel.columnToAttribute = Object.keys(metaModel.attributes).reduce((acc, key) => {
    const attribute = metaModel.attributes[key];
    return Object.assign(acc, { [attribute.columnName || key]: key });
  }, {});
};

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
    metadata.add(getMetadataFromContentType(model));
  }

  // build compos / relations
  for (const meta of metadata.values()) {
    enhanceMetadataModel(meta, metadata);
  }

  for (const meta of metadata.values()) {
    assignColumnNameAttribute(meta);
  }

  metadata.validate();
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

/**
 * @module relations
 */

'use strict';

const _ = require('lodash/fp');

const hasInversedBy = _.has('inversedBy');
const hasMappedBy = _.has('mappedBy');

const isOneToAny = (attribute) => ['oneToOne', 'oneToMany'].includes(attribute.relation);
const isManyToAny = (attribute) => ['manyToMany', 'manyToOne'].includes(attribute.relation);
const isAnyToOne = (attribute) => ['oneToOne', 'manyToOne'].includes(attribute.relation);
const isAnyToMany = (attribute) => ['oneToMany', 'manyToMany'].includes(attribute.relation);
const isBidirectional = (attribute) => hasInversedBy(attribute) || hasMappedBy(attribute);
const isOwner = (attribute) => !isBidirectional(attribute) || hasInversedBy(attribute);
const shouldUseJoinTable = (attribute) => attribute.useJoinTable !== false;

/**
 * Creates a oneToOne relation metadata
 *
 * if owner then
 *   if with join table then
 *     create join table
 *   else
 *     create joinColumn
 *   if bidirectional then
 *     set inverse attribute joinCol or joinTable info correctly
 * else
 *   this property must be set by the owner side
 *   verify the owner side is valid // should be done before or at the same time ?
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 * @retuns void
 */
const createOneToOne = (attributeName, attribute, meta, metadata) => {
  if (isOwner(attribute)) {
    if (shouldUseJoinTable(attribute)) {
      createJoinTable(metadata, {
        attribute,
        attributeName,
        meta,
      });
    } else {
      createJoinColum(metadata, {
        attribute,
        attributeName,
        meta,
      });
    }
  } else {
    // TODO: verify other side is valid
  }
};

/**
 * Creates a oneToMany relation metadata
 *
 * if unidirectional then
 *   create join table
 * if bidirectional then
 *   cannot be owning side
 *   do nothing
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createOneToMany = (attributeName, attribute, meta, metadata) => {
  if (!isBidirectional(attribute)) {
    createJoinTable(metadata, {
      attribute,
      attributeName,
      meta,
    });
  } else if (isOwner(attribute)) {
    throw new Error('one side of a oneToMany cannot be the owner side in a bidirectional relation');
  }
};

/**
 * Creates a manyToOne relation metadata
 *
 * if unidirectional then
 *   if with join table then
 *     create join table
 *   else
 *     create join column
 * else
 *   must be the owner side
 *   if with join table then
 *     create join table
 *   else
 *     create join column
 *   set inverse attribute joinCol or joinTable info correctly
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createManyToOne = (attributeName, attribute, meta, metadata) => {
  if (isBidirectional(attribute) && !isOwner(attribute)) {
    throw new Error('The many side of a manyToOne must be the owning side');
  }

  if (shouldUseJoinTable(attribute)) {
    createJoinTable(metadata, {
      attribute,
      attributeName,
      meta,
    });
  } else {
    createJoinColum(metadata, {
      attribute,
      attributeName,
      meta,
    });
  }
};

/**
 * Creates a manyToMany relation metadata
 *
 * if unidirectional
 *   create join table
 * else
 *   if owner then
 *     if with join table then
 *       create join table
 *   else
 *     do nothing
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createManyToMany = (attributeName, attribute, meta, metadata) => {
  if (!isBidirectional(attribute) || isOwner(attribute)) {
    createJoinTable(metadata, {
      attribute,
      attributeName,
      meta,
    });
  }
};

/**
 * Creates a morphToOne relation metadata
 *
 * if with join table then
 *   create join table
 * else
 *  create join columnsa
 *
 * if bidirectionnal
 *  set info in the traget
 *
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createMorphToOne = (attributeName, attribute /* meta, metadata */) => {
  const idColumnName = 'target_id';
  const typeColumnName = 'target_type';

  Object.assign(attribute, {
    owner: true,
    morphColumn: {
      // TODO: add referenced column
      typeColumn: {
        name: typeColumnName,
      },
      idColumn: {
        name: idColumnName,
        referencedColumn: 'id',
      },
    },
  });

  // TODO: implement bidirectional
};

/**
 * Creates a morphToMany relation metadata
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createMorphToMany = (attributeName, attribute, meta, metadata) => {
  const joinTableName = _.snakeCase(`${meta.tableName}_${attributeName}_morphs`);

  const joinColumnName = _.snakeCase(`${meta.singularName}_id`);
  const morphColumnName = _.snakeCase(`${attributeName}`);
  const idColumnName = `${morphColumnName}_id`;
  const typeColumnName = `${morphColumnName}_type`;

  metadata.add({
    uid: joinTableName,
    tableName: joinTableName,
    attributes: {
      id: {
        type: 'increments',
      },
      [joinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      [idColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      [typeColumnName]: {
        type: 'string',
      },
      field: {
        type: 'string',
      },
      order: {
        type: 'float',
        column: {
          unsigned: true,
        },
      },
    },
    indexes: [
      {
        name: `${joinTableName}_fk`,
        columns: [joinColumnName],
      },
    ],
    foreignKeys: [
      {
        name: `${joinTableName}_fk`,
        columns: [joinColumnName],
        referencedColumns: ['id'],
        referencedTable: meta.tableName,
        onDelete: 'CASCADE',
      },
    ],
  });

  const joinTable = {
    name: joinTableName,
    joinColumn: {
      name: joinColumnName,
      referencedColumn: 'id',
    },
    morphColumn: {
      typeColumn: {
        name: typeColumnName,
      },
      idColumn: {
        name: idColumnName,
        referencedColumn: 'id',
      },
    },
    orderBy: {
      order: 'asc',
    },
    pivotColumns: [joinColumnName, typeColumnName, idColumnName],
  };

  attribute.joinTable = joinTable;
};

/**
 * Creates a morphOne relation metadata
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createMorphOne = (attributeName, attribute, meta, metadata) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Morph target not found. Looking for ${attribute.target}`);
  }

  if (!_.has(attribute.morphBy, targetMeta.attributes)) {
    throw new Error(`Morph target attribute not found. Looking for ${attribute.morphBy}`);
  }
};

/**
 * Creates a morphMany relation metadata
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createMorphMany = (attributeName, attribute, meta, metadata) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Morph target not found. Looking for ${attribute.target}`);
  }

  if (!_.has(attribute.morphBy, targetMeta.attributes)) {
    throw new Error(`Morph target attribute not found. Looking for ${attribute.morphBy}`);
  }
};

/**
 * Creates a relation metadata
 *
 * @param {string} attributeName
 * @param {Attribute} attribute
 * @param {ModelMetadata} meta
 * @param {Metadata} metadata
 */
const createRelation = (attributeName, attribute, meta, metadata) => {
  switch (attribute.relation) {
    case 'oneToOne':
      return createOneToOne(attributeName, attribute, meta, metadata);
    case 'oneToMany':
      return createOneToMany(attributeName, attribute, meta, metadata);
    case 'manyToOne':
      return createManyToOne(attributeName, attribute, meta, metadata);
    case 'manyToMany':
      return createManyToMany(attributeName, attribute, meta, metadata);
    case 'morphToOne':
      return createMorphToOne(attributeName, attribute, meta, metadata);
    case 'morphToMany':
      return createMorphToMany(attributeName, attribute, meta, metadata);
    case 'morphOne':
      return createMorphOne(attributeName, attribute, meta, metadata);
    case 'morphMany':
      return createMorphMany(attributeName, attribute, meta, metadata);
    default: {
      throw new Error(`Unknown relation ${attribute.relation}`);
    }
  }
};

/**
 * Creates a join column info and add them to the attribute meta
 * @param {Object} metadata metadata registry
 * @param {Object} param
 * @param {Object} param.attribute associated attribute
 * @param {string} param.attributeName name of the associated attribute
 * @param {Object} param.meta model metadata
 */
const createJoinColum = (metadata, { attribute, attributeName /* meta */ }) => {
  const targetMeta = metadata.get(attribute.target);

  const joinColumnName = _.snakeCase(`${attributeName}_id`);
  const joinColumn = {
    name: joinColumnName,
    referencedColumn: 'id',
    referencedTable: targetMeta.tableName,
  };

  Object.assign(attribute, { owner: true, joinColumn });

  if (isBidirectional(attribute)) {
    const inverseAttribute = targetMeta.attributes[attribute.inversedBy];

    Object.assign(inverseAttribute, {
      joinColumn: {
        name: joinColumn.referencedColumn,
        referencedColumn: joinColumn.name,
      },
    });
  }
};

/**
 * Creates a join table and add it to the attribute meta
 * @param {Object} metadata metadata registry
 * @param {Object} param
 * @param {Object} param.attribute associated attribute
 * @param {string} param.attributeName name of the associated attribute
 * @param {Object} param.meta model metadata
 */
const createJoinTable = (metadata, { attributeName, attribute, meta }) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

  const joinTableName = _.snakeCase(`${meta.tableName}_${attributeName}_links`);

  const joinColumnName = _.snakeCase(`${meta.singularName}_id`);
  let inverseJoinColumnName = _.snakeCase(`${targetMeta.singularName}_id`);

  // if relation is self referencing
  if (joinColumnName === inverseJoinColumnName) {
    inverseJoinColumnName = `inv_${inverseJoinColumnName}`;
  }

  const orderColumnName = _.snakeCase(`${targetMeta.singularName}_order`);
  let inverseOrderColumnName = _.snakeCase(`${meta.singularName}_order`);

  // if relation is self referencing
  if (attribute.relation === 'manyToMany' && joinColumnName === inverseJoinColumnName) {
    inverseOrderColumnName = `inv_${inverseOrderColumnName}`;
  }

  const metadataSchema = {
    uid: joinTableName,
    tableName: joinTableName,
    attributes: {
      id: {
        type: 'increments',
      },
      [joinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      [inverseJoinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      // TODO: add extra pivot attributes -> user should use an intermediate entity
    },
    indexes: [
      {
        name: `${joinTableName}_fk`,
        columns: [joinColumnName],
      },
      {
        name: `${joinTableName}_inv_fk`,
        columns: [inverseJoinColumnName],
      },
      {
        name: `${joinTableName}_unique`,
        columns: [joinColumnName, inverseJoinColumnName],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: `${joinTableName}_fk`,
        columns: [joinColumnName],
        referencedColumns: ['id'],
        referencedTable: meta.tableName,
        onDelete: 'CASCADE',
      },
      {
        name: `${joinTableName}_inv_fk`,
        columns: [inverseJoinColumnName],
        referencedColumns: ['id'],
        referencedTable: targetMeta.tableName,
        onDelete: 'CASCADE',
      },
    ],
  };

  const joinTable = {
    name: joinTableName,
    joinColumn: {
      name: joinColumnName,
      referencedColumn: 'id',
    },
    inverseJoinColumn: {
      name: inverseJoinColumnName,
      referencedColumn: 'id',
    },
    pivotColumns: [joinColumnName, inverseJoinColumnName],
  };

  // order
  if (isAnyToMany(attribute)) {
    metadataSchema.attributes[orderColumnName] = {
      type: 'float',
      column: {
        unsigned: true,
        defaultTo: null,
      },
    };
    metadataSchema.indexes.push({
      name: `${joinTableName}_order_fk`,
      columns: [orderColumnName],
    });
    joinTable.orderColumnName = orderColumnName;
    joinTable.orderBy = { [orderColumnName]: 'asc' };
  }

  // inv order
  if (isBidirectional(attribute) && isManyToAny(attribute)) {
    metadataSchema.attributes[inverseOrderColumnName] = {
      type: 'float',
      column: {
        unsigned: true,
        defaultTo: null,
      },
    };

    metadataSchema.indexes.push({
      name: `${joinTableName}_order_inv_fk`,
      columns: [inverseOrderColumnName],
    });

    joinTable.inverseOrderColumnName = inverseOrderColumnName;
  }

  metadata.add(metadataSchema);

  attribute.joinTable = joinTable;

  if (isBidirectional(attribute)) {
    const inverseAttribute = targetMeta.attributes[attribute.inversedBy];

    if (!inverseAttribute) {
      throw new Error(
        `inversedBy attribute ${attribute.inversedBy} not found target ${targetMeta.uid}`
      );
    }

    inverseAttribute.joinTable = {
      name: joinTableName,
      joinColumn: joinTable.inverseJoinColumn,
      inverseJoinColumn: joinTable.joinColumn,
      pivotColumns: joinTable.pivotColumns,
    };

    if (isManyToAny(attribute)) {
      inverseAttribute.joinTable.orderColumnName = inverseOrderColumnName;
      inverseAttribute.joinTable.orderBy = { [inverseOrderColumnName]: 'asc' };
    }
    if (isAnyToMany(attribute)) {
      inverseAttribute.joinTable.inverseOrderColumnName = orderColumnName;
    }
  }
};

const hasOrderColumn = (attribute) => isAnyToMany(attribute);
const hasInverseOrderColumn = (attribute) => isBidirectional(attribute) && isManyToAny(attribute);

module.exports = {
  createRelation,

  isBidirectional,
  isOneToAny,
  isManyToAny,
  isAnyToOne,
  isAnyToMany,
  hasOrderColumn,
  hasInverseOrderColumn,
};

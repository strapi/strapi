/**
 * @module relations
 */

'use strict';

const _ = require('lodash/fp');

const hasInversedBy = _.has('inversedBy');
const hasMappedBy = _.has('mappedBy');

const isBidirectional = attribute => hasInversedBy(attribute) || hasMappedBy(attribute);
const isOwner = attribute => !isBidirectional(attribute) || hasInversedBy(attribute);
const shouldUseJoinTable = attribute => attribute.useJoinTable !== false;

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
  } else {
    if (isOwner(attribute)) {
      throw new Error(
        'one side of a oneToMany cannot be the owner side in a bidirectional relation'
      );
    }
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
const createMorphToOne = (attributeName, attribute /*meta, metadata*/) => {
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
      // TODO: add field
      order: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
    },
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

const relationFactoryMap = {
  oneToOne: createOneToOne,
  oneToMany: createOneToMany,
  manyToOne: createManyToOne,
  manyToMany: createManyToMany,
  morphToOne: createMorphToOne,
  morphToMany: createMorphToMany,
  morphOne: createMorphOne,
  morphMany: createMorphMany,
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
  if (_.has(attribute.relation, relationFactoryMap)) {
    return relationFactoryMap[attribute.relation](attributeName, attribute, meta, metadata);
  }

  throw new Error(`Unknown relation ${attribute.relation}`);
};

const createJoinColum = (metadata, { attribute, attributeName /*meta */ }) => {
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

const createJoinTable = (metadata, { attributeName, attribute, meta }) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Unknow target ${attribute.target}`);
  }

  const joinTableName = _.snakeCase(`${meta.tableName}_${attributeName}_links`);

  let joinColumnName = _.snakeCase(`${meta.singularName}_id`);
  let inverseJoinColumnName = _.snakeCase(`${targetMeta.singularName}_id`);

  // if relation is slef referencing
  if (joinColumnName === inverseJoinColumnName) {
    inverseJoinColumnName = `inv_${inverseJoinColumnName}`;
  }

  metadata.add({
    uid: joinTableName,
    tableName: joinTableName,
    attributes: {
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
  });

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
  };

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
    };
  }
};

module.exports = {
  createRelation,

  isBidirectional,
};

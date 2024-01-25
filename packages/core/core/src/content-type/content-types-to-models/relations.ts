import _ from 'lodash/fp';
import type { Model } from '@strapi/database';

import type { Context } from './types';

interface JoinColumnOptions {
  attribute: any;
  attributeName: string;
  model: Model;
}

interface JoinTableOptions {
  attribute: any;
  attributeName: string;
  model: Model;
}

const hasInversedBy = (attr: any) => 'inversedBy' in attr;
const hasMappedBy = (attr: any) => 'mappedBy' in attr;

export const isPolymorphic = (attribute: any) =>
  ['morphOne', 'morphMany', 'morphToOne', 'morphToMany'].includes(attribute.relation);

export const isOneToAny = (attribute: any) =>
  ['oneToOne', 'oneToMany'].includes(attribute.relation);

export const isManyToAny = (attribute: any) =>
  ['manyToMany', 'manyToOne'].includes(attribute.relation);

export const isAnyToOne = (attribute: any) =>
  ['oneToOne', 'manyToOne'].includes(attribute.relation);

export const isAnyToMany = (attribute: any) =>
  ['oneToMany', 'manyToMany'].includes(attribute.relation);

export const isBidirectional = (attribute: any) =>
  hasInversedBy(attribute) || hasMappedBy(attribute);

const isOwner = (attribute: any) => !isBidirectional(attribute) || hasInversedBy(attribute);

const shouldUseJoinTable = (attribute: any) =>
  !('useJoinTable' in attribute) || attribute.useJoinTable !== false;

export const getJoinTableName = (tableName: string, attributeName: string) =>
  _.snakeCase(`${tableName}_${attributeName}_links`);

export const hasOrderColumn = (attribute: any) => isAnyToMany(attribute);
export const hasInverseOrderColumn = (attribute: any) =>
  isBidirectional(attribute) && isManyToAny(attribute);

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
 */
const createOneToOne = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  if (isOwner(attribute)) {
    if (shouldUseJoinTable(attribute)) {
      createJoinTable(ctx, {
        attribute,
        attributeName,
        model,
      });
    } else {
      createJoinColum(ctx, {
        attribute,
        attributeName,
        model,
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
 */
const createOneToMany = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  if (!isBidirectional(attribute)) {
    createJoinTable(ctx, {
      attribute,
      attributeName,
      model,
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
 */
const createManyToOne = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  if (isBidirectional(attribute) && !isOwner(attribute)) {
    throw new Error('The many side of a manyToOne must be the owning side');
  }

  if (shouldUseJoinTable(attribute)) {
    createJoinTable(ctx, {
      attribute,
      attributeName,
      model,
    });
  } else {
    createJoinColum(ctx, {
      attribute,
      attributeName,
      model,
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
 */
const createManyToMany = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  if (!isBidirectional(attribute) || isOwner(attribute)) {
    createJoinTable(ctx, {
      attribute,
      attributeName,
      model,
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
 */
const createMorphToOne = (attributeName: string, attribute: any) => {
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
 */
const createMorphToMany = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  const joinTableName = _.snakeCase(`${model.tableName}_${attributeName}_morphs`);

  const joinColumnName = _.snakeCase(`${model.singularName}_id`);
  const morphColumnName = _.snakeCase(`${attributeName}`);
  const idColumnName = `${morphColumnName}_id`;
  const typeColumnName = `${morphColumnName}_type`;

  ctx.models[joinTableName] = {
    singularName: joinTableName,
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
      {
        name: `${joinTableName}_order_index`,
        columns: ['order'],
      },
      {
        name: `${joinTableName}_id_column_index`,
        columns: [idColumnName],
      },
    ],
    foreignKeys: [
      {
        name: `${joinTableName}_fk`,
        columns: [joinColumnName],
        referencedColumns: ['id'],
        referencedTable: model.tableName!,
        onDelete: 'CASCADE',
      },
    ],
    lifecycles: {},
  };

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
      order: 'asc' as const,
    },
    pivotColumns: [joinColumnName, typeColumnName, idColumnName],
  };

  attribute.joinTable = joinTable;
};

/**
 * Creates a morphOne relation metadata
 */
const createMorphOne = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  const targetModel = ctx.models[attribute.target];

  if (!targetModel) {
    throw new Error(`Morph target not found. Looking for ${attribute.target}`);
  }

  if (attribute.morphBy && !_.has(attribute.morphBy, targetModel.attributes)) {
    throw new Error(`Morph target attribute not found. Looking for ${attribute.morphBy}`);
  }
};

/**
 * Creates a morphMany relation metadata
 */
const createMorphMany = (attributeName: string, attribute: any, model: Model, ctx: Context) => {
  const targetModel = ctx.models[attribute.target];

  if (!targetModel) {
    throw new Error(`Morph target not found. Looking for ${attribute.target}`);
  }

  if (attribute.morphBy && !_.has(attribute.morphBy, targetModel.attributes)) {
    throw new Error(`Morph target attribute not found. Looking for ${attribute.morphBy}`);
  }
};

/**
 * Creates a join column info and add them to the attribute meta
 */
const createJoinColum = (ctx: Context, { attribute, attributeName }: JoinColumnOptions) => {
  const targetModel = ctx.models[attribute.target];

  if (!targetModel) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

  const joinColumnName = _.snakeCase(`${attributeName}_id`);
  const joinColumn = {
    name: joinColumnName,
    referencedColumn: 'id',
    referencedTable: targetModel.tableName,
  };

  Object.assign(attribute, { owner: true, joinColumn });

  if (isBidirectional(attribute)) {
    const inverseAttribute = targetModel.attributes[attribute.inversedBy];

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
 */
const createJoinTable = (ctx: Context, { attributeName, attribute, model }: JoinTableOptions) => {
  const targetModel = ctx.models[attribute.target];

  if (!targetModel) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

  const joinTableName = getJoinTableName(model.tableName, attributeName);

  const joinColumnName = _.snakeCase(`${model.singularName}_id`);
  let inverseJoinColumnName = _.snakeCase(`${targetModel.singularName}_id`);

  // if relation is self referencing
  if (joinColumnName === inverseJoinColumnName) {
    inverseJoinColumnName = `inv_${inverseJoinColumnName}`;
  }

  const orderColumnName = _.snakeCase(`${targetModel.singularName}_order`);
  let inverseOrderColumnName = _.snakeCase(`${model.singularName}_order`);

  // if relation is self referencing
  if (attribute.relation === 'manyToMany' && orderColumnName === inverseOrderColumnName) {
    inverseOrderColumnName = `inv_${inverseOrderColumnName}`;
  }

  const metadataSchema: Model = {
    singularName: joinTableName,
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
        referencedTable: model.tableName,
        onDelete: 'CASCADE',
      },
      {
        name: `${joinTableName}_inv_fk`,
        columns: [inverseJoinColumnName],
        referencedColumns: ['id'],
        referencedTable: targetModel.tableName,
        onDelete: 'CASCADE',
      },
    ],
    lifecycles: {},
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
  } as any;

  // order
  if (isAnyToMany(attribute)) {
    metadataSchema.attributes[orderColumnName] = {
      type: 'float',
      column: {
        unsigned: true,
        defaultTo: null,
      },
    };

    metadataSchema.indexes?.push({
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

    metadataSchema.indexes?.push({
      name: `${joinTableName}_order_inv_fk`,
      columns: [inverseOrderColumnName],
    });

    joinTable.inverseOrderColumnName = inverseOrderColumnName;
  }

  ctx.models[metadataSchema.uid] = metadataSchema;

  attribute.joinTable = joinTable;

  if (isBidirectional(attribute)) {
    const inverseAttribute: any = attribute.inversedBy
      ? ctx.models[targetModel.uid].attributes[attribute.inversedBy]
      : null;

    if (!inverseAttribute) {
      throw new Error(
        `inversedBy attribute ${attribute.inversedBy} not found target ${targetModel.uid}`
      );
    }

    if (inverseAttribute.type !== 'relation') {
      throw new Error(
        `inversedBy attribute ${attribute.inversedBy} targets non relational attribute in ${targetModel.uid}`
      );
    }

    inverseAttribute.joinTable = {
      name: joinTableName,
      joinColumn: joinTable.inverseJoinColumn,
      inverseJoinColumn: joinTable.joinColumn,
      pivotColumns: joinTable.pivotColumns,
    } as any;

    if (isManyToAny(attribute)) {
      inverseAttribute.joinTable.orderColumnName = inverseOrderColumnName;
      inverseAttribute.joinTable.orderBy = { [inverseOrderColumnName]: 'asc' };
    }
    if (isAnyToMany(attribute)) {
      inverseAttribute.joinTable.inverseOrderColumnName = orderColumnName;
    }
  }
};

/**
 * Creates a relation metadata
 */
export const transformRelationAttribute = (
  attributeName: string,
  attribute: any,
  model: Model,
  ctx: Context
) => {
  switch (attribute.relation) {
    case 'oneToOne':
      return createOneToOne(attributeName, attribute, model, ctx);
    case 'oneToMany':
      return createOneToMany(attributeName, attribute, model, ctx);
    case 'manyToOne':
      return createManyToOne(attributeName, attribute, model, ctx);
    case 'manyToMany':
      return createManyToMany(attributeName, attribute, model, ctx);
    case 'morphToOne':
      return createMorphToOne(attributeName, attribute);
    case 'morphToMany':
      return createMorphToMany(attributeName, attribute, model, ctx);
    case 'morphOne':
      return createMorphOne(attributeName, attribute, model, ctx);
    case 'morphMany':
      return createMorphMany(attributeName, attribute, model, ctx);
    default: {
      throw new Error(`Unknown relation`);
    }
  }
};

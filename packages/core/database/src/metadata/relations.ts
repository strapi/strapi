import _ from 'lodash/fp';

import type { Meta, Metadata } from './metadata';
import type { RelationalAttribute, Relation, MorphJoinTable } from '../types';

interface JoinColumnOptions {
  attribute: (Relation.OneToOne | Relation.ManyToOne) & Relation.Owner;
  attributeName: string;
  meta: Meta;
}

interface JoinTableOptions {
  attribute: RelationalAttribute & Relation.WithTarget & Relation.Bidirectional;
  attributeName: string;
  meta: Meta;
}

const hasInversedBy = (
  attr: RelationalAttribute
): attr is RelationalAttribute & { inversedBy: boolean } => 'inversedBy' in attr;
const hasMappedBy = (
  attr: RelationalAttribute
): attr is RelationalAttribute & { inversedBy: boolean } => 'mappedBy' in attr;

export const isPolymorphic = (attribute: RelationalAttribute): attribute is Relation.Morph =>
  ['morphOne', 'morphMany', 'morphToOne', 'morphToMany'].includes(attribute.relation);

export const isOneToAny = (
  attribute: RelationalAttribute
): attribute is Relation.OneToOne | Relation.OneToMany =>
  ['oneToOne', 'oneToMany'].includes(attribute.relation);

export const isManyToAny = (
  attribute: RelationalAttribute
): attribute is Relation.ManyToOne | Relation.ManyToMany =>
  ['manyToMany', 'manyToOne'].includes(attribute.relation);

export const isAnyToOne = (
  attribute: RelationalAttribute
): attribute is Relation.OneToOne | Relation.ManyToOne =>
  ['oneToOne', 'manyToOne'].includes(attribute.relation);

export const isAnyToMany = (
  attribute: RelationalAttribute
): attribute is Relation.OneToMany | Relation.ManyToMany =>
  ['oneToMany', 'manyToMany'].includes(attribute.relation);

export const isBidirectional = (
  attribute: RelationalAttribute
): attribute is Relation.Bidirectional => hasInversedBy(attribute) || hasMappedBy(attribute);

const isOwner = (
  attribute: RelationalAttribute
): attribute is RelationalAttribute & Relation.Owner =>
  !isBidirectional(attribute) || hasInversedBy(attribute);

const shouldUseJoinTable = (attribute: RelationalAttribute) =>
  !('useJoinTable' in attribute) || attribute.useJoinTable !== false;

export const getJoinTableName = (tableName: string, attributeName: string) =>
  _.snakeCase(`${tableName}_${attributeName}_links`);

export const hasOrderColumn = (attribute: RelationalAttribute) => isAnyToMany(attribute);
export const hasInverseOrderColumn = (attribute: RelationalAttribute) =>
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
const createOneToOne = (
  attributeName: string,
  attribute: Relation.OneToOne,
  meta: Meta,
  metadata: Metadata
) => {
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
 */
const createOneToMany = (
  attributeName: string,
  attribute: Relation.OneToMany,
  meta: Meta,
  metadata: Metadata
) => {
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
 */
const createManyToOne = (
  attributeName: string,
  attribute: Relation.ManyToOne,
  meta: Meta,
  metadata: Metadata
) => {
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
 */
const createManyToMany = (
  attributeName: string,
  attribute: Relation.ManyToMany,
  meta: Meta,
  metadata: Metadata
) => {
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
 */
const createMorphToOne = (attributeName: string, attribute: Relation.MorphToOne) => {
  // TODO: (breaking) support ${attributeName}_id and ${attributeName}_type as default column names
  const idColumnName = `target_id`;
  const typeColumnName = `target_type`;

  Object.assign(attribute, {
    owner: true,
    morphColumn: attribute.morphColumn ?? {
      typeColumn: {
        name: typeColumnName,
      },
      idColumn: {
        name: idColumnName,
        referencedColumn: 'id',
      },
    },
  });
};

/**
 * Creates a morphToMany relation metadata
 */
const createMorphToMany = (
  attributeName: string,
  attribute: Relation.MorphToMany,
  meta: Meta,
  metadata: Metadata
) => {
  const joinTableName = _.snakeCase(`${meta.tableName}_${attributeName}_morphs`);

  const joinColumnName = _.snakeCase(`${meta.singularName}_id`);
  const morphColumnName = _.snakeCase(`${attributeName}`);
  const idColumnName = `${morphColumnName}_id`;
  const typeColumnName = `${morphColumnName}_type`;

  metadata.add({
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
        referencedTable: meta.tableName,
        onDelete: 'CASCADE',
      },
    ],
    lifecycles: {},
    columnToAttribute: {},
  });

  const joinTable: MorphJoinTable = {
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
const createMorphOne = (
  attributeName: string,
  attribute: Relation.MorphOne,
  meta: Meta,
  metadata: Metadata
) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Morph target not found. Looking for ${attribute.target}`);
  }

  if (attribute.morphBy && !_.has(attribute.morphBy, targetMeta.attributes)) {
    throw new Error(`Morph target attribute not found. Looking for ${attribute.morphBy}`);
  }
};

/**
 * Creates a morphMany relation metadata
 */
const createMorphMany = (
  attributeName: string,
  attribute: Relation.MorphMany,
  meta: Meta,
  metadata: Metadata
) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Morph target not found. Looking for ${attribute.target}`);
  }

  if (attribute.morphBy && !_.has(attribute.morphBy, targetMeta.attributes)) {
    throw new Error(`Morph target attribute not found. Looking for ${attribute.morphBy}`);
  }
};

/**
 * Creates a join column info and add them to the attribute meta
 */
const createJoinColum = (metadata: Metadata, { attribute, attributeName }: JoinColumnOptions) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

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
 */
const createJoinTable = (
  metadata: Metadata,
  { attributeName, attribute, meta }: JoinTableOptions
) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

  const joinTableName = getJoinTableName(meta.tableName, attributeName);

  const joinColumnName = _.snakeCase(`${meta.singularName}_id`);
  let inverseJoinColumnName = _.snakeCase(`${targetMeta.singularName}_id`);

  // if relation is self referencing
  if (joinColumnName === inverseJoinColumnName) {
    inverseJoinColumnName = `inv_${inverseJoinColumnName}`;
  }

  const orderColumnName = _.snakeCase(`${targetMeta.singularName}_order`);
  let inverseOrderColumnName = _.snakeCase(`${meta.singularName}_order`);

  // if relation is self referencing
  if (attribute.relation === 'manyToMany' && orderColumnName === inverseOrderColumnName) {
    inverseOrderColumnName = `inv_${inverseOrderColumnName}`;
  }

  const metadataSchema: Meta = {
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
    lifecycles: {},
    columnToAttribute: {},
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
    const inverseAttribute = attribute.inversedBy
      ? (targetMeta.attributes[attribute.inversedBy] as Relation.Bidirectional)
      : null;

    if (!inverseAttribute) {
      throw new Error(
        `inversedBy attribute ${attribute.inversedBy} not found target ${targetMeta.uid}`
      );
    }

    if (inverseAttribute.type !== 'relation') {
      throw new Error(
        `inversedBy attribute ${attribute.inversedBy} targets non relational attribute in ${targetMeta.uid}`
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
export const createRelation = (
  attributeName: string,
  attribute: RelationalAttribute,
  meta: Meta,
  metadata: Metadata
) => {
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
      return createMorphToOne(attributeName, attribute);
    case 'morphToMany':
      return createMorphToMany(attributeName, attribute, meta, metadata);
    case 'morphOne':
      return createMorphOne(attributeName, attribute, meta, metadata);
    case 'morphMany':
      return createMorphMany(attributeName, attribute, meta, metadata);
    default: {
      throw new Error(`Unknown relation`);
    }
  }
};

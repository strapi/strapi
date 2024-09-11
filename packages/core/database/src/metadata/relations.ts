import _, { snakeCase } from 'lodash/fp';

import { identifiers } from '../utils/identifiers';
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

const ID = identifiers.ID_COLUMN;
const ORDER = identifiers.ORDER_COLUMN;
const FIELD = identifiers.FIELD_COLUMN;

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
      createJoinColumn(metadata, {
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
  if (shouldUseJoinTable(attribute) && !isBidirectional(attribute)) {
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
    createJoinColumn(metadata, {
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
  if (shouldUseJoinTable(attribute) && (!isBidirectional(attribute) || isOwner(attribute))) {
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
  const idColumnName = identifiers.getJoinColumnAttributeIdName('target');
  const typeColumnName = identifiers.getMorphColumnTypeName('target');

  Object.assign(attribute, {
    owner: true,
    morphColumn: attribute.morphColumn ?? {
      typeColumn: {
        name: typeColumnName,
      },
      idColumn: {
        name: idColumnName,
        referencedColumn: ID,
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
  if ('joinTable' in attribute && attribute.joinTable && !attribute.joinTable.__internal__) {
    return;
  }

  const joinTableName = identifiers.getMorphTableName(meta.tableName, attributeName);
  const joinColumnName = identifiers.getMorphColumnJoinTableIdName(snakeCase(meta.singularName));
  const idColumnName = identifiers.getMorphColumnAttributeIdName(attributeName);
  const typeColumnName = identifiers.getMorphColumnTypeName(attributeName);

  const fkIndexName = identifiers.getFkIndexName(joinTableName);

  metadata.add({
    singularName: joinTableName,
    uid: joinTableName,
    tableName: joinTableName,
    attributes: {
      [ID]: {
        type: 'increments',
      },
      [joinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
        // This must be set explicitly so that it is used instead of shortening the attribute name, which is already shortened
        columnName: joinColumnName,
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
      [FIELD]: {
        type: 'string',
      },
      [ORDER]: {
        type: 'float',
        column: {
          unsigned: true,
        },
      },
    },
    indexes: [
      {
        name: fkIndexName,
        columns: [joinColumnName],
      },
      {
        name: identifiers.getOrderIndexName(joinTableName),
        columns: [ORDER],
      },
      {
        name: identifiers.getIdColumnIndexName(joinTableName),
        columns: [idColumnName],
      },
    ],
    foreignKeys: [
      {
        name: fkIndexName,
        columns: [joinColumnName],
        referencedColumns: [ID],
        referencedTable: meta.tableName,
        onDelete: 'CASCADE',
      },
    ],
    lifecycles: {},
    columnToAttribute: {},
  });

  const joinTable: MorphJoinTable = {
    __internal__: true,
    name: joinTableName,
    joinColumn: {
      name: joinColumnName,
      referencedColumn: ID,
    },
    morphColumn: {
      typeColumn: {
        name: typeColumnName,
      },
      idColumn: {
        name: idColumnName,
        referencedColumn: ID,
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
const createJoinColumn = (metadata: Metadata, { attribute, attributeName }: JoinColumnOptions) => {
  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

  const joinColumnName = identifiers.getJoinColumnAttributeIdName(snakeCase(attributeName));
  const joinColumn = {
    name: joinColumnName,
    referencedColumn: ID,
    referencedTable: targetMeta.tableName,
  };

  if ('joinColumn' in attribute) {
    Object.assign(joinColumn, attribute.joinColumn);
  }

  Object.assign(attribute, { owner: true, joinColumn });

  if (isBidirectional(attribute)) {
    const inverseAttribute = targetMeta.attributes[attribute.inversedBy];

    Object.assign(inverseAttribute, {
      joinColumn: {
        name: joinColumn.referencedColumn,
        referencedColumn: joinColumnName,
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
  if (!shouldUseJoinTable(attribute)) {
    throw new Error('Attempted to create join table when useJoinTable is false');
  }

  const targetMeta = metadata.get(attribute.target);

  if (!targetMeta) {
    throw new Error(`Unknown target ${attribute.target}`);
  }

  // TODO: implement overwrite logic instead
  if ('joinTable' in attribute && attribute.joinTable && !attribute.joinTable.__internal__) {
    return;
  }

  const joinTableName = identifiers.getJoinTableName(
    snakeCase(meta.tableName),
    snakeCase(attributeName)
  );

  const joinColumnName = identifiers.getJoinColumnAttributeIdName(snakeCase(meta.singularName));

  let inverseJoinColumnName = identifiers.getJoinColumnAttributeIdName(
    snakeCase(targetMeta.singularName)
  );

  // if relation is self referencing
  if (joinColumnName === inverseJoinColumnName) {
    inverseJoinColumnName = identifiers.getInverseJoinColumnAttributeIdName(
      snakeCase(targetMeta.singularName)
    );
  }

  const orderColumnName = identifiers.getOrderColumnName(snakeCase(targetMeta.singularName));
  // TODO: should this plus the conditional below be rolled into one method?
  let inverseOrderColumnName = identifiers.getOrderColumnName(snakeCase(meta.singularName));

  // if relation is self referencing
  if (attribute.relation === 'manyToMany' && orderColumnName === inverseOrderColumnName) {
    inverseOrderColumnName = identifiers.getInverseOrderColumnName(snakeCase(meta.singularName));
  }

  const fkIndexName = identifiers.getFkIndexName(joinTableName);
  const invFkIndexName = identifiers.getInverseFkIndexName(joinTableName);

  const metadataSchema: Meta = {
    singularName: joinTableName,
    uid: joinTableName,
    tableName: joinTableName,
    attributes: {
      [ID]: {
        type: 'increments',
      },
      [joinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
        // This must be set explicitly so that it is used instead of shortening the attribute name, which is already shortened
        columnName: joinColumnName,
      },
      [inverseJoinColumnName]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
        // This must be set explicitly so that it is used instead of shortening the attribute name, which is already shortened
        columnName: inverseJoinColumnName,
      },
      // TODO: add extra pivot attributes -> user should use an intermediate entity
    },
    indexes: [
      {
        name: fkIndexName,
        columns: [joinColumnName],
      },
      {
        name: invFkIndexName,
        columns: [inverseJoinColumnName],
      },
      {
        name: identifiers.getUniqueIndexName(joinTableName),
        columns: [joinColumnName, inverseJoinColumnName],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: fkIndexName,
        columns: [joinColumnName],
        referencedColumns: [ID],
        referencedTable: meta.tableName,
        onDelete: 'CASCADE',
      },
      {
        name: invFkIndexName,
        columns: [inverseJoinColumnName],
        referencedColumns: [ID],
        referencedTable: targetMeta.tableName,
        onDelete: 'CASCADE',
      },
    ],
    lifecycles: {},
    columnToAttribute: {},
  };

  const joinTable = {
    __internal__: true,
    name: joinTableName,
    joinColumn: {
      name: joinColumnName,
      referencedColumn: ID,
      referencedTable: meta.tableName,
    },
    inverseJoinColumn: {
      name: inverseJoinColumnName,
      referencedColumn: ID,
      referencedTable: targetMeta.tableName,
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
      columnName: orderColumnName,
    };
    metadataSchema.indexes.push({
      name: identifiers.getOrderFkIndexName(joinTableName),
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
      columnName: inverseOrderColumnName,
    };

    metadataSchema.indexes.push({
      name: identifiers.getOrderInverseFkIndexName(joinTableName),
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
      __internal__: true,
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

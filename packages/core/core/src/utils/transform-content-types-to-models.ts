import { type Model, type MetadataOptions, utils } from '@strapi/database';
import { Schema, Attribute } from '@strapi/types';
import { createId } from '@paralleldrive/cuid2';
import assert from 'node:assert';
import _ from 'lodash/fp';

const { identifiers } = utils;

/**
 * Because strapi/database models don't know about things like components or dynamic zones, we use this file to convert them
 * to a relations format that it recognizes
 *
 * Therefore we have to keep an additional set of helpers/extensions to the database naming methods
 */

export const COMPONENT_JOIN_TABLE_SUFFIX = 'components';
export const DZ_JOIN_TABLE_SUFFIX = 'components';
export const COMPONENT_INVERSE_COLUMN_NAME = 'component';
export const COMPONENT_TYPE_COLUMN = 'component_type';
export const ENTITY = 'entity';

export const getComponentJoinTableName = (collectionName: string, options: MetadataOptions) =>
  identifiers.getTableName(collectionName, { suffix: COMPONENT_JOIN_TABLE_SUFFIX, ...options });

export const getDzJoinTableName = (collectionName: string, options: MetadataOptions) =>
  identifiers.getTableName(collectionName, { suffix: DZ_JOIN_TABLE_SUFFIX, ...options });

const { ID_COLUMN: id, FIELD_COLUMN: field, ORDER_COLUMN: order } = identifiers;

export type LoadedContentTypeModel = Schema.ContentType &
  Required<Pick<Schema.ContentType, 'collectionName' | 'uid' | 'modelName'>>;

// Transforms an attribute (particularly for relation types) into the format that strapi/database accepts
export const transformAttribute = (
  name: string,
  attribute: Attribute.Any,
  contentType: LoadedContentTypeModel,
  options: MetadataOptions
) => {
  switch (attribute.type) {
    case 'media': {
      return {
        type: 'relation',
        relation: attribute.multiple === true ? 'morphMany' : 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      };
    }
    case 'component': {
      const joinTableName = getComponentJoinTableName(contentType.collectionName, options);
      const joinColumnEntityName = identifiers.getJoinColumnAttributeIdName(ENTITY, options);
      const joinColumnInverseName = identifiers.getJoinColumnAttributeIdName(
        COMPONENT_INVERSE_COLUMN_NAME,
        options
      );

      return {
        type: 'relation',
        relation: attribute.repeatable === true ? 'oneToMany' : 'oneToOne',
        target: attribute.component,

        // We need the join table name to be deterministic,
        // We need to allow passing the join table name as an option
        joinTable: {
          name: joinTableName,
          joinColumn: {
            name: joinColumnEntityName,
            referencedColumn: id,
          },
          inverseJoinColumn: {
            name: joinColumnInverseName,
            referencedColumn: id,
          },
          on: {
            field: name,
          },
          orderColumnName: order,
          orderBy: {
            order: 'asc',
          },
          pivotColumns: [joinColumnEntityName, joinColumnInverseName, field, COMPONENT_TYPE_COLUMN],
        },
      };
    }
    case 'dynamiczone': {
      const joinTableName = getDzJoinTableName(contentType.collectionName, options);
      const joinColumnEntityName = identifiers.getJoinColumnAttributeIdName(ENTITY, options);
      const joinColumnInverseName = identifiers.getJoinColumnAttributeIdName(
        COMPONENT_INVERSE_COLUMN_NAME,
        options
      );

      return {
        type: 'relation',
        relation: 'morphToMany',
        // TODO: handle restrictions at some point
        // target: attribute.components,
        joinTable: {
          name: joinTableName,
          joinColumn: {
            name: joinColumnEntityName,
            referencedColumn: id,
          },
          morphColumn: {
            idColumn: {
              name: joinColumnInverseName,
              referencedColumn: id,
            },
            typeColumn: {
              name: COMPONENT_TYPE_COLUMN,
            },
            typeField: '__component',
          },
          on: {
            field: name,
          },
          orderBy: {
            order: 'asc',
          },
          pivotColumns: [joinColumnEntityName, joinColumnInverseName, field, COMPONENT_TYPE_COLUMN],
        },
      };
    }
    default: {
      return attribute;
    }
  }
};

export const transformAttributes = (
  contentType: LoadedContentTypeModel,
  options: MetadataOptions
) => {
  return Object.keys(contentType.attributes! || {}).reduce((attrs, attrName) => {
    return {
      ...attrs,
      [attrName]: transformAttribute(
        attrName,
        contentType.attributes[attrName]!,
        contentType,
        options
      ),
    };
  }, {});
};

export const hasComponentsOrDz = (
  contentType: LoadedContentTypeModel
): contentType is LoadedContentTypeModel & { type: 'dynamiczone' | 'component' } => {
  return Object.values(contentType.attributes || {}).some(
    (({ type }: { type: string }) => type === 'dynamiczone' || type === 'component') as any
  );
};

export const createDocumentId = createId;

// Creates the
const createCompoLinkModel = (
  contentType: LoadedContentTypeModel,
  options: MetadataOptions
): Model => {
  const name = getComponentJoinTableName(contentType.collectionName, options);

  const entityId = identifiers.getJoinColumnAttributeIdName(ENTITY, options);
  const componentId = identifiers.getJoinColumnAttributeIdName(
    COMPONENT_INVERSE_COLUMN_NAME,
    options
  );
  const fkIndex = identifiers.getFkIndexName([contentType.collectionName, ENTITY], options);

  return {
    // TODO: make sure there can't be any conflicts with a prefix
    singularName: name,
    uid: name,
    tableName: name,
    attributes: {
      [id]: {
        type: 'increments',
      },
      [entityId]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      [componentId]: {
        type: 'integer',
        column: {
          unsigned: true,
        },
      },
      [COMPONENT_TYPE_COLUMN]: {
        type: 'string',
      },
      [field]: {
        type: 'string',
      },
      [order]: {
        type: 'float',
        column: {
          unsigned: true,
          defaultTo: null,
        },
      },
    },
    indexes: [
      {
        name: identifiers.getIndexName([contentType.collectionName, field], options),
        columns: [field],
      },
      {
        name: identifiers.getIndexName(
          [contentType.collectionName, COMPONENT_TYPE_COLUMN],
          options
        ),
        columns: [COMPONENT_TYPE_COLUMN],
      },
      {
        name: fkIndex,
        columns: [entityId],
      },
      {
        // NOTE: since we don't include attribute names, we need to be careful not to create another unique index
        name: identifiers.getUniqueIndexName([contentType.collectionName], options),
        columns: [entityId, componentId, field, COMPONENT_TYPE_COLUMN],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: fkIndex,
        columns: [entityId],
        referencedColumns: [id],
        referencedTable: identifiers.getTableName(contentType.collectionName, options),
        onDelete: 'CASCADE',
      },
    ],
  };
};

export const transformContentTypesToModels = (
  contentTypes: LoadedContentTypeModel[],
  options: MetadataOptions
): Model[] => {
  const models: Model[] = [];

  contentTypes.forEach((contentType) => {
    assert(contentType.collectionName, 'Content type "collectionName" is required');
    assert(contentType.modelName, 'Content type "modelName" is required');
    assert(contentType.uid, 'Content type "uid" is required');

    // Add document id to content types
    // as it is not documented
    const documentIdAttribute: Record<string, Attribute.Any> =
      contentType.modelType === 'contentType'
        ? { documentId: { type: 'string', default: createDocumentId } }
        : {};

    // TODO: this needs to be combined with getReservedNames, we should not be maintaining two lists
    // Prevent user from creating a documentId attribute
    const reservedAttributeNames = ['document_id', id];
    Object.keys(contentType.attributes || {}).forEach((attributeName) => {
      const snakeCasedAttributeName = _.snakeCase(attributeName);
      if (reservedAttributeNames.includes(snakeCasedAttributeName)) {
        throw new Error(
          `The attribute "${attributeName}" is reserved and cannot be used in a model. Please rename "${contentType.modelName}" attribute "${attributeName}" to something else.`
        );
      }
    });

    if (hasComponentsOrDz(contentType)) {
      const compoLinkModel = createCompoLinkModel(contentType, options);
      models.push(compoLinkModel);
    }

    const model: Model = {
      uid: contentType.uid,
      singularName: contentType.modelName,
      tableName: identifiers.getTableName(contentType.collectionName, options),
      attributes: {
        [id]: {
          type: 'increments',
        },
        ...documentIdAttribute,
        ...transformAttributes(contentType, options),
      },
    };

    models.push(model);
  });

  return models;
};

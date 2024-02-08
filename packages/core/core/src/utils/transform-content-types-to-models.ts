import { type Model, utils } from '@strapi/database';
import { Schema, Attribute } from '@strapi/types';
import { createId } from '@paralleldrive/cuid2';
import assert from 'node:assert';

const { identifiers } = utils;

type ContentTypeWithCollectionName = Schema.ContentType & { collectionName: string };

// Note: These helpers belong here rather than @strapi/database because components and dz are specific to Strapi
// we are creating these wrappers to be able to easily create identifiers in the same format db uses

export const COMPONENT_JOIN_TABLE_SUFFIX = 'components';
export const DZ_JOIN_TABLE_SUFFIX = 'components';
export const COMPONENT_INVERSE_COLUMN_NAME = 'component';
export const COMPONENT_TYPE_COLUMN = 'component_type';

export const getComponentJoinTableName = (collectionName: string) =>
  identifiers.getTableName(collectionName, { suffix: COMPONENT_JOIN_TABLE_SUFFIX });

export const getDzJoinTableName = (collectionName: string) =>
  identifiers.getTableName(collectionName, { suffix: DZ_JOIN_TABLE_SUFFIX });

const {
  ID_COLUMN: id,
  ORDER_COLUMN: orderColumnName,
  FIELD_COLUMN: field,
  ORDER_COLUMN: order,
  ENTITY: entity,
} = identifiers;

// Transforms an attribute (particularly for relation types) into the format that strapi/database accepts
const transformAttribute = (
  name: string,
  attribute: Attribute.Any,
  contentType: ContentTypeWithCollectionName
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
      const joinTableName = getComponentJoinTableName(contentType.collectionName);
      const joinColumnEntityName = identifiers.getJoinColumnEntityIdName();
      const joinColumnInverseName = identifiers.getJoinColumnAttributeIdName(
        COMPONENT_INVERSE_COLUMN_NAME
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
          orderColumnName,
          orderBy: {
            order: 'asc',
          },
          pivotColumns: [joinColumnEntityName, joinColumnInverseName, field, COMPONENT_TYPE_COLUMN],
        },
      };
    }
    case 'dynamiczone': {
      const joinTableName = getDzJoinTableName(contentType.collectionName);
      const joinColumnEntityName = identifiers.getJoinColumnEntityIdName();
      const joinColumnInverseName = identifiers.getJoinColumnAttributeIdName(
        COMPONENT_INVERSE_COLUMN_NAME
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

const transformAttributes = (contentType: ContentTypeWithCollectionName) => {
  return Object.keys(contentType.attributes! || {}).reduce((attrs, attrName) => {
    return {
      ...attrs,
      [attrName]: transformAttribute(attrName, contentType.attributes[attrName]!, contentType),
    };
  }, {});
};

const hasComponentsOrDz = (contentType: ContentTypeWithCollectionName) => {
  return Object.values(contentType.attributes).some(
    ({ type }) => type === 'dynamiczone' || type === 'component'
  );
};

export const createDocumentId = createId;

// Creates the
const createCompoLinkModel = (contentType: ContentTypeWithCollectionName): Model => {
  const name = getComponentJoinTableName(contentType.collectionName);

  const entityId = identifiers.getJoinColumnEntityIdName(); // entity_id
  const componentId = identifiers.getJoinColumnAttributeIdName(COMPONENT_INVERSE_COLUMN_NAME);
  const fkIndex = identifiers.getFkIndexName([contentType.collectionName, entity]);

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
        name: identifiers.getIndexName([contentType.collectionName, field]),
        columns: [field],
      },
      {
        name: identifiers.getIndexName([contentType.collectionName, COMPONENT_TYPE_COLUMN]),
        columns: [COMPONENT_TYPE_COLUMN],
      },
      {
        name: fkIndex, // `${contentType.collectionName}_entity_fk`,
        columns: [entityId],
      },
      {
        // NOTE: since we don't include attribute names, we need to be careful not to create another unique index
        name: identifiers.getUniqueIndexName([contentType.collectionName]), //  `${contentType.collectionName}_unique`,
        columns: [entityId, componentId, field, COMPONENT_TYPE_COLUMN],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: fkIndex,
        columns: [entityId],
        referencedColumns: [id],
        referencedTable: identifiers.getTableName(contentType.collectionName),
        onDelete: 'CASCADE',
      },
    ],
  };
};

export const transformContentTypesToModels = (
  contentTypes: ContentTypeWithCollectionName[]
): Model[] => {
  const models: Model[] = [];

  contentTypes.forEach((contentType) => {
    // Add document id to content types
    // as it is not documented
    const documentIdAttribute: Record<string, Attribute.Any> =
      contentType.modelType === 'contentType'
        ? { documentId: { type: 'string', default: createDocumentId } }
        : {};

    // Prevent user from creating a documentId attribute
    const reservedAttributeNames = ['documentId', 'document_id', id];
    reservedAttributeNames.forEach((reservedAttributeName) => {
      if (reservedAttributeName in contentType.attributes) {
        throw new Error(
          `The attribute "${reservedAttributeName}" is reserved and cannot be used in a model` +
            `Please rename "${contentType.modelName}" attribute "${reservedAttributeName}" to something else.`
        );
      }
    });

    if (hasComponentsOrDz(contentType)) {
      const compoLinkModel = createCompoLinkModel(contentType);
      models.push(compoLinkModel);
    }

    assert(contentType.collectionName, 'Collection name is required');

    const model: Model = {
      uid: contentType.uid,
      singularName: contentType.modelName,
      tableName: identifiers.getTableName(contentType.collectionName),
      attributes: {
        [id]: {
          type: 'increments',
        },
        ...documentIdAttribute,
        ...transformAttributes(contentType),
      },
    };

    models.push(model);
  });

  return models;
};

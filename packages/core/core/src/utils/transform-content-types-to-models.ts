import { Model } from '@strapi/database';
import { Schema, Attribute } from '@strapi/types';
import { createId } from '@paralleldrive/cuid2';
import assert from 'node:assert';

const transformAttribute = (
  name: string,
  attribute: Attribute.Any,
  contentType: Schema.ContentType
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
      return {
        type: 'relation',
        relation: attribute.repeatable === true ? 'oneToMany' : 'oneToOne',
        target: attribute.component,

        // We need the join table name to be deterministic,
        // We need to allow passing the join table name as an option
        joinTable: {
          name: `${contentType.collectionName}_components`,
          joinColumn: {
            name: 'entity_id',
            referencedColumn: 'id',
          },
          inverseJoinColumn: {
            name: 'component_id',
            referencedColumn: 'id',
          },
          on: {
            field: name,
          },
          orderColumnName: 'order',
          orderBy: {
            order: 'asc',
          },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      };
    }
    case 'dynamiczone': {
      return {
        type: 'relation',
        relation: 'morphToMany',
        // TODO: handle restrictions at some point
        // target: attribute.components,
        joinTable: {
          name: `${contentType.collectionName}_components`,
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
            field: name,
          },
          orderBy: {
            order: 'asc',
          },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      };
    }
    default: {
      return attribute;
    }
  }
};

const transformAttributes = (contentType: Schema.ContentType) => {
  return Object.keys(contentType.attributes! || {}).reduce((attrs, attrName) => {
    return {
      ...attrs,
      [attrName]: transformAttribute(attrName, contentType.attributes[attrName]!, contentType),
    };
  }, {});
};

const hasComponentsOrDz = (contentType: Schema.ContentType) => {
  return Object.values(contentType.attributes).some(
    ({ type }) => type === 'dynamiczone' || type === 'component'
  );
};

export const createDocumentId = createId;

const createCompoLinkModel = (contentType: Schema.ContentType): Model => {
  const name = `${contentType.collectionName}_components`;

  return {
    // TODO: make sure there can't be any conflicts with a prefix
    singularName: name,
    uid: name,
    tableName: name,
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
        name: `${contentType.collectionName}_field_index`,
        columns: ['field'],
      },
      {
        name: `${contentType.collectionName}_component_type_index`,
        columns: ['component_type'],
      },
      {
        name: `${contentType.collectionName}_entity_fk`,
        columns: ['entity_id'],
      },
      {
        name: `${contentType.collectionName}_unique`,
        columns: ['entity_id', 'component_id', 'field', 'component_type'],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: `${contentType.collectionName}_entity_fk`,
        columns: ['entity_id'],
        referencedColumns: ['id'],
        referencedTable: contentType.collectionName!,
        onDelete: 'CASCADE',
      },
    ],
  };
};

export const transformContentTypesToModels = (contentTypes: Schema.ContentType[]): Model[] => {
  const models: Model[] = [];

  contentTypes.forEach((contentType) => {
    // Add document id to content types
    // as it is not documented
    const documentIdAttribute: Record<string, Attribute.Any> =
      contentType.modelType === 'contentType'
        ? { documentId: { type: 'string', default: createDocumentId } }
        : {};

    // Prevent user from creating a documentId attribute
    const reservedAttributeNames = ['documentId', 'document_id', 'id'];
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
      tableName: contentType.collectionName,
      attributes: {
        id: {
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

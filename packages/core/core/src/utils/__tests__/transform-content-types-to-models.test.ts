import { cloneDeep, merge } from 'lodash';
import { Database } from '@strapi/database';
import { transformContentTypesToModels } from '..';
import { LoadedContentTypeModel } from '../transform-content-types-to-models';

const db = new Database({
  settings: {
    migrations: {
      dir: 'fakedir',
    },
  },
  connection: {
    client: 'sqlite',
    useNullAsDefault: true,
    connection: {
      filename: 'fake.db',
    },
  },
});

const identifiers = db.metadata.identifiers;

// We want to match exactly with the exception that document_id.default should be any function
expect.extend({
  toMatchModels(received, expected) {
    const replaceFunctionInDocumentIdDefault = (obj: any) => {
      const defaultFunction = obj?.attributes?.documentId?.default;
      if (typeof defaultFunction === 'function') {
        return {
          ...obj,
          attributes: {
            ...obj.attributes,
            documentId: { ...obj.attributes.documentId, default: expect.any(Function) },
          },
        };
      }
      return obj;
    };

    const pass =
      JSON.stringify(received) === JSON.stringify(replaceFunctionInDocumentIdDefault(expected));

    return {
      message: () =>
        `expected \r\n ${JSON.stringify(received)} ${
          pass ? 'not ' : ''
        } \r\n to be equal to \r\n ${JSON.stringify(expected)}`,
      pass,
    };
  },
});

const contentTypes: LoadedContentTypeModel[] = [
  {
    attributes: {
      name: {
        default: 'my name',
        type: 'string',
      },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
      },
      comp: {
        component: 'default.comp',
        type: 'component',
        required: true,
      },
      compRepeatable: {
        component: 'default.comp',
        type: 'component',
        repeatable: true,
      },
      singleImage: {
        type: 'media',
        multiple: false,
      },
      repeatableImage: {
        type: 'media',
        multiple: true,
      },
      dz: {
        type: 'dynamiczone',
        components: ['text_block', 'image_block'],
      },
    },
    collectionName: 'countries',
    uid: 'api::countries.countries',
    modelType: 'contentType',
    kind: 'collectionType',
    info: {
      singularName: 'country',
      pluralName: 'countries',
      displayName: 'My Country',
    },
    modelName: 'country',
    globalId: 'country',
  },
  {
    attributes: {
      name: {
        type: 'string',
      },
    },
    collectionName: 'categories',
    modelType: 'contentType',
    kind: 'collectionType',
    uid: 'api::categories.categories',
    info: {
      displayName: 'Category',
      singularName: 'category',
      pluralName: 'categories',
    },
    modelName: 'category',
    globalId: 'category',
  },
  {
    attributes: undefined,
    collectionName: 'empty',
    modelType: 'component',
    kind: 'collectionType',
    uid: 'api::empty.empty',
    info: {
      displayName: 'Empty',
      singularName: 'empty',
      pluralName: 'empties',
    },
    modelName: 'empty',
    globalId: 'empty',
  },
];

const expectedModels = [
  {
    singularName: 'countries_components',
    uid: 'countries_components',
    tableName: 'countries_components',
    attributes: {
      id: { type: 'increments' },
      entity_id: { type: 'integer', column: { unsigned: true } },
      component_id: { type: 'integer', column: { unsigned: true } },
      component_type: { type: 'string' },
      field: { type: 'string' },
      order: { type: 'float', column: { unsigned: true, defaultTo: null } },
    },
    indexes: [
      { name: 'countries_field_index', columns: ['field'] },
      { name: 'countries_component_type_index', columns: ['component_type'] },
      { name: 'countries_entity_fk', columns: ['entity_id'] },
      {
        name: 'countries_unique',
        columns: ['entity_id', 'component_id', 'field', 'component_type'],
        type: 'unique',
      },
    ],
    foreignKeys: [
      {
        name: 'countries_entity_fk',
        columns: ['entity_id'],
        referencedColumns: ['id'],
        referencedTable: 'countries',
        onDelete: 'CASCADE',
      },
    ],
  },
  {
    uid: 'api::countries.countries',
    singularName: 'country',
    tableName: 'countries',
    attributes: {
      id: { type: 'increments' },
      documentId: { type: 'string' },
      name: { default: 'my name', type: 'string' },
      categories: { type: 'relation', relation: 'oneToMany', target: 'api::category.category' },
      comp: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'default.comp',
        joinTable: {
          name: 'countries_components',
          joinColumn: { name: 'entity_id', referencedColumn: 'id' },
          inverseJoinColumn: { name: 'component_id', referencedColumn: 'id' },
          on: { field: 'comp' },
          orderColumnName: 'order',
          orderBy: { order: 'asc' },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
      compRepeatable: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'default.comp',
        joinTable: {
          name: 'countries_components',
          joinColumn: { name: 'entity_id', referencedColumn: 'id' },
          inverseJoinColumn: { name: 'component_id', referencedColumn: 'id' },
          on: { field: 'compRepeatable' },
          orderColumnName: 'order',
          orderBy: { order: 'asc' },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
      singleImage: {
        type: 'relation',
        relation: 'morphOne',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      repeatableImage: {
        type: 'relation',
        relation: 'morphMany',
        target: 'plugin::upload.file',
        morphBy: 'related',
      },
      dz: {
        type: 'relation',
        relation: 'morphToMany',
        joinTable: {
          name: 'countries_components',
          joinColumn: { name: 'entity_id', referencedColumn: 'id' },
          morphColumn: {
            idColumn: { name: 'component_id', referencedColumn: 'id' },
            typeColumn: { name: 'component_type' },
            typeField: '__component',
          },
          on: { field: 'dz' },
          orderBy: { order: 'asc' },
          pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
        },
      },
    },
    indexes: [
      {
        name: 'countries_documents_index',
        columns: ['document_id'],
      },
    ],
    lifecycles: {},
  },
  {
    uid: 'api::categories.categories',
    singularName: 'category',
    tableName: 'categories',
    attributes: {
      id: { type: 'increments' },
      documentId: { type: 'string' },
      name: { type: 'string' },
    },
    indexes: [
      {
        name: 'categories_documents_index',
        columns: ['document_id'],
      },
    ],
    lifecycles: {},
  },
  {
    uid: 'api::empty.empty',
    singularName: 'empty',
    tableName: 'empty',
    attributes: { id: { type: 'increments' } },
    lifecycles: {},
  },
];

type AttributeChange = {
  [key: string]: {
    type: string;
  };
};

type ContentTypeChange = Partial<Omit<LoadedContentTypeModel, 'attributes'>> & {
  attributes?: AttributeChange;
};

function mergeContentType(
  contentType: LoadedContentTypeModel,
  changes: ContentTypeChange
): LoadedContentTypeModel {
  // Deep clone the original object to avoid modifying it
  const clonedContentType = cloneDeep(contentType);
  return merge(clonedContentType, changes);
}

function patchContentTypes(
  collectionName: string,
  changes: ContentTypeChange
): LoadedContentTypeModel[] {
  return contentTypes.map((ct) => {
    if (ct.collectionName === collectionName) {
      return mergeContentType(ct, changes);
    }
    return ct;
  });
}

describe('transformContentTypesToModels', () => {
  describe('full length identifiers', () => {
    // mock the options so that the 'global' identifiers created for use by createMetadata uses 0 for maxLength
    Object.defineProperty(identifiers, 'options', {
      get: jest.fn(() => ({ maxLength: 0 })),
    });

    test('converts valid content types to models', () => {
      const models = transformContentTypesToModels(contentTypes, identifiers);

      expect(models).toMatchModels(expectedModels);
    });

    test.each(['id', 'document_id', 'ID', 'documentId'])(
      'throws on restricted attribute name: %s',
      (restrictedName) => {
        const changes = {
          attributes: {
            [restrictedName]: {
              type: 'string',
            },
          },
        };
        const modifiedContentTypes = patchContentTypes('countries', changes);

        expect(() => transformContentTypesToModels(modifiedContentTypes, identifiers)).toThrow(
          `The attribute "${restrictedName}" is reserved`
        );
      }
    );

    test.each(['collectionName', 'uid', 'modelName'])(
      'throws on missing name: %s',
      (restrictedName) => {
        const changes = {
          [restrictedName]: null,
        };
        const modifiedContentTypes = patchContentTypes('countries', changes);

        expect(() => transformContentTypesToModels(modifiedContentTypes, identifiers)).toThrow(
          `"${restrictedName}" is required`
        );
      }
    );
  });
});

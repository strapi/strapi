import { nonNull, objectType } from 'nexus';

import createTypeBuilder from '../services/builders/type';

jest.mock('nexus', () => ({
  nonNull: jest.fn((type) => ({ kind: 'nonNull', type })),
  list: jest.fn((type) => ({ kind: 'list', type })),
  objectType: jest.fn((definition) => ({ definition })),
}));

jest.mock('@strapi/utils', () => ({
  contentTypes: {
    isPrivateAttribute: jest.fn(() => false),
  },
}));

describe('GraphQL type builder polymorphic list items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('wraps targeted morph-to-many union entries in non-null', () => {
    const listField = jest.fn();
    const rootBuilder = {
      field: jest.fn(),
      list: { field: listField },
      nonNull: { field: jest.fn(), id: jest.fn() },
    };

    const extension = {
      shadowCRUD: jest.fn(() => ({
        field: jest.fn(() => ({ hasOutputEnabled: jest.fn(() => true) })),
      })),
    };

    const utils = {
      naming: {
        getTypeName: jest.fn(() => 'Label'),
        getMorphRelationTypeName: jest.fn(() => 'LabelRestrictedItemsMorph'),
      },
      attributes: {
        isStrapiScalar: jest.fn(() => false),
        isComponent: jest.fn(() => false),
        isDynamicZone: jest.fn(() => false),
        isEnumeration: jest.fn(() => false),
        isMedia: jest.fn(() => false),
        isMorphRelation: jest.fn(() => true),
        isRelation: jest.fn(() => false),
      },
    };

    const buildAssociationResolver = jest.fn(() => jest.fn());
    const services = {
      extension,
      utils,
      constants: { GENERIC_MORPH_TYPENAME: 'GenericMorph' },
      builders: {
        get: jest.fn(() => ({ buildAssociationResolver })),
      },
    };

    const graphqlPlugin = {
      service: jest.fn((name) => services[name as keyof typeof services]),
      config: jest.fn(() => false),
    };
    const context = {
      strapi: {
        plugin: jest.fn(() => graphqlPlugin),
      },
    } as any;

    const contentType = {
      uid: 'api::label.label',
      modelType: 'contentType',
      attributes: {
        restrictedItems: {
          type: 'relation',
          relation: 'morphToMany',
          target: ['api::tag.tag', 'api::label.label'],
        },
      },
    } as any;

    createTypeBuilder(context).buildTypeDefinition(contentType);

    const objectTypeConfig = jest.mocked(objectType).mock.calls[0][0] as {
      definition: (builder: typeof rootBuilder) => void;
    };
    objectTypeConfig.definition(rootBuilder);

    expect(utils.naming.getMorphRelationTypeName).toHaveBeenCalledWith(
      contentType,
      'restrictedItems'
    );
    expect(nonNull).toHaveBeenCalledWith('LabelRestrictedItemsMorph');
    expect(listField).toHaveBeenCalledWith(
      'restrictedItems',
      expect.objectContaining({
        type: { kind: 'nonNull', type: 'LabelRestrictedItemsMorph' },
      })
    );
  });
});

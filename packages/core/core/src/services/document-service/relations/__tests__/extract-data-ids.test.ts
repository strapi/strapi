import { curry } from 'lodash/fp';
import { LoadedStrapi, Schema, Common } from '@strapi/types';
import { extractDataIds } from '../extract/data-ids';

const createSchemaFromAttributes = (
  uid: Common.UID.ContentType,
  attributes: Schema.Attributes
): Schema.ContentType => {
  return {
    uid,
    info: { displayName: 'Test', singularName: 'test', pluralName: 'tests' },
    kind: 'collectionType',
    modelName: uid,
    globalId: uid,
    modelType: 'contentType',
    attributes,
  };
};

const models: Record<string, Schema.ContentType> = {
  'api::category.category': createSchemaFromAttributes('api::category.category', {
    name: {
      type: 'string',
    },
  }),
  'api::product.product': createSchemaFromAttributes('api::product.product', {
    name: {
      type: 'string',
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
    },
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::category.category',
    },
  }),
};

describe('Extract document ids from relation data', () => {
  const getIds = curry(extractDataIds)(models['api::product.product']);

  beforeAll(() => {
    global.strapi = {
      getModel: (uid: string) => models[uid],
    } as LoadedStrapi;
  });

  it('Shorthand syntax', async () => {
    const ids = await getIds({
      categories: [1, 2, 3],
      category: 4,
    });

    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('Longhand syntax', async () => {
    const ids = await getIds({
      categories: [{ id: 1 }, { id: 2 }, { id: 3 }],
      category: { id: 4 },
    });

    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('Null', async () => {
    const ids = await getIds({
      categories: null,
      category: null,
    });

    expect(ids).toEqual([]);
  });

  it('Set', async () => {
    const ids = await getIds({
      categories: { set: [1, 2, 3] },
      category: { set: 4 },
    });

    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('Connect', async () => {
    const ids = await getIds({
      categories: { connect: [1, 2, 3] },
      category: { connect: 4 },
    });

    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('Connect before', async () => {
    const ids = await getIds({
      categories: { connect: [{ id: 1, position: { before: 2 } }] },
      category: { connect: { id: 4, position: { before: 5 } } },
    });

    expect(ids).toEqual([1, 2, 4, 5]);
  });

  it('Connect after', async () => {
    const ids = await getIds({
      categories: { connect: [{ id: 1, position: { after: 2 } }] },
      category: { connect: { id: 4, position: { after: 5 } } },
    });

    expect(ids).toEqual([1, 2, 4, 5]);
  });

  it('Disconnect', async () => {
    const ids = await getIds({
      categories: { disconnect: [1, 2, 3] },
      category: { disconnect: 4 },
    });

    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('Multiple', async () => {
    const ids = await getIds({
      categories: {
        set: [1, 2, 3],
        connect: [4, 5],
        disconnect: [6, 7],
      },
      category: {
        set: 8,
        connect: 9,
        disconnect: 10,
      },
    });

    expect(ids).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  });
});

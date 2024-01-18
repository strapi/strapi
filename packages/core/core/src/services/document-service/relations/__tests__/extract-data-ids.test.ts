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

const CATEGORY_UID = 'api::category.category';
const PRODUCT_UID = 'api::product.product';

const models: Record<string, Schema.ContentType> = {
  [CATEGORY_UID]: createSchemaFromAttributes(CATEGORY_UID, {
    name: {
      type: 'string',
    },
  }),
  [PRODUCT_UID]: createSchemaFromAttributes(PRODUCT_UID, {
    name: {
      type: 'string',
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: CATEGORY_UID,
    },
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: CATEGORY_UID,
    },
    relatedProducts: {
      type: 'relation',
      relation: 'oneToMany',
      target: PRODUCT_UID,
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
      relatedProducts: [5, 6, 7],
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 3, 4], [PRODUCT_UID]: [5, 6, 7] });
  });

  it('Longhand syntax', async () => {
    const ids = await getIds({
      categories: [{ id: 1 }, { id: 2 }, { id: 3 }],
      category: { id: 4 },
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 3, 4] });
  });

  it('Null', async () => {
    const ids = await getIds({
      categories: null,
      category: null,
    });

    expect(ids).toEqual({});
  });

  it('Set', async () => {
    const ids = await getIds({
      categories: { set: [1, 2, 3] },
      category: { set: 4 },
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 3, 4] });
  });

  it('Connect', async () => {
    const ids = await getIds({
      categories: { connect: [1, 2, 3] },
      category: { connect: 4 },
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 3, 4] });
  });

  it('Connect before', async () => {
    const ids = await getIds({
      categories: { connect: [{ id: 1, position: { before: 2 } }] },
      category: { connect: { id: 4, position: { before: 5 } } },
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 4, 5] });
  });

  it('Connect after', async () => {
    const ids = await getIds({
      categories: { connect: [{ id: 1, position: { after: 2 } }] },
      category: { connect: { id: 4, position: { after: 5 } } },
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 4, 5] });
  });

  it('Disconnect', async () => {
    const ids = await getIds({
      categories: { disconnect: [1, 2, 3] },
      category: { disconnect: 4 },
    });

    expect(ids).toEqual({ [CATEGORY_UID]: [1, 2, 3, 4] });
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

    expect(ids).toEqual({
      [CATEGORY_UID]: expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    });
  });
});

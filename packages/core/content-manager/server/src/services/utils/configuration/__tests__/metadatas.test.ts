import { syncMetadatas } from '../metadatas';

const target = {
  uid: 'api::target.target',
  modelType: 'contentType',
  attributes: {
    id: { type: 'integer' },
    documentId: { type: 'string' },
    name: { type: 'string' },
    coverImage: { type: 'media', multiple: false },
  },
};

const targetWithoutMedia = {
  ...target,
  attributes: {
    id: { type: 'integer' },
    documentId: { type: 'string' },
    name: { type: 'string' },
  },
};

const schema = {
  uid: 'api::main.main',
  modelType: 'contentType',
  attributes: {
    id: { type: 'integer' },
    documentId: { type: 'string' },
    products: {
      type: 'relation',
      relationType: 'oneToMany',
      targetModel: 'api::target.target',
    },
  },
};

const setup = (targetSchema: unknown) => {
  global.strapi = {
    plugins: {
      'content-manager': {
        services: {
          'content-types': { findContentType: jest.fn(() => targetSchema) },
        },
      },
    },
  } as any;
};

const configurationWith = (edit: Record<string, unknown>) => ({
  metadatas: {
    products: {
      edit,
      list: { label: 'products', searchable: false, sortable: false },
    },
  },
});

describe('syncMetadatas | mediaField', () => {
  test('keeps the mediaField when it still points to a media attribute of the target', async () => {
    setup(target);

    const metadatas: any = await syncMetadatas(
      configurationWith({ mainField: 'name', mediaField: 'coverImage' }),
      schema
    );

    expect(metadatas.products.edit.mediaField).toBe('coverImage');
  });

  test('removes the mediaField when the media attribute no longer exists on the target', async () => {
    setup(targetWithoutMedia);

    const metadatas: any = await syncMetadatas(
      configurationWith({ mainField: 'name', mediaField: 'coverImage' }),
      schema
    );

    expect(metadatas.products.edit).not.toHaveProperty('mediaField');
  });

  /**
   * `mainField` defaults to 'id' whenever the target has no listable string field, so the
   * cleanup must not sit behind the mainField early-returns.
   */
  test("removes a stale mediaField even when the mainField is 'id'", async () => {
    setup(targetWithoutMedia);

    const metadatas: any = await syncMetadatas(
      configurationWith({ mainField: 'id', mediaField: 'coverImage' }),
      schema
    );

    expect(metadatas.products.edit).not.toHaveProperty('mediaField');
  });

  test('removes the mediaField when the attribute is not a relation anymore', async () => {
    setup(target);

    const metadatas: any = await syncMetadatas(configurationWith({ mediaField: 'coverImage' }), {
      ...schema,
      attributes: { ...schema.attributes, products: { type: 'string' } },
    });

    expect(metadatas.products.edit).not.toHaveProperty('mediaField');
  });
});

import { createContentManagerConfigurationRenamer } from '../rename-fields';

const PRODUCT = 'api::product.product';

describe('createContentManagerConfigurationRenamer', () => {
  it('writes the renamed configuration and leaves an unrelated model untouched', async () => {
    const stored = new Map<string, unknown>([
      [
        `configuration_content_types::${PRODUCT}`,
        {
          settings: { mainField: 'internalName', defaultSortBy: 'internalName' },
          metadatas: {
            internalName: { edit: { label: 'internalName' }, list: { label: 'internalName' } },
          },
          layouts: { list: ['internalName', 'price'], edit: [[{ name: 'internalName', size: 6 }]] },
        },
      ],
    ]);
    const set = jest.fn(async ({ key, value }: { key: string; value: unknown }) => {
      stored.set(key, value);
    });
    const strapi = {
      contentTypes: {
        [PRODUCT]: { attributes: { productName: { type: 'string' }, price: { type: 'decimal' } } },
        'api::category.category': { attributes: { name: { type: 'string' } } },
      },
      components: {},
      store: () => ({
        get: async ({ key }: { key: string }) => stored.get(key) ?? null,
        set,
      }),
    };

    await createContentManagerConfigurationRenamer({ strapi: strapi as any })({} as any, {
      [PRODUCT]: { internalName: 'productName' },
    });

    expect(set).toHaveBeenCalledTimes(1);
    expect(stored.get(`configuration_content_types::${PRODUCT}`)).toMatchObject({
      settings: { mainField: 'productName', defaultSortBy: 'productName' },
      layouts: { list: ['productName', 'price'] },
      attributeRenames: { internalName: 'productName' },
      uid: PRODUCT,
    });
  });

  it('rewrites a component and ignores a stored value that is not a configuration', async () => {
    const set = jest.fn();
    const strapi = {
      contentTypes: {},
      components: {
        'basic.seo': { attributes: { title: { type: 'string' } } },
      },
      store: () => ({
        get: async () => ['not-a-configuration'],
        set,
      }),
    };

    await createContentManagerConfigurationRenamer({ strapi: strapi as any })({} as any, {
      'basic.seo': { metaTitle: 'title' },
    });

    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0].value).toMatchObject({
      uid: 'basic.seo',
      attributeRenames: { metaTitle: 'title' },
    });
  });

  it('does not write when the stored configuration already uses the new names', async () => {
    const current = {
      uid: PRODUCT,
      settings: { mainField: 'productName', defaultSortBy: 'productName' },
      metadatas: { productName: { edit: { label: 'Name' }, list: { label: 'Name' } } },
      layouts: { list: ['productName'], edit: [[{ name: 'productName', size: 6 }]] },
      attributeRenames: { internalName: 'productName' },
    };
    const set = jest.fn();
    const strapi = {
      contentTypes: {
        [PRODUCT]: { attributes: { productName: { type: 'string' } } },
      },
      components: {},
      store: () => ({
        get: async () => current,
        set,
      }),
    };

    await createContentManagerConfigurationRenamer({ strapi: strapi as any })({} as any, {
      [PRODUCT]: { internalName: 'productName' },
    });

    expect(set).not.toHaveBeenCalled();
  });

  it('does nothing when the rename map is empty', async () => {
    const set = jest.fn();
    const strapi = {
      contentTypes: {
        [PRODUCT]: { attributes: { productName: { type: 'string' } } },
      },
      components: {},
      store: () => ({
        get: async () => null,
        set,
      }),
    };

    await createContentManagerConfigurationRenamer({ strapi: strapi as any })({} as any, {});

    expect(set).not.toHaveBeenCalled();
  });
});

import { createContentManagerConfigurationRenamer } from '../rename-fields';

const PRODUCT = 'api::product.product';

describe('createContentManagerConfigurationRenamer', () => {
  it('writes the renamed configuration and leaves an unrelated model untouched', async () => {
    const stored = new Map<string, unknown>([
      [
        `configuration_content_types::${PRODUCT}`,
        {
          settings: { mainField: 'internalName', defaultSortBy: 'internalName' },
          metadatas: { internalName: { edit: { label: 'internalName' }, list: { label: 'internalName' } } },
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
    });
  });
});

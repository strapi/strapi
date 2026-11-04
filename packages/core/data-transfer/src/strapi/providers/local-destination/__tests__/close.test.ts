import { createLocalStrapiDestinationProvider } from '../index';

describe('local destination close', () => {
  test('re-enables lifecycles and destroys the instance when end rejects', async () => {
    const enable = jest.fn();
    const destroy = jest.fn(async () => undefined);
    const provider = createLocalStrapiDestinationProvider({
      getStrapi: async () => ({}) as any,
      strategy: 'restore',
      restore: {},
    });

    provider.strapi = {
      db: { lifecycles: { enable } },
      destroy,
    } as any;
    provider.transaction = {
      end: () => Promise.reject(new Error('commit failed')),
    } as any;

    await expect(provider.close()).rejects.toThrow('commit failed');
    expect(enable).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

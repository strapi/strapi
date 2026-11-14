import { transactionCommit } from '../../../../utils/transaction';
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
    let rejectCommit: (error: Error) => void = () => undefined;
    const commit = new Promise<void>((_resolve, reject) => {
      rejectCommit = reject;
    });
    provider.transaction = {
      end: () => true,
      [transactionCommit]: () => commit,
    } as any;

    const closing = provider.close();
    rejectCommit(new Error('commit failed'));
    await expect(closing).rejects.toThrow('commit failed');
    expect(enable).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

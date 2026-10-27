import { createTransaction } from '../transaction';

describe('createTransaction', () => {
  test('attach rejects when the database transaction fails to start', async () => {
    const strapi = {
      db: {
        transaction: () => Promise.reject(new Error('pool is closed')),
      },
    };

    const transaction = createTransaction(strapi as any);

    await expect(transaction.attach(async () => 'ran')).rejects.toThrow('pool is closed');
    await expect(transaction.attach(async () => 'again')).rejects.toThrow('pool is closed');
    await expect(transaction.rollback()).resolves.toBe(false);
  });
});

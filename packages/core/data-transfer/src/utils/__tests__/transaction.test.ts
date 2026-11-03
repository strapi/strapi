import { createTransaction } from '../transaction';

describe('createTransaction', () => {
  test('end waits for the database transaction to settle', async () => {
    let settleTransaction: () => void = () => {};
    const transactionSettled = new Promise<void>((resolve) => {
      settleTransaction = resolve;
    });
    const strapi = {
      db: {
        transaction: async (
          callback: (params: { trx: object; rollback: () => Promise<void> }) => void
        ) => {
          await callback({ trx: {}, rollback: async () => {} });
          await transactionSettled;
        },
      },
    };

    const transaction = createTransaction(strapi as any);
    await transaction.attach(async () => undefined);

    let ended = false;
    const ending = transaction.end().then(() => {
      ended = true;
    });

    await Promise.resolve();
    expect(ended).toBe(false);

    settleTransaction();
    await ending;
    expect(ended).toBe(true);
  });

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

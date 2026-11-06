import { createTransaction, transactionCommit } from '../transaction';

describe('createTransaction', () => {
  test('end waits for the database transaction to settle', async () => {
    let settleTransaction: () => void = () => {};
    const transactionSettled = new Promise<void>((resolve) => {
      settleTransaction = resolve;
    });
    const strapi = {
      db: {
        async transaction(
          handler: (params: { trx: object; rollback: () => Promise<void> }) => void
        ) {
          await handler({ trx: {}, rollback: jest.fn().mockResolvedValue(undefined) });
          await transactionSettled;
        },
      },
    };

    const transaction = createTransaction(strapi as any);
    await transaction.attach(async () => undefined);

    let ended = false;
    expect(transaction.end()).toBe(true);
    const ending = transaction[transactionCommit]().then(() => {
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

  test('end rejects when the database transaction rejects', async () => {
    const strapi = {
      db: {
        transaction: () => Promise.reject(new Error('commit failed')),
      },
    };

    const transaction = createTransaction(strapi as any);

    expect(transaction.end()).toBe(true);
    await expect(transaction[transactionCommit]()).rejects.toThrow('commit failed');
  });
});

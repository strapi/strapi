import { wrapTransaction } from '../common';
import { Database } from '../..';

describe('wrapTransaction', () => {
  let db: Database;
  let fn: jest.Mock;
  const trx: jest.Mock = jest.fn();

  beforeEach(() => {
    db = {
      // eslint-disable-next-line node/no-callback-literal
      transaction: jest.fn((cb) => cb({ trx })),
    } as any;

    fn = jest.fn().mockResolvedValue(undefined);
  });

  it('should wrap the function in a transaction', async () => {
    const wrappedFn = wrapTransaction(db)(fn);
    await wrappedFn();

    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(fn).toHaveBeenCalledWith(trx, db);
  });

  it('should return the result of the wrapped function', async () => {
    const result = {};
    fn.mockResolvedValueOnce(result);

    const wrappedFn = wrapTransaction(db)(fn);
    const res = await wrappedFn();

    expect(res).toBe(result);
  });

  it('should rollback the transaction if the wrapped function throws an error', async () => {
    const error = new Error('Test error');
    fn.mockRejectedValueOnce(error);

    const wrappedFn = wrapTransaction(db)(fn);

    await expect(wrappedFn()).rejects.toThrow(error);
    expect(db.transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(fn).toHaveBeenCalledWith(trx, db);
  });
});

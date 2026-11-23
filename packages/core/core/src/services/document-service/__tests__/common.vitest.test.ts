import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wrapWriteInTransaction } from '../common';

describe('wrapWriteInTransaction', () => {
  const db = {
    inTransaction: vi.fn(),
    transaction: vi.fn(async (cb: () => unknown) => cb()),
    savepoint: vi.fn(async (cb: () => unknown) => cb()),
  };

  beforeEach(() => {
    global.strapi = { db } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('runs the write in a transaction when none is open', async () => {
    db.inTransaction.mockReturnValue(false);
    const write = vi.fn(async (...args: unknown[]) => args);

    await expect(wrapWriteInTransaction(write)('a', 'b')).resolves.toEqual(['a', 'b']);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.savepoint).not.toHaveBeenCalled();
  });

  it('runs the write in a savepoint inside a transaction', async () => {
    db.inTransaction.mockReturnValue(true);
    const write = vi.fn(async (...args: unknown[]) => args);

    await expect(wrapWriteInTransaction(write)('a', 'b')).resolves.toEqual(['a', 'b']);

    expect(db.savepoint).toHaveBeenCalledTimes(1);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rethrows what the write throws', async () => {
    db.inTransaction.mockReturnValue(true);
    const error = new Error('write failed');

    await expect(
      wrapWriteInTransaction(async () => {
        throw error;
      })()
    ).rejects.toBe(error);
  });
});

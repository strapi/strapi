import { vi, type Mock } from 'vitest';
import type { Core } from '@strapi/types';

/** What Strapi hands a transaction's callback. */
export interface TransactionHooks {
  /** Registers work that runs once the transaction has committed, and never when it rolls back. */
  onCommit: (callback: () => void) => void;
}

type TransactionWork = (hooks: TransactionHooks) => Promise<unknown>;

interface TransactionOptions {
  /** Told how each transaction ended, before its commit hooks run. */
  onSettle?: (outcome: 'commit' | 'rollback') => void;
  /** Runs one transaction after another, as a database that locks the row they all touch. */
  serialize?: boolean;
}

/**
 * A `strapi.db.transaction` like Strapi's: the callback gets `onCommit`, what it registers runs once
 * the callback has resolved, and an error rolls the transaction back and reaches the caller.
 * `inTransaction()` says whether a callback is running, so a test can tell what ran inside one, and
 * `commits` holds every commit hook registered so far.
 */
export const createTransaction = ({ onSettle, serialize = false }: TransactionOptions = {}) => {
  let depth = 0;
  const registered: Array<() => void> = [];
  let queue: Promise<unknown> = Promise.resolve();

  const run = async (work: TransactionWork) => {
    const commits: Array<() => void> = [];
    let result: unknown;

    depth += 1;

    try {
      result = await work({
        onCommit(callback) {
          commits.push(callback);
          registered.push(callback);
        },
      });
    } catch (error) {
      onSettle?.('rollback');

      throw error;
    } finally {
      depth -= 1;
    }

    onSettle?.('commit');
    commits.forEach((callback) => callback());

    return result;
  };

  const transaction = vi.fn((work: TransactionWork) => {
    if (!serialize) {
      return run(work);
    }

    const turn = queue.then(() => run(work));

    queue = turn.catch(() => undefined);

    return turn;
  });

  return { transaction, inTransaction: () => depth > 0, commits: registered };
};

/**
 * A function from a key to one fake object that stays the same for that key, so a test can ask what
 * was called on it. The shape of the object comes from `make`.
 */
export const createByKey = <T extends Record<string, unknown>>(make: (key: string) => T) => {
  const made = new Map<string, T>();

  return vi.fn((key: string) => {
    if (!made.has(key)) {
      made.set(key, make(key));
    }

    return made.get(key) as T;
  });
};

/** The methods of `strapi.db.query(uid)` that most services reach for. */
const defaultQueryMethods = (): Record<string, Mock> => ({
  findOne: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
  count: vi.fn(async () => 0),
  update: vi.fn(async () => ({})),
  updateMany: vi.fn(async () => ({ count: 0 })),
  deleteMany: vi.fn(async () => ({ count: 0 })),
});

/** `strapi.db.query`: `query(uid)` hands back the same object every time. */
export const createQueryMap = (make: () => Record<string, Mock> = defaultQueryMethods) =>
  createByKey(make);

/** `strapi.documents`: `documents(uid)` hands back the same object every time. */
export const createDocumentsMap = (make: () => Record<string, Mock>) => createByKey(make);

/**
 * A `strapi` built from the parts a test names. Everything else is missing, so a service that
 * reaches for more than the test set up fails loudly.
 */
export const fakeStrapi = (parts: Record<string, unknown>): Core.Strapi =>
  parts as unknown as Core.Strapi;

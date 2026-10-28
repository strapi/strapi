import { isDeadlockError, transactionCtx, waitForPendingCallbacks } from '../transaction-context';

const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const fakeTrx = () =>
  ({
    commit: jest.fn(async () => undefined),
    rollback: jest.fn(async () => undefined),
  }) as any;

describe('isDeadlockError', () => {
  test('matches driver codes and a driver error that only kept the message', () => {
    expect(isDeadlockError(Object.assign(new Error('boom'), { code: '40P01' }))).toBe(true);
    expect(isDeadlockError({ errno: 1213, message: 'lock' })).toBe(true);
    expect(isDeadlockError({ sql: 'update t set a = 1', message: 'deadlock detected' })).toBe(true);
    expect(isDeadlockError({ message: 'wrapped', original: { code: 'ER_LOCK_DEADLOCK' } })).toBe(
      true
    );
  });

  test('ignores an application error that only mentions a deadlock', () => {
    expect(isDeadlockError(new Error('deadlock detected'))).toBe(false);
    expect(isDeadlockError(new Error('Deadlock found'))).toBe(false);
  });
});

describe('transaction callback tracking', () => {
  test('logs a rejected commit hook on that database and drops it from the set', async () => {
    const logger = { error: jest.fn() };
    const pending = new Set<Promise<unknown>>();
    const other = new Set<Promise<unknown>>();

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(() => Promise.reject(new Error('hook failed')));
        await transactionCtx.commit(fakeTrx());
      },
      { pending, logger }
    );

    await flush();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toContain('hook failed');
    expect(pending.size).toBe(0);
    expect(other.size).toBe(0);
  });

  test('a second database does not see the first database hooks', async () => {
    const firstLogger = { error: jest.fn() };
    const secondLogger = { error: jest.fn() };
    const first = new Set<Promise<unknown>>();
    const second = new Set<Promise<unknown>>();

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(() => {
          throw new Error('sync fail');
        });
        await transactionCtx.commit(fakeTrx());
      },
      { pending: first, logger: firstLogger }
    );

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(() => undefined);
        await transactionCtx.commit(fakeTrx());
      },
      { pending: second, logger: secondLogger }
    );

    expect(firstLogger.error).toHaveBeenCalledTimes(1);
    expect(secondLogger.error).not.toHaveBeenCalled();
    expect(first.size).toBe(0);
    expect(second.size).toBe(0);
  });

  test('destroy wait returns when a hook is still pending and reports the count', async () => {
    let release: () => void = () => {};
    const hung = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = new Set<Promise<unknown>>([hung]);
    const onTimeout = jest.fn();

    await waitForPendingCallbacks(pending, { timeoutMs: 20, onTimeout });

    expect(onTimeout).toHaveBeenCalledWith(1);
    expect(pending.has(hung)).toBe(true);

    release();
    await flush();
  });

  test('destroy wait finishes without a warning when hooks settle', async () => {
    let resolveHook: () => void = () => {};
    const hook = new Promise<void>((resolve) => {
      resolveHook = resolve;
    });
    const pending = new Set<Promise<unknown>>();
    const tracked = hook.then(() => undefined);
    pending.add(tracked);
    tracked.then(() => pending.delete(tracked));

    const onTimeout = jest.fn();
    const waiting = waitForPendingCallbacks(pending, { timeoutMs: 500, onTimeout });

    resolveHook();
    await waiting;

    expect(onTimeout).not.toHaveBeenCalled();
    expect(pending.size).toBe(0);
  });
});

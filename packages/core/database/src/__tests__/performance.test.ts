import { Database } from '../index';

const baseConfig = {
  connection: {
    client: 'sqlite' as const,
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  },
  settings: {
    migrations: {
      dir: 'migrations',
    },
  },
};

const waitForSubscribers = () =>
  new Promise<void>((resolve) => {
    process.nextTick(() => resolve());
  });

describe('Database performance events', () => {
  it('emits slow query events with safe defaults', async () => {
    const db = new Database({
      ...baseConfig,
      performance: {
        enabled: true,
        slowQueryMs: 0,
        sampleRate: 1,
      },
    });

    const subscriber = jest.fn();
    db.subscribeToPerformanceEvents(subscriber);

    const queryData = {
      __knexQueryUid: 'query-1',
      sql: "select * from users where id = 42 and email = 'test@example.com'",
      method: 'select',
      bindings: [42, 'test@example.com'],
      queryContext: { requestId: 'req-1' },
    };

    (db.connection as any).emit('query', queryData);
    (db.connection as any).emit('query-response', [], queryData);
    await waitForSubscribers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    const event = subscriber.mock.calls[0][0];

    expect(event.type).toBe('query.slow');
    expect(event.requestId).toBe('req-1');
    expect(event.success).toBe(true);
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
    expect(event.queryFingerprint).toBe('select * from users where id = ? and email = ?');
    expect(event.sql).toBeUndefined();
    expect(event.bindings).toBeUndefined();

    await db.destroy();
  });

  it('emits query error events', async () => {
    const db = new Database({
      ...baseConfig,
      performance: {
        enabled: true,
        slowQueryMs: 0,
      },
    });

    const subscriber = jest.fn();
    db.subscribeToPerformanceEvents(subscriber);

    const queryData = {
      __knexQueryUid: 'query-2',
      sql: 'select * from users',
      method: 'select',
    };

    (db.connection as any).emit('query', queryData);
    (db.connection as any).emit('query-error', { code: 'SQLITE_ERROR' }, queryData);
    await waitForSubscribers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][0]).toMatchObject({
      type: 'query.error',
      errorCode: 'SQLITE_ERROR',
      success: false,
    });

    await db.destroy();
  });

  it('emits query error events even when duration is below slowQueryMs', async () => {
    const db = new Database({
      ...baseConfig,
      performance: {
        enabled: true,
        slowQueryMs: 9_999_999,
      },
    });

    const subscriber = jest.fn();
    db.subscribeToPerformanceEvents(subscriber);

    const queryData = {
      __knexQueryUid: 'query-error-fast',
      sql: 'select * from missing_table',
      method: 'select',
    };

    (db.connection as any).emit('query', queryData);
    (db.connection as any).emit('query-error', { code: 'NO_SUCH_TABLE' }, queryData);
    await waitForSubscribers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][0]).toMatchObject({
      type: 'query.error',
      errorCode: 'NO_SUCH_TABLE',
      success: false,
    });

    await db.destroy();
  });

  it('does not store sink-only keys like output on Database.performance', async () => {
    const db = new Database({
      ...baseConfig,
      performance: {
        enabled: false,
        output: 'log',
      } as any,
    });

    expect((db.performance as any).output).toBeUndefined();

    await db.destroy();
  });

  it('does not emit when disabled or below threshold', async () => {
    const disabledDb = new Database({
      ...baseConfig,
      performance: {
        enabled: false,
        slowQueryMs: 0,
      },
    });
    const disabledSubscriber = jest.fn();
    disabledDb.subscribeToPerformanceEvents(disabledSubscriber);

    const disabledQueryData = {
      __knexQueryUid: 'query-3',
      sql: 'select 1',
      method: 'select',
    };

    (disabledDb.connection as any).emit('query', disabledQueryData);
    (disabledDb.connection as any).emit('query-response', [], disabledQueryData);
    await waitForSubscribers();

    expect(disabledSubscriber).not.toHaveBeenCalled();
    await disabledDb.destroy();

    const thresholdDb = new Database({
      ...baseConfig,
      performance: {
        enabled: true,
        slowQueryMs: 1_000_000,
      },
    });
    const thresholdSubscriber = jest.fn();
    thresholdDb.subscribeToPerformanceEvents(thresholdSubscriber);

    const thresholdQueryData = {
      __knexQueryUid: 'query-4',
      sql: 'select 1',
      method: 'select',
    };

    (thresholdDb.connection as any).emit('query', thresholdQueryData);
    (thresholdDb.connection as any).emit('query-response', [], thresholdQueryData);
    await waitForSubscribers();

    expect(thresholdSubscriber).not.toHaveBeenCalled();
    await thresholdDb.destroy();
  });

  it('supports unsubscribe and optional SQL/bindings capture', async () => {
    const db = new Database({
      ...baseConfig,
      performance: {
        enabled: true,
        slowQueryMs: 0,
        captureSqlText: true,
        captureBindings: true,
      },
    });

    const subscriber = jest.fn();
    const unsubscribe = db.subscribeToPerformanceEvents(subscriber);

    const queryData = {
      __knexQueryUid: 'query-5',
      sql: 'update users set age = ? where id = ?',
      method: 'update',
      bindings: [50, 1],
    };

    (db.connection as any).emit('query', queryData);
    (db.connection as any).emit('query-response', [], queryData);
    await waitForSubscribers();

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][0]).toMatchObject({
      sql: 'update users set age = ? where id = ?',
      bindings: [50, 1],
      queryType: 'update',
    });

    unsubscribe();
    (db.connection as any).emit('query', { ...queryData, __knexQueryUid: 'query-6' });
    (db.connection as any).emit('query-response', [], { ...queryData, __knexQueryUid: 'query-6' });
    await waitForSubscribers();

    expect(subscriber).toHaveBeenCalledTimes(1);

    await db.destroy();
  });
});

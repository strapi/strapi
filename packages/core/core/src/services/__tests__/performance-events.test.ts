import { bridgeDatabasePerformanceEvents } from '../performance-events';

describe('Performance events bridge', () => {
  it('bridges DB slow query events to event hub', () => {
    const subscribers: Array<(event: any) => void> = [];
    const db = {
      subscribeToPerformanceEvents: jest.fn((subscriber) => {
        subscribers.push(subscriber);
        return () => {};
      }),
    } as any;

    const eventHub = {
      emit: jest.fn().mockResolvedValue(undefined),
    } as any;

    const logger = {
      warn: jest.fn(),
    } as any;

    bridgeDatabasePerformanceEvents({ db, eventHub, logger, output: 'none' });

    subscribers[0]({
      type: 'query.slow',
      durationMs: 120,
      dbClient: 'postgres',
      queryType: 'select',
      queryFingerprint: 'select * from users where id = ?',
      success: true,
    });

    expect(eventHub.emit).toHaveBeenCalledWith('performance.db.query.slow', expect.any(Object));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs and emits query error events when logging output is enabled', () => {
    const subscribers: Array<(event: any) => void> = [];
    const db = {
      subscribeToPerformanceEvents: jest.fn((subscriber) => {
        subscribers.push(subscriber);
        return () => {};
      }),
    } as any;

    const eventHub = {
      emit: jest.fn().mockResolvedValue(undefined),
    } as any;

    const logger = {
      warn: jest.fn(),
    } as any;

    bridgeDatabasePerformanceEvents({ db, eventHub, logger, output: 'log' });

    subscribers[0]({
      type: 'query.error',
      durationMs: 140,
      dbClient: 'sqlite',
      queryType: 'other',
      queryFingerprint: 'unknown',
      success: false,
      errorCode: 'SQLITE_ERROR',
      requestId: 'req-123',
    });

    expect(eventHub.emit).toHaveBeenCalledWith('performance.db.query.error', expect.any(Object));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'performance.db.query.error',
        durationMs: 140,
        errorCode: 'SQLITE_ERROR',
      })
    );
  });
});

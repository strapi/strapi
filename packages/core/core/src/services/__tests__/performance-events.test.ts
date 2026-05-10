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
      timestamp: '2020-01-01T00:00:00.000Z',
      durationMs: 120,
      dbClient: 'postgres',
      queryType: 'select',
      queryFingerprint: 'select * from users where id = ?',
      success: true,
    });

    expect(eventHub.emit).toHaveBeenCalledWith(
      'performance.db.query.slow',
      expect.objectContaining({
        schemaVersion: 1,
        eventVersion: 1,
        durationMs: 120,
        dbClient: 'postgres',
      })
    );
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
      timestamp: '2020-01-01T00:00:00.000Z',
      durationMs: 140,
      dbClient: 'sqlite',
      queryType: 'other',
      queryFingerprint: 'unknown',
      success: false,
      errorCode: 'SQLITE_ERROR',
      requestId: 'req-123',
    });

    expect(eventHub.emit).toHaveBeenCalledWith(
      'performance.db.query.error',
      expect.objectContaining({
        schemaVersion: 1,
        requestId: 'req-123',
        errorCode: 'SQLITE_ERROR',
      })
    );
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const line = logger.warn.mock.calls[0][0] as string;
    expect(line).toContain('performance.db.query.error');
    expect(line).toContain('"durationMs":140');
    expect(line).toContain('"errorCode":"SQLITE_ERROR"');
    expect(line).toContain('"schemaVersion":1');
  });
});

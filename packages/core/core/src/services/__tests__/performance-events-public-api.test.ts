import createEventHub from '../event-hub';
import { createPerformanceEventsPublicApi } from '../performance-events-public-api';

describe('performance events public API', () => {
  it('isolates listener errors and logs a warning', async () => {
    const eventHub = createEventHub();
    const strapi = {
      eventHub,
      log: { warn: jest.fn() },
    };

    const api = createPerformanceEventsPublicApi(strapi as any);
    expect(api.getSchemaVersion()).toBe(1);
    expect(api.getCapabilities().events).toEqual(
      expect.arrayContaining([
        'performance.db.query.slow',
        'performance.db.query.error',
        'performance.request.start',
        'performance.request.stage',
        'performance.request.summary',
      ])
    );

    const listener = jest.fn().mockRejectedValue(new Error('plugin boom'));
    const off = api.subscribe('performance.db.query.slow', listener);

    await expect(eventHub.emit('performance.db.query.slow', { x: 1 })).resolves.toBeUndefined();
    expect(listener).toHaveBeenCalled();
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('performance-events: listener error')
    );

    off();
    await eventHub.emit('performance.db.query.slow', { x: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

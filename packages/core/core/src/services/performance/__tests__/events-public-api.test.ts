import createEventHub from '../../event-hub';
import { createPerformanceEventsPublicApi } from '../events-public-api';
import { PERFORMANCE_HUB_EVENT } from '../hub-events';

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
        PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW,
        PERFORMANCE_HUB_EVENT.DB_QUERY_ERROR,
        PERFORMANCE_HUB_EVENT.REQUEST_START,
        PERFORMANCE_HUB_EVENT.REQUEST_STAGE,
        PERFORMANCE_HUB_EVENT.REQUEST_SUMMARY,
      ])
    );

    const listener = jest.fn().mockRejectedValue(new Error('plugin boom'));
    const off = api.subscribe(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, listener);

    await expect(
      eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, { x: 1 })
    ).resolves.toBeUndefined();
    expect(listener).toHaveBeenCalled();
    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('performance-events: listener error')
    );

    off();
    await eventHub.emit(PERFORMANCE_HUB_EVENT.DB_QUERY_SLOW, { x: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

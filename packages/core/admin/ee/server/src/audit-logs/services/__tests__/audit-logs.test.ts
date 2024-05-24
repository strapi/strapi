import { createAuditLogsLifecycleService } from '../lifecycles';
import createEventHub from '../../../../../../../core/dist/services/event-hub';
import { scheduleJob } from 'node-schedule';

import '@strapi/types';

jest.mock('node-schedule', () => ({
  scheduleJob: jest.fn(),
}));

describe('Audit logs service', () => {
  const mockSubscribe = jest.fn();

  const strapi = {
    requestContext: {
      get() {
        return {
          state: {
            user: {
              id: 1,
            },
            route: {
              info: {
                type: 'admin',
              },
            },
          },
        };
      },
    },
    ee: {
      features: {
        isEnabled: jest.fn().mockReturnValue(false),
        get: jest.fn(),
      },
    },
    add: jest.fn(),
    get: jest.fn(() => ({
      deleteExpiredEvents: jest.fn(),
    })),
    config: {
      get(key: any) {
        switch (key) {
          case 'admin.auditLogs.enabled':
            return true;
          case 'admin.auditLogs.retentionDays':
            return undefined;
          default:
            return null;
        }
      },
    },
    eventHub: {
      ...createEventHub(),
      subscribe: mockSubscribe,
    },
    hook: () => ({
      register: jest.fn(),
    }),
  } as any;

  afterEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should not subscribe to events when the license does not allow it', async () => {
    // Should not subscribe to events at first
    const lifecycle = createAuditLogsLifecycleService(strapi);
    await lifecycle.register();
    expect(mockSubscribe).not.toHaveBeenCalled();

    // Should subscribe to events when license gets enabled
    jest.mocked(strapi.ee.features.isEnabled).mockImplementationOnce(() => true);
    await strapi.eventHub.emit('ee.enable');
    expect(mockSubscribe).toHaveBeenCalled();

    // Should unsubscribe to events when license gets disabled
    mockSubscribe.mockClear();
    jest.mocked(strapi.ee.features.isEnabled).mockImplementationOnce(() => false);
    await strapi.eventHub.emit('ee.disable');
    expect(mockSubscribe).not.toHaveBeenCalled();

    // Should recreate the service when license updates
    const destroySpy = jest.spyOn(lifecycle, 'destroy');
    const registerSpy = jest.spyOn(lifecycle, 'register');
    await strapi.eventHub.emit('ee.update');
    expect(destroySpy).toHaveBeenCalled();
    expect(registerSpy).toHaveBeenCalled();
  });

  it('should create a cron job that executed one time a day', async () => {
    // @ts-expect-error scheduleJob
    const mockScheduleJob = scheduleJob.mockImplementationOnce(
      jest.fn((rule, callback) => callback())
    );

    const lifecycle = createAuditLogsLifecycleService(strapi);
    await lifecycle.register();

    expect(mockScheduleJob).toHaveBeenCalledTimes(1);
    expect(mockScheduleJob).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
  });
});

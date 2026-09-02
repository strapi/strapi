import { createAuditLogsLifecycleService } from '../lifecycles';
import '@strapi/types';

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
    cron: {
      add: jest.fn(),
      remove: jest.fn(),
    },
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
      subs: {} as Record<string, (...args: unknown[]) => unknown>,
      emit(eventName: string, ...args: unknown[]) {
        this.subs[eventName](...args);
      },
      on(eventName: string, func: (...args: unknown[]) => unknown) {
        this.subs[eventName] = func;
        return () => {
          delete this.subs[eventName];
        };
      },
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
    const destroySpy = jest.spyOn(lifecycle, 'destroy');
    const registerSpy = jest.spyOn(lifecycle, 'register');

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
    expect(destroySpy).toHaveBeenCalled();

    // Should recreate the service when license updates
    await strapi.eventHub.emit('ee.update');
    expect(destroySpy).toHaveBeenCalled();
    expect(registerSpy).toHaveBeenCalled();
  });

  it('routes mfa change events and the gated-login notice into the audit log', async () => {
    // Mock Strapi EE feature to be enabled for this test
    jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);
    const saveEvent = jest.fn();
    // Only this one call to `strapi.get('audit-logs')` -- inside `createAuditLogsLifecycleService`
    // below -- gets the `saveEvent` spy; every other test keeps the base double.
    strapi.get.mockReturnValueOnce({ deleteExpiredEvents: jest.fn(), saveEvent });

    const lifecycle = createAuditLogsLifecycleService(strapi);
    await lifecycle.register();

    // The handler `strapi.eventHub.subscribe` was just given -- the most recent registration,
    // since `mockSubscribe`'s call history is shared across this file's tests.
    const [handleEvent] = mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1];

    await handleEvent('admin.mfa.enabled', { userId: '1' });
    await handleEvent('admin.mfa.disabled', { userId: '1' });
    await handleEvent('admin.mfa.reset', { userId: '1' });
    await handleEvent('admin.mfa.challenge.failed', { userId: '1' });
    await handleEvent('admin.auth.mfa_required', { userId: '1' });

    // All five are on the allow-list, so all five produce a saved audit event -- an event name
    // eventMap doesn't recognise resolves to `undefined` and is silently dropped instead.
    expect(saveEvent).toHaveBeenCalledTimes(5);
  });

  it('audits a failed second-factor login using the payload userId, even though ctx.state.user is not set yet', async () => {
    // `/login/mfa` challenges a second factor before `ctx.state.user` exists -- `issueSession`
    // (controllers/authentication.ts) only populates it on a successful login -- so this is
    // exactly the request-context shape a failed challenge during login actually has: an
    // admin-authenticated route, but no session-context user yet.
    jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);
    const saveEvent = jest.fn();
    strapi.get.mockReturnValueOnce({ deleteExpiredEvents: jest.fn(), saveEvent });
    const originalGet = strapi.requestContext.get;
    strapi.requestContext.get = () => ({ state: { route: { info: { type: 'admin' } } } });

    try {
      const lifecycle = createAuditLogsLifecycleService(strapi);
      await lifecycle.register();
      const [handleEvent] = mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1];

      await handleEvent('admin.mfa.challenge.failed', { userId: '42' });

      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.mfa.challenge.failed', userId: '42' })
      );
    } finally {
      strapi.requestContext.get = originalGet;
    }
  });

  it('still drops a non-mfa event when ctx.state.user is not set', async () => {
    // The control for the test above: the payload-userId fallback is scoped to `admin.mfa.*`
    // names only, so anything else with no session-context user is dropped exactly as before.
    jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);
    const saveEvent = jest.fn();
    strapi.get.mockReturnValueOnce({ deleteExpiredEvents: jest.fn(), saveEvent });
    const originalGet = strapi.requestContext.get;
    strapi.requestContext.get = () => ({ state: { route: { info: { type: 'admin' } } } });

    try {
      const lifecycle = createAuditLogsLifecycleService(strapi);
      await lifecycle.register();
      const [handleEvent] = mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1];

      await handleEvent('admin.auth.success', { userId: '42' });

      expect(saveEvent).not.toHaveBeenCalled();
    } finally {
      strapi.requestContext.get = originalGet;
    }
  });

  it('should create a cron job that executed one time a day', async () => {
    // Mock Strapi EE feature to be enabled for this test
    jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);

    const lifecycle = createAuditLogsLifecycleService(strapi);
    await lifecycle.register();

    // Verify that strapi.cron.add was called with the correct job configuration
    expect(strapi.cron.add).toHaveBeenCalledWith({
      deleteExpiredAuditLogs: {
        task: expect.any(Function),
        options: '0 0 * * *',
      },
    });
  });
});

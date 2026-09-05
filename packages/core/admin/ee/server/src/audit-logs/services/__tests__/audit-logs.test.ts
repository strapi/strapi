import { createAuditLogsLifecycleService } from '../lifecycles';
import '@strapi/types';

describe('Audit logs service', () => {
  const mockSubscribe = jest.fn();

  const adminRequestState = {
    state: {
      user: {
        id: 1,
        email: 'kai@strapi.io',
        firstname: 'Kai',
        lastname: 'Doe',
      },
      route: {
        info: {
          type: 'admin',
        },
      },
    },
  };

  const strapi = {
    requestContext: {
      get: jest.fn(() => adminRequestState),
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
    log: {
      error: jest.fn(),
      warn: jest.fn(),
    },
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

  describe('registerEvent', () => {
    const saveEvent = jest.fn();

    /**
     * Registers the service with the license enabled and returns the subscriber it
     * handed to the event hub, so tests can emit events straight into it.
     */
    const setup = async () => {
      saveEvent.mockClear();
      mockSubscribe.mockClear();
      jest.mocked(strapi.get).mockReturnValue({
        saveEvent,
        deleteExpiredEvents: jest.fn(),
      });
      jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);

      const lifecycle = createAuditLogsLifecycleService(strapi);
      await lifecycle.register();

      return { lifecycle, handleEvent: mockSubscribe.mock.calls[0][0] };
    };

    const releaseTransform = (event: any) => ({
      resource: { type: 'release', id: event.releaseId, name: event.name },
    });

    const actingAdmin = {
      type: 'admin-user',
      user: { id: 1, email: 'kai@strapi.io', name: 'Kai Doe' },
    };

    it('records a registered event wrapped with actor and origin', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.create', releaseTransform);
      await handleEvent('release.create', { releaseId: 1, name: 'March' });

      expect(saveEvent).toHaveBeenCalledWith({
        action: 'release.create',
        date: expect.any(String),
        payload: {
          action: 'release.create',
          date: expect.any(String),
          resource: { type: 'release', id: 1, name: 'March' },
          actor: actingAdmin,
          origin: 'admin-panel',
        },
        userId: 1,
      });
    });

    it('ignores an event that has not been registered', async () => {
      const { handleEvent } = await setup();

      await handleEvent('release.create', { releaseId: 1 });

      expect(saveEvent).not.toHaveBeenCalled();
    });

    it('awaits an async transformer', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.create', async (event: any) => ({
        resource: { type: 'release', id: event.releaseId },
        details: { fetched: true },
      }));
      await handleEvent('release.create', { releaseId: 7 });

      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ details: { fetched: true } }),
        })
      );
    });

    it('records a minimal row when the transformer fails', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.create', () => {
        throw new Error('boom');
      });
      await handleEvent('release.create', { releaseId: 1 });

      // The audit fact survives even when its details cannot be built
      expect(saveEvent).toHaveBeenCalledWith({
        action: 'release.create',
        date: expect.any(String),
        payload: {
          action: 'release.create',
          date: expect.any(String),
          actor: actingAdmin,
          origin: 'admin-panel',
        },
        userId: 1,
      });
      expect(strapi.log.error).toHaveBeenCalled();
    });

    it('never lets the transformer take over actor or origin', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.create', (event: any) => ({
        resource: { type: 'release', id: event.releaseId },
        actor: { type: 'system' },
        origin: 'scheduler',
      }));
      await handleEvent('release.create', { releaseId: 1 });

      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ actor: actingAdmin, origin: 'admin-panel' }),
        })
      );
    });

    it('ignores an origin claimed in the emitted payload', async () => {
      const { lifecycle, handleEvent } = await setup();

      // The gate reads the execution context, never the payload: a stray or forged
      // `origin` field must not open it
      lifecycle.registerEvent('release.publish', releaseTransform);
      jest.mocked(strapi.requestContext.get).mockReturnValueOnce(undefined as any);
      await handleEvent('release.publish', { releaseId: 1, origin: 'scheduler' });

      expect(saveEvent).not.toHaveBeenCalled();
    });

    it('records an admin action with its user, whatever the payload claims', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.publish', releaseTransform);
      await handleEvent('release.publish', { releaseId: 1, name: 'March' });

      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          payload: expect.objectContaining({ actor: actingAdmin, origin: 'admin-panel' }),
        })
      );
    });

    it('records a legacy event from a system execution context, with no user', async () => {
      const { handleEvent } = await setup();

      // The scheduler runs its publish inside requestContext.run() with this state
      jest.mocked(strapi.requestContext.get).mockReturnValueOnce({
        state: { auditSource: 'scheduler' },
      } as any);
      await handleEvent('entry.publish', { uid: 'api::article.article', entry: { id: 1 } });

      expect(saveEvent).toHaveBeenCalledWith({
        action: 'entry.publish',
        date: expect.any(String),
        payload: { uid: 'api::article.article', entry: { id: 1 }, origin: 'scheduler' },
        userId: null,
      });
    });

    it('records a registered event from a system execution context, with a system actor', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.trigger', releaseTransform);
      jest.mocked(strapi.requestContext.get).mockReturnValueOnce({
        state: { auditSource: 'scheduler' },
      } as any);
      await handleEvent('release.trigger', { releaseId: 1, name: 'March' });

      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          payload: expect.objectContaining({ actor: { type: 'system' }, origin: 'scheduler' }),
        })
      );
    });

    it('still requires a user when the context origin implies one', async () => {
      const { lifecycle, handleEvent } = await setup();

      // An mcp context without a user must not pass as a system action
      lifecycle.registerEvent('release.trigger', releaseTransform);
      jest.mocked(strapi.requestContext.get).mockReturnValueOnce({
        state: { auditSource: 'mcp' },
      } as any);
      await handleEvent('release.trigger', { releaseId: 1 });

      expect(saveEvent).not.toHaveBeenCalled();
    });

    it('keeps the stored shape of legacy events untouched', async () => {
      const { handleEvent } = await setup();

      // The 28 built-in events predate the standard: first argument stored as-is
      await handleEvent('entry.create', { uid: 'api::article.article', entry: { id: 1 } });

      expect(saveEvent).toHaveBeenCalledWith({
        action: 'entry.create',
        date: expect.any(String),
        payload: { uid: 'api::article.article', entry: { id: 1 }, origin: 'admin-panel' },
        userId: 1,
      });
    });

    it('still ignores upload uids on legacy events', async () => {
      const { handleEvent } = await setup();

      await handleEvent('media.create', { uid: 'plugin::upload.file' });

      expect(saveEvent).not.toHaveBeenCalled();
    });

    it('refuses to register a built-in event', async () => {
      const { lifecycle } = await setup();

      // Registering one would change the stored shape of an event consumers rely on
      expect(() => lifecycle.registerEvent('entry.publish', releaseTransform)).toThrow(
        'built-in events'
      );
    });

    it('warns when a registration replaces another', async () => {
      const { lifecycle } = await setup();

      lifecycle.registerEvent('release.create', releaseTransform);
      lifecycle.registerEvent('release.create', releaseTransform);

      expect(strapi.log.warn).toHaveBeenCalled();
    });

    it('logs a failing transformer lookup instead of propagating it', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.create', releaseTransform);
      // processEvent itself throwing must not reach the emitter either
      jest.mocked(strapi.requestContext.get).mockImplementationOnce(() => {
        throw new Error('context exploded');
      });

      await expect(handleEvent('release.create', { releaseId: 1 })).resolves.toBeUndefined();
      expect(strapi.log.error).toHaveBeenCalled();
    });

    it('logs a failed insert instead of propagating it', async () => {
      const { lifecycle, handleEvent } = await setup();

      lifecycle.registerEvent('release.create', releaseTransform);
      saveEvent.mockRejectedValueOnce(new Error('db down'));

      // Most emitters don't await their emit, and a rejection with no one awaiting
      // it takes the process down
      await expect(handleEvent('release.create', { releaseId: 1 })).resolves.toBeUndefined();
      expect(strapi.log.error).toHaveBeenCalled();
    });

    it('keeps registered events when the service re-subscribes', async () => {
      // A license change makes the service unsubscribe and register() again. It reuses
      // the same instance, so events registered by plugins have to survive that.
      const { lifecycle } = await setup();

      lifecycle.registerEvent('release.create', releaseTransform);

      lifecycle.destroy();
      mockSubscribe.mockClear();
      jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);
      await lifecycle.register();

      const handleEvent = mockSubscribe.mock.calls[0][0];
      await handleEvent('release.create', { releaseId: 1 });

      expect(saveEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'release.create' }));
    });
  });
});

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

  // `admin.mfa.*` events with no session user are attributed by loading the account the payload
  // names; this double answers that lookup with a minimal user row for any id.
  const adminUserFindOne = jest.fn(async ({ where }: { where: { id: string | number } }) => ({
    id: where.id,
    email: 'locked@strapi.io',
    firstname: 'Locked',
    lastname: 'User',
  }));

  const strapi = {
    db: { query: jest.fn(() => ({ findOne: adminUserFindOne })) },
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
    await handleEvent('admin.mfa.locked', { userId: '1' });
    await handleEvent('admin.mfa.unlocked', { userId: '1', byUserId: '9' });
    await handleEvent('admin.mfa.authenticator.replaced', { userId: '1' });
    await handleEvent('admin.mfa.device.trusted', { userId: '1' });
    await handleEvent('admin.mfa.device.trust.revoked', { userId: '1', byUserId: '9', count: 2 });
    await handleEvent('admin.mfa.trusted.device.used', { userId: '1' });
    await handleEvent('admin.mfa.passkey.registered', { userId: '1' });
    await handleEvent('admin.mfa.passkey.removed', { userId: '1', byUserId: '9', count: 2 });
    await handleEvent('admin.mfa.passkey.used', { userId: '1' });

    // All fourteen are on the allow-list, so all fourteen produce a saved audit event -- an event
    // name eventMap doesn't recognise resolves to `undefined` and is silently dropped instead.
    expect(saveEvent).toHaveBeenCalledTimes(14);
  });

  it('audits an account lock using the payload userId, even though ctx.state.user is not set yet', async () => {
    // The refresh path locks an account outside any request context that has ctx.state.user set,
    // just like the failed-challenge case above -- `admin.mfa.locked` must fall back to the
    // payload's userId the same way.
    jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);
    const saveEvent = jest.fn();
    strapi.get.mockReturnValueOnce({ deleteExpiredEvents: jest.fn(), saveEvent });
    const originalGet = strapi.requestContext.get;
    strapi.requestContext.get = () => ({ state: { route: { info: { type: 'admin' } } } });

    try {
      const lifecycle = createAuditLogsLifecycleService(strapi);
      await lifecycle.register();
      const [handleEvent] = mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1];

      await handleEvent('admin.mfa.locked', { userId: '42' });

      expect(strapi.db.query).toHaveBeenCalledWith('admin::user');
      expect(adminUserFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '42' } })
      );
      expect(saveEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.mfa.locked', userId: '42' })
      );
    } finally {
      strapi.requestContext.get = originalGet;
    }
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

  it('drops an actorless admin.mfa.* event whose payload names no existing user', async () => {
    jest.mocked(strapi.ee.features.isEnabled).mockReturnValueOnce(true);
    const saveEvent = jest.fn();
    strapi.get.mockReturnValueOnce({ deleteExpiredEvents: jest.fn(), saveEvent });
    const originalGet = strapi.requestContext.get;
    strapi.requestContext.get = () => ({ state: { route: { info: { type: 'admin' } } } });
    adminUserFindOne.mockResolvedValueOnce(null as never);

    try {
      const lifecycle = createAuditLogsLifecycleService(strapi);
      await lifecycle.register();
      const [handleEvent] = mockSubscribe.mock.calls[mockSubscribe.mock.calls.length - 1];

      await handleEvent('admin.mfa.locked', { userId: '999' });

      expect(saveEvent).not.toHaveBeenCalled();
    } finally {
      strapi.requestContext.get = originalGet;
    }
  });

  it('still drops a non-mfa event when ctx.state.user is not set', async () => {
    // The control for the test above: the payload-userId fallback is scoped to `admin.mfa.*`
    // names only, so anything else with no session-context user is still dropped.
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

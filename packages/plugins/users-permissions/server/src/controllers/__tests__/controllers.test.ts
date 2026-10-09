import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createStrapiMock } from '../../../tests/utils';
import { createMockContext } from './utils';
import userController from '../user';
import roleController from '../role';
import settingsController from '../settings';
import permissionsController from '../permissions';
import contentManagerController from '../content-manager-user';

const createContext = (body: Record<string, unknown> = {}) =>
  createMockContext({
    request: { body },
    params: { id: '1', role: '2' },
    query: { populate: 'role' },
    state: { user: { id: 9 }, auth: { scope: ['read'] }, userAbility: {} },
    send: vi.fn(),
    created: vi.fn(),
    forbidden: vi.fn(),
    unauthorized: vi.fn(),
    notFound: vi.fn(),
  });

let strapi: ReturnType<typeof createFixture>['strapi'];
let query: ReturnType<typeof createFixture>['query'];
let store: ReturnType<typeof createFixture>['store'];
let services: ReturnType<typeof createFixture>['services'];
let permissionManager: ReturnType<typeof createFixture>['permissionManager'];
let documentManager: ReturnType<typeof createFixture>['documentManager'];

const createFixture = () => {
  const query = { findOne: vi.fn(), count: vi.fn() };
  const store = { get: vi.fn().mockResolvedValue({ unique_email: true }), set: vi.fn() };
  const services = {
    user: {
      add: vi.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
      fetch: vi.fn().mockResolvedValue({ id: 1, provider: 'local' }),
      fetchAll: vi.fn().mockResolvedValue([{ id: 1 }]),
      edit: vi.fn().mockResolvedValue({ id: 1 }),
      count: vi.fn().mockResolvedValue(2),
      remove: vi.fn().mockResolvedValue({ id: 1 }),
    },
    role: {
      createRole: vi.fn(),
      updateRole: vi.fn(),
      deleteRole: vi.fn(),
      findOne: vi.fn().mockResolvedValue({ id: 2, name: 'Editor' }),
      find: vi.fn().mockResolvedValue([{ id: 2, name: 'Editor' }]),
    },
    providers: { buildRedirectUri: vi.fn((name: string) => `https://example.com/${name}`) },
    'users-permissions': {
      getActions: vi.fn().mockResolvedValue({}),
      getRoutes: vi.fn().mockResolvedValue([]),
    },
  };
  const permissionManager = {
    isAllowed: true,
    ability: { cannot: vi.fn().mockReturnValue(false) },
    action: 'update',
    toSubject: vi.fn((doc: unknown) => doc),
    pickPermittedFieldsOf: vi.fn((body: Record<string, unknown>) => ({ ...body })),
    sanitizeOutput: vi.fn((data: Record<string, unknown>) => ({ ...data, safe: true })),
  };
  const documentManager = {
    findOne: vi.fn().mockResolvedValue({
      id: 1,
      documentId: 'document-1',
      createdBy: { id: 3, roles: ['secret'] },
    }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({ id: 1 }),
  };
  const sanitizeLocalization = vi.fn(() => (role: Record<string, unknown>) => ({
    ...role,
    safe: true,
  }));
  const strapi = createStrapiMock({
    store: vi.fn(() => store),
    db: { query: vi.fn(() => query) },
    getModel: vi.fn((uid: string) => ({ uid })),
    contentAPI: {
      validate: { query: vi.fn() },
      sanitize: {
        query: vi.fn().mockResolvedValue({ filters: { id: 1 } }),
        output: vi.fn((data: Record<string, unknown>) => ({ ...data, safe: true })),
      },
    },
    service: vi.fn((name: string) =>
      name === 'admin::permission'
        ? { createPermissionsManager: () => permissionManager }
        : documentManager
    ),
    plugin: vi.fn((name: string) =>
      name === 'i18n'
        ? { service: () => ({ sanitizeLocalizationFields: sanitizeLocalization }) }
        : {
            service: (service: keyof typeof services) => services[service],
            policies: { permissions: {}, rateLimit: {} },
          }
    ),
  });
  vi.stubGlobal('strapi', undefined);
  return {
    strapi,
    query,
    store,
    services,
    permissionManager,
    documentManager,
    sanitizeLocalization,
  };
};

beforeEach(() => {
  ({ strapi, query, store, services, permissionManager, documentManager } = createFixture());
});

afterEach(() => vi.unstubAllGlobals());

describe('user controller', () => {
  const validBody = { username: 'test', email: 'TEST@example.com', password: 'password', role: 2 };

  test('creates a local user and sanitizes the response using request auth', async () => {
    const ctx = createContext(validBody);
    await userController({ strapi }).create(ctx);
    expect(services.user.add).toHaveBeenCalledWith({
      ...validBody,
      provider: 'local',
      email: 'test@example.com',
    });
    expect(strapi.contentAPI.sanitize.output).toHaveBeenCalledWith(
      { id: 1, email: 'test@example.com' },
      { uid: 'plugin::users-permissions.user' },
      { auth: ctx.state.auth }
    );
    expect(ctx.created).toHaveBeenCalledWith({ id: 1, email: 'test@example.com', safe: true });
  });

  test('rejects duplicate email without creating a user', async () => {
    query.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 3 });
    await expect(userController({ strapi }).create(createContext(validBody))).rejects.toThrow(
      'Email already taken'
    );
    expect(services.user.add).not.toHaveBeenCalled();
  });

  test('reports persistence failures', async () => {
    services.user.add.mockRejectedValue(new Error('storage unavailable'));
    await expect(userController({ strapi }).create(createContext(validBody))).rejects.toThrow(
      'storage unavailable'
    );
  });

  test('rejects an update for a missing user', async () => {
    services.user.fetch.mockResolvedValue(null);
    await expect(
      userController({ strapi }).update(createContext({ username: 'new' }))
    ).rejects.toThrow('User not found');
    expect(services.user.edit).not.toHaveBeenCalled();
  });

  test.each([null, ''] as const)('does not clear a local password with %s', async (password) => {
    await expect(userController({ strapi }).update(createContext({ password }))).rejects.toThrow(
      'password.notNull'
    );
    expect(services.user.edit).not.toHaveBeenCalled();
  });

  test.each([
    [{ username: 'taken' }, 'Username already taken'],
    [{ email: 'taken@example.com' }, 'Email already taken'],
  ] as const)('rejects another user identifier %j', async (body, message) => {
    query.findOne.mockResolvedValue({ id: 2 });
    await expect(userController({ strapi }).update(createContext(body))).rejects.toThrow(message);
    expect(services.user.edit).not.toHaveBeenCalled();
  });

  test('accepts unchanged identifiers across numeric and string ids and lowercases email', async () => {
    query.findOne.mockResolvedValue({ id: 1 });
    const ctx = createContext({ username: 'test', email: 'TEST@example.com' });
    await userController({ strapi }).update(ctx);
    expect(services.user.edit).toHaveBeenCalledWith(1, {
      username: 'test',
      email: 'test@example.com',
    });
    expect(ctx.send).toHaveBeenCalledWith({ id: 1, safe: true });
  });

  test.each(['find', 'findOne', 'count', 'me'] as const)(
    '%s rejects invalid queries before reading data',
    async (action) => {
      strapi.contentAPI.validate.query.mockRejectedValue(new Error('Forbidden query'));
      await expect(userController({ strapi })[action](createContext())).rejects.toThrow(
        'Forbidden query'
      );
      expect(services.user.fetch).not.toHaveBeenCalled();
      expect(services.user.fetchAll).not.toHaveBeenCalled();
      expect(services.user.count).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['find', [{ id: 1, safe: true }]],
    ['findOne', { id: 1, provider: 'local', safe: true }],
    ['count', 2],
    ['me', { id: 1, provider: 'local', safe: true }],
  ] as const)('%s only passes sanitized queries to the service', async (action, expected) => {
    const ctx = createContext();
    await userController({ strapi })[action](ctx);
    expect(strapi.contentAPI.sanitize.query).toHaveBeenCalledWith(
      ctx.query,
      { uid: 'plugin::users-permissions.user' },
      { auth: ctx.state.auth }
    );
    const calls = [
      ...services.user.fetch.mock.calls,
      ...services.user.fetchAll.mock.calls,
      ...services.user.count.mock.calls,
    ];
    expect(calls[0].at(-1)).toEqual({ filters: { id: 1 } });
    expect(ctx.body).toEqual(expected);
  });

  test('returns null for a missing user without sanitizing it', async () => {
    services.user.fetch.mockResolvedValue(null);
    const ctx = createContext();
    await userController({ strapi }).findOne(ctx);
    expect(ctx.body).toBeNull();
    expect(strapi.contentAPI.sanitize.output).not.toHaveBeenCalled();
  });

  test('requires authentication for me', async () => {
    const ctx = createContext();
    ctx.state = {};
    await userController({ strapi }).me(ctx);
    expect(ctx.unauthorized).toHaveBeenCalled();
    expect(services.user.fetch).not.toHaveBeenCalled();
  });

  test('sanitizes deleted users', async () => {
    const ctx = createContext();
    await userController({ strapi }).destroy(ctx);
    expect(services.user.remove).toHaveBeenCalledWith({ id: '1' });
    expect(ctx.send).toHaveBeenCalledWith({ id: 1, safe: true });
  });
});

describe('role controller', () => {
  test.each(['createRole', 'updateRole'] as const)('%s rejects an empty body', async (action) => {
    await expect(roleController({ strapi })[action](createContext())).rejects.toThrow(
      'Request body cannot be empty'
    );
    expect(services.role[action]).not.toHaveBeenCalled();
  });

  test.each(['createRole', 'updateRole'] as const)(
    '%s persists the submitted role',
    async (action) => {
      const ctx = createContext({ name: 'Writer' });
      await roleController({ strapi })[action](ctx);
      expect(services.role[action]).toHaveBeenCalledWith(
        ...(action === 'updateRole' ? ['2', ctx.request.body] : [ctx.request.body])
      );
      expect(ctx.send).toHaveBeenCalledWith({ ok: true });
    }
  );

  test.each(['find', 'findOne'] as const)('%s sanitizes localization fields', async (action) => {
    const ctx = createContext();
    await roleController({ strapi })[action](ctx);
    const role = { id: 2, name: 'Editor', safe: true };
    expect(ctx.send).toHaveBeenCalledWith(action === 'find' ? { roles: [role] } : { role });
  });

  test('returns not found for an unknown role', async () => {
    services.role.findOne.mockResolvedValue(null);
    const ctx = createContext();
    await roleController({ strapi }).findOne(ctx);
    expect(ctx.notFound).toHaveBeenCalled();
  });

  test('never deletes the public role even with a string request id', async () => {
    query.findOne.mockResolvedValue({ id: 2 });
    await expect(roleController({ strapi }).deleteRole(createContext())).rejects.toThrow(
      'Cannot delete public role'
    );
    expect(services.role.deleteRole).not.toHaveBeenCalled();
  });

  test('rejects a missing role identifier before querying or deleting roles', async () => {
    const ctx = createContext();
    ctx.params = {};
    await expect(roleController({ strapi }).deleteRole(ctx)).rejects.toThrow();
    expect(query.findOne).not.toHaveBeenCalled();
    expect(services.role.deleteRole).not.toHaveBeenCalled();
  });

  test('reassigns users to the public role when deleting a custom role', async () => {
    query.findOne.mockResolvedValue({ id: 1 });
    const ctx = createContext();
    await roleController({ strapi }).deleteRole(ctx);
    expect(services.role.deleteRole).toHaveBeenCalledWith('2', 1);
    expect(ctx.send).toHaveBeenCalledWith({ ok: true });
  });
});

describe('settings and permissions controllers', () => {
  test.each(['updateEmailTemplate', 'updateAdvancedSettings', 'updateProviders'] as const)(
    '%s rejects an empty body before saving',
    async (action) => {
      await expect(settingsController({ strapi })[action](createContext())).rejects.toThrow(
        'Request body cannot be empty'
      );
      expect(store.set).not.toHaveBeenCalled();
    }
  );

  test('rejects executable email templates before saving any settings', async () => {
    await expect(
      settingsController({ strapi }).updateEmailTemplate(
        createContext({
          'email-templates': { confirmation: { options: { message: '<% process.exit() %>' } } },
        })
      )
    ).rejects.toThrow('Invalid template');
    expect(store.set).not.toHaveBeenCalled();
  });

  test('saves a valid interpolated email template', async () => {
    const templates = { confirmation: { options: { message: 'Hello <%= USER.username %>' } } };
    const ctx = createContext({ 'email-templates': templates });
    await settingsController({ strapi }).updateEmailTemplate(ctx);
    expect(store.set).toHaveBeenCalledWith({ value: templates });
    expect(ctx.send).toHaveBeenCalledWith({ ok: true });
  });

  test('returns saved email templates', async () => {
    const templates = { reset_password: { options: { message: 'Reset' } } };
    store.get.mockResolvedValue(templates);
    const ctx = createContext();
    await settingsController({ strapi }).getEmailTemplate(ctx);
    expect(ctx.send).toHaveBeenCalledWith(templates);
  });

  test('returns advanced settings and available roles', async () => {
    const ctx = createContext();
    await settingsController({ strapi }).getAdvancedSettings(ctx);
    expect(ctx.send).toHaveBeenCalledWith({
      settings: { unique_email: true },
      roles: [{ id: 2, name: 'Editor' }],
    });
  });

  test.each(['updateAdvancedSettings', 'updateProviders'] as const)(
    '%s saves only its settings value',
    async (action) => {
      const body =
        action === 'updateProviders'
          ? { providers: { github: { enabled: true } } }
          : { allow_register: false };
      const ctx = createContext(body);
      await settingsController({ strapi })[action](ctx);
      expect(store.set).toHaveBeenCalledWith({ value: body.providers || body });
      expect(ctx.send).toHaveBeenCalledWith({ ok: true });
    }
  );

  test('adds callback urls only to OAuth providers', async () => {
    store.get.mockResolvedValue({ email: { enabled: true }, github: { enabled: true } });
    const ctx = createContext();
    await settingsController({ strapi }).getProviders(ctx);
    expect(ctx.send).toHaveBeenCalledWith({
      email: { enabled: true },
      github: { enabled: true, redirectUri: 'https://example.com/github' },
    });
    expect(services.providers.buildRedirectUri).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['getPermissions', { permissions: {} }],
    ['getRoutes', { routes: [] }],
    ['getPolicies', { policies: ['rateLimit'] }],
  ] as const)('%s returns exposed configuration', async (action, expected) => {
    const ctx = createContext();
    await permissionsController({ strapi })[action](ctx);
    expect(ctx.send).toHaveBeenCalledWith(expected);
  });
});

describe('content manager user controller', () => {
  const validBody = { username: 'test', email: 'TEST@example.com', password: 'password', role: 2 };

  test('denies creation before querying or persisting data', async () => {
    permissionManager.isAllowed = false;
    const ctx = createContext(validBody);
    await contentManagerController({ strapi }).create(ctx);
    expect(ctx.forbidden).toHaveBeenCalled();
    expect(query.findOne).not.toHaveBeenCalled();
    expect(documentManager.create).not.toHaveBeenCalled();
  });

  test('creates only permitted fields and attributes the administrator', async () => {
    const ctx = createContext({ ...validBody, blocked: true });
    permissionManager.pickPermittedFieldsOf.mockResolvedValue(validBody);
    await contentManagerController({ strapi }).create(ctx);
    expect(documentManager.create).toHaveBeenCalledWith('plugin::users-permissions.user', {
      data: {
        ...validBody,
        email: 'test@example.com',
        provider: 'local',
        createdBy: 9,
        updatedBy: 9,
      },
    });
    expect(ctx.created).toHaveBeenCalledWith({ id: 1, safe: true });
  });

  test.each([
    ['username', [{ id: 2 }], 'Username already taken'],
    ['email', [null, { id: 2 }], 'Email already taken'],
  ] as const)('rejects duplicate %s on creation', async (_field, results, message) => {
    for (const result of results) query.findOne.mockResolvedValueOnce(result);
    await expect(
      contentManagerController({ strapi }).create(createContext(validBody))
    ).rejects.toThrow(message);
    expect(documentManager.create).not.toHaveBeenCalled();
  });

  test('reports document creation errors', async () => {
    documentManager.create.mockRejectedValue(new Error('Storage unavailable'));
    await expect(
      contentManagerController({ strapi }).create(createContext(validBody))
    ).rejects.toThrow('Storage unavailable');
  });

  test.each([
    [{ username: 'taken' }, 'Username already taken'],
    [{ email: 'taken@example.com' }, 'Email already taken'],
  ] as const)(
    'rejects identifiers belonging to another user on update: %j',
    async (body, message) => {
      query.findOne.mockResolvedValue({ id: 2 });
      await expect(
        contentManagerController({ strapi }).update(createContext(body))
      ).rejects.toThrow(message);
      expect(documentManager.update).not.toHaveBeenCalled();
    }
  );

  test('accepts unchanged identifiers and lowercases an updated email', async () => {
    query.findOne.mockResolvedValue({ id: '1' });
    const ctx = createContext({
      username: 'test',
      email: 'TEST@example.com',
      password: 'new-password',
    });
    await contentManagerController({ strapi }).update(ctx);
    expect(documentManager.update).toHaveBeenCalledWith('1', 'plugin::users-permissions.user', {
      data: { username: 'test', email: 'test@example.com', password: 'new-password', updatedBy: 9 },
    });
  });

  test('does not update an absent document', async () => {
    documentManager.findOne.mockResolvedValue(null);
    await expect(
      contentManagerController({ strapi }).update(createContext({ username: 'test' }))
    ).rejects.toThrow('Entity not found');
    expect(documentManager.update).not.toHaveBeenCalled();
  });

  test('enforces permissions on the existing document before updating', async () => {
    permissionManager.ability.cannot.mockReturnValue(true);
    await expect(
      contentManagerController({ strapi }).update(createContext({ username: 'test' }))
    ).rejects.toThrow('Forbidden');
    expect(documentManager.update).not.toHaveBeenCalled();
  });

  test.each(['', null] as const)(
    'preserves passwords for empty input %s and never rewrites the creator',
    async (password) => {
      const ctx = createContext({ username: 'test', password, createdBy: 123 });
      await contentManagerController({ strapi }).update(ctx);
      expect(documentManager.update).toHaveBeenCalledWith('1', 'plugin::users-permissions.user', {
        data: { username: 'test', updatedBy: 9 },
      });
      expect(permissionManager.toSubject).toHaveBeenLastCalledWith({
        id: 1,
        documentId: 'document-1',
        createdBy: { id: 3 },
      });
      expect(ctx.body).toEqual({ id: 1, safe: true });
    }
  );
});

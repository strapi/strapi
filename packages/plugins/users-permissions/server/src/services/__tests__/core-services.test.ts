import { sanitize } from '@strapi/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoleInput } from '../../types';
import { createStrapiMock, createMockSessionManager } from '../../../tests/utils';

import providersFactory from '../providers';
import userFactory from '../user';
import roleFactory from '../role';
import permissionFactory from '../permission';
import usersPermissionsFactory from '../users-permissions';

const createStrapi = () => {
  const user = {
    findOne: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };
  const role = {
    ...user,
    findOne: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    load: vi.fn(),
  };
  const permission = { create: vi.fn(), delete: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };
  const services = {
    'providers-registry': { run: vi.fn() },
    'users-permissions': {
      template: vi.fn(),
      getActions: vi.fn().mockReturnValue({}),
      syncPermissions: vi.fn(),
    },
    email: { send: vi.fn() },
  };
  const settings = { allow_register: true, unique_email: true, default_role: 'authenticated' };
  const strapi = {
    db: {
      query: vi.fn((uid: string) => {
        if (uid.endsWith('.user')) return user;
        if (uid.endsWith('.role')) return role;
        return permission;
      }),
    },
    getModel: vi.fn(() => ({
      attributes: { username: { type: 'string', minLength: 3 }, password: { type: 'password' } },
    })),
    get: vi.fn(() => ({
      transform: vi.fn((_uid: string, params: Record<string, unknown>) => params),
    })),
    plugin: vi.fn(() => ({ service: (name: keyof typeof services) => services[name] })),
    store: vi.fn(() => ({ get: vi.fn().mockResolvedValue(settings) })),
    config: { get: vi.fn((key) => (key === 'api.rest.prefix' ? '/api' : 'http://localhost:1337')) },
    log: { error: vi.fn() },
    apis: {},
    plugins: {},
    sessionManager: createMockSessionManager().sessionManager,
    documents: vi.fn(() => ({ create: vi.fn(), update: vi.fn() })),
  };
  return { strapi, user, role, permission, services, settings };
};

describe('provider registration', () => {
  let fixture: ReturnType<typeof createStrapi>;
  let service: ReturnType<typeof providersFactory>;
  beforeEach(() => {
    fixture = createStrapi();
    fixture.services['providers-registry'] = {
      run: vi.fn().mockResolvedValue({ username: '  Joe  ', email: 'Joe@Example.com' }),
    };
    fixture.role.findOne.mockResolvedValue({ id: 2 });
    fixture.user.findOne.mockResolvedValue(null);
    fixture.user.create.mockImplementation(({ data }) => ({ id: 7, ...data }));
    service = providersFactory({ strapi: createStrapiMock(fixture.strapi) });
  });
  it('rejects missing credentials before reading profiles', async () => {
    await expect(service.connect('google', {})).rejects.toThrow('No access_token.');
    expect(fixture.services['providers-registry'].run).not.toHaveBeenCalled();
  });
  it('rejects a profile without email', async () => {
    fixture.services['providers-registry'].run.mockResolvedValue({ username: 'joe' });
    await expect(service.connect('google', { access_token: 'token' })).rejects.toThrow(
      'Email was not available.'
    );
    expect(fixture.user.create).not.toHaveBeenCalled();
  });
  it('reuses an existing provider account even when registration is closed', async () => {
    const existing = { id: 2, provider: 'google' };
    fixture.user.findMany.mockResolvedValue([existing]);
    fixture.settings.allow_register = false;
    await expect(service.connect('google', { code: 'token' })).resolves.toBe(existing);
    expect(fixture.user.create).not.toHaveBeenCalled();
  });
  it.each([
    [{ allow_register: false }, [], 'Register action is actually not available.'],
    [{ unique_email: true }, [{ provider: 'local' }], 'Email is already taken.'],
  ])('rejects unavailable registrations %j', async (settings, users, message) => {
    Object.assign(fixture.settings, settings);
    fixture.user.findMany.mockResolvedValue(users);
    await expect(service.connect('google', { access_token: 'token' })).rejects.toThrow(message);
    expect(fixture.user.create).not.toHaveBeenCalled();
  });
  it('normalizes email and username while assigning the default role', async () => {
    await expect(service.connect('google', { id_token: 'token' })).resolves.toMatchObject({
      username: 'Joe',
      email: 'joe@example.com',
      provider: 'google',
      role: 2,
      confirmed: true,
    });
    expect(fixture.role.findOne).toHaveBeenCalledWith({ where: { type: 'authenticated' } });
  });
  it('derives an absent username from email', async () => {
    fixture.services['providers-registry'].run.mockResolvedValue({ email: 'Joe@Example.com' });
    await expect(service.connect('google', { access_token: 'token' })).resolves.toMatchObject({
      username: 'joe',
    });
  });
});

describe('role permissions', () => {
  it('creates permissions only for enabled actions', async () => {
    const { strapi, role, permission } = createStrapi();
    role.create.mockResolvedValue({ id: 4 });
    await roleFactory({ strapi: createStrapiMock(strapi) }).createRole({
      name: 'Éditor',
      users: [1],
      permissions: {
        'api::article': {
          controllers: { article: { find: { enabled: true }, delete: { enabled: false } } },
        },
      },
    });
    expect(role.create).toHaveBeenCalledWith({ data: { name: 'Éditor', type: 'editor' } });
    expect(permission.create).toHaveBeenCalledExactlyOnceWith({
      data: { action: 'api::article.article.find', role: 4 },
    });
  });
  it.each(['findOne', 'updateRole', 'deleteRole'] as const)(
    'rejects missing roles in %s',
    async (method) => {
      const { strapi, role } = createStrapi();
      role.findOne.mockResolvedValue(null);
      const service = roleFactory({ strapi: createStrapiMock(strapi) });
      const invoke = {
        findOne: () => service.findOne(3),
        updateRole: () => service.updateRole(3, {}),
        deleteRole: () => service.deleteRole(3, 1),
      };
      const result = invoke[method]();
      await expect(result).rejects.toThrow('Role not found');
    }
  );
  it('updates only changed permissions', async () => {
    const { strapi, role, permission } = createStrapi();
    role.findOne.mockResolvedValue({
      id: 4,
      permissions: [
        { id: 1, action: 'api::a.a.find' },
        { id: 2, action: 'api::a.a.delete' },
      ],
    });
    await roleFactory({ strapi: createStrapiMock(strapi) }).updateRole(4, {
      name: 'Editor',
      permissions: {
        'api::a': {
          controllers: {
            a: { find: { enabled: true }, create: { enabled: true }, delete: { enabled: false } },
          },
        },
      },
    });
    expect(permission.delete).toHaveBeenCalledExactlyOnceWith({ where: { id: 2 } });
    expect(permission.create).toHaveBeenCalledExactlyOnceWith({
      data: { action: 'api::a.a.create', role: 4 },
    });
  });
  it('reassigns users and removes permissions before deleting the role', async () => {
    const { strapi, role, permission, user } = createStrapi();
    role.findOne.mockResolvedValue({ users: [{ id: 8 }], permissions: [{ id: 9 }] });
    await roleFactory({ strapi: createStrapiMock(strapi) }).deleteRole(4, 1);
    expect(user.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { role: 1 } });
    expect(permission.delete).toHaveBeenCalledWith({ where: { id: 9 } });
    expect(role.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });
});

describe('user and permission services', () => {
  it('returns null when editing an absent user', async () => {
    const { strapi, user } = createStrapi();
    user.findOne.mockResolvedValue(null);
    await expect(
      userFactory({ strapi: createStrapiMock(strapi) }).edit(42, { username: 'joe' })
    ).resolves.toBeNull();
    expect(strapi.documents).not.toHaveBeenCalled();
  });
  it('resolves the document id before updating relation inputs', async () => {
    const { strapi, user } = createStrapi();
    user.findOne.mockResolvedValue({ documentId: 'document-id' });
    const update = vi.fn().mockResolvedValue({ id: 42 });
    strapi.documents.mockReturnValue({ update, create: vi.fn() });
    await userFactory({ strapi: createStrapiMock(strapi) }).edit(42, { role: 'role-document-id' });
    expect(update).toHaveBeenCalledWith({
      documentId: 'document-id',
      data: { role: 'role-document-id' },
      populate: ['role'],
    });
  });
  it('retains the id restriction when fetching with extra filters', async () => {
    const { strapi, user } = createStrapi();
    await userFactory({ strapi: createStrapiMock(strapi) }).fetch(42, {
      where: { blocked: false },
      filters: { blocked: false },
      secret: 'ignored',
    });
    expect(user.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { $and: [{ id: 42 }, {}] } })
    );
  });
  it('invalidates sessions before deleting an account', async () => {
    const { strapi, user } = createStrapi();
    const invalidateRefreshToken = vi.fn();
    strapi.sessionManager = Object.assign(
      createMockSessionManager({ invalidateRefreshToken }).sessionManager,
      { hasOrigin: vi.fn(() => true) }
    );
    await userFactory({ strapi: createStrapiMock(strapi) }).remove({ id: 42 });
    expect(invalidateRefreshToken).toHaveBeenCalledWith('42');
    expect(user.delete).toHaveBeenCalledWith({ where: { id: 42 } });
  });
  it('loads permissions for the requested role and scopes public permissions', async () => {
    const { strapi, role, permission } = createStrapi();
    const service = permissionFactory({ strapi: createStrapiMock(strapi) });
    await service.findRolePermissions(4);
    await service.findPublicPermissions();
    expect(role.load).toHaveBeenCalledWith({ id: 4 }, 'permissions');
    expect(permission.findMany).toHaveBeenCalledWith({ where: { role: { type: 'public' } } });
    expect(service.toContentAPIPermission({ action: 'api::a.a.find', id: 8 })).toEqual({
      action: 'api::a.a.find',
    });
  });
});

describe('permission synchronization and templates', () => {
  it('removes stale actions without granting permissions to existing roles', async () => {
    const { strapi, role, permission } = createStrapi();
    role.findMany.mockResolvedValue([{ id: 1, type: 'public' }]);
    permission.findMany.mockResolvedValue([
      { action: 'api::old.old.find' },
      { action: 'api::a.a.find' },
    ]);
    strapi.apis = { a: { controllers: { a: { find: vi.fn() } } } };
    await usersPermissionsFactory({ strapi: createStrapiMock(strapi) }).syncPermissions();
    expect(permission.delete).toHaveBeenCalledExactlyOnceWith({
      where: { action: 'api::old.old.find' },
    });
    expect(permission.create).not.toHaveBeenCalled();
  });
  it('interpolates known data without executing template code', () => {
    const { strapi } = createStrapi();
    const service = usersPermissionsFactory({ strapi: createStrapiMock(strapi) });
    expect(service.template('Hello <%= USER.username %>', { USER: { username: 'Joe' } })).toBe(
      'Hello Joe'
    );
    expect(service.template('<% throw new Error("unsafe") %>', {})).toBe(
      '<% throw new Error("unsafe") %>'
    );
  });
});

describe('injected Strapi instances', () => {
  it('invalidates sessions using the service instance even when a different global exists', async () => {
    const { strapi } = createStrapi();
    const invalidateRefreshToken = vi.fn();
    strapi.sessionManager = Object.assign(
      createMockSessionManager({ invalidateRefreshToken }).sessionManager,
      { hasOrigin: vi.fn(() => true) }
    );
    const service = userFactory({ strapi: createStrapiMock(strapi) });
    vi.stubGlobal('strapi', {});
    await service.remove({ id: 42 });
    expect(invalidateRefreshToken).toHaveBeenCalledWith('42');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('user password and confirmation email paths', () => {
  it('hashes only password attributes and validates the result', async () => {
    const { strapi } = createStrapi();
    const service = userFactory({ strapi: createStrapiMock(strapi) });
    const data = { username: 'joe', password: 'secret' };
    await service.ensureHashedPasswords(data);
    expect(data.username).toBe('joe');
    expect(data.password).not.toBe('secret');
    await expect(service.validatePassword('secret', data.password)).resolves.toBe(true);
    await expect(service.validatePassword('wrong', data.password)).resolves.toBe(false);
  });

  it('rejects an invalid password value instead of storing it unhashed', async () => {
    const { strapi } = createStrapi();
    await expect(
      userFactory({ strapi: createStrapiMock(strapi) }).ensureHashedPasswords({ password: null })
    ).rejects.toThrow();
  });

  it('uses document service creation to hash passwords and process relations once', async () => {
    const { strapi } = createStrapi();
    const create = vi.fn().mockResolvedValue({ id: 4 });
    strapi.documents.mockReturnValue({ create, update: vi.fn() });
    const values = { username: 'joe', password: 'secret', role: 'role-document' };
    await userFactory({ strapi: createStrapiMock(strapi) }).add(values);
    expect(create).toHaveBeenCalledWith({ data: values, populate: ['role'] });
    expect(values.password).toBe('secret');
  });

  it.each([true, false])(
    'persists confirmation tokens and handles template success=%s',
    async (validTemplate) => {
      const { strapi, services } = createStrapi();
      const settings = {
        email_confirmation: {
          options: {
            from: { name: 'Support', email: 'help@example.com' },
            response_email: 'reply@example.com',
            object: 'Confirm your account',
            message: 'Confirmation link',
          },
        },
      };
      strapi.store.mockReturnValue({ get: vi.fn().mockResolvedValue(settings) });
      services['users-permissions'].template.mockImplementation((layout: string) => {
        if (!validTemplate) throw new Error('Invalid email template');
        return layout;
      });
      vi.spyOn(sanitize.sanitizers, 'defaultSanitizeOutput').mockResolvedValue({
        id: 4,
        documentId: 'doc',
        username: 'joe',
        email: 'joe@example.com',
      });
      const service = userFactory({ strapi: createStrapiMock(strapi) });
      const edit = vi.spyOn(service, 'edit').mockResolvedValue(null);
      await service.sendConfirmationEmail({
        id: 4,
        documentId: 'doc',
        username: 'joe',
        email: 'joe@example.com',
      });
      expect(edit).toHaveBeenCalledWith(4, {
        confirmationToken: expect.stringMatching(/^[a-f0-9]{40}$/),
      });
      if (validTemplate) {
        expect(services.email.send).toHaveBeenCalledWith({
          to: 'joe@example.com',
          from: 'Support <help@example.com>',
          replyTo: 'reply@example.com',
          subject: 'Confirm your account',
          text: 'Confirmation link',
          html: 'Confirmation link',
        });
        expect(services['users-permissions'].template).toHaveBeenCalledWith(
          'Confirmation link',
          expect.objectContaining({
            URL: 'http://localhost:1337/api/auth/email-confirmation',
            USER: { id: 4, documentId: 'doc', username: 'joe', email: 'joe@example.com' },
          })
        );
      } else {
        expect(services.email.send).not.toHaveBeenCalled();
        expect(strapi.log.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to generate a template')
        );
      }
    }
  );
});

describe('action discovery and default permissions', () => {
  it('lists only marked content API actions from API and plugin controllers', () => {
    const { strapi } = createStrapi();
    const action = Object.assign(vi.fn(), { [Symbol.for('__type__')]: ['content-api'] });
    const admin = Object.assign(vi.fn(), { [Symbol.for('__type__')]: ['admin'] });
    strapi.apis = { article: { controllers: { article: { find: action, helper: vi.fn() } } } };
    strapi.plugins = { sample: { controllers: { sample: { find: action, admin } } } };
    const service = usersPermissionsFactory({ strapi: createStrapiMock(strapi) });
    expect(service.getActions()).toEqual({
      'api::article': { controllers: { article: { find: { enabled: false, policy: '' } } } },
      'plugin::sample': { controllers: { sample: { find: { enabled: false, policy: '' } } } },
    });
    expect(
      service.getActions({ defaultEnable: true })['api::article'].controllers.article.find.enabled
    ).toBe(true);
  });

  it('retains content routes and respects plugin prefix overrides', async () => {
    const { strapi } = createStrapi();
    const route = {
      method: 'GET',
      path: '/articles',
      handler: 'article.find',
      info: { type: 'content-api' },
    };
    strapi.apis = {
      article: { routes: { article: { routes: [route, { ...route, info: { type: 'admin' } }] } } },
    };
    strapi.plugins = {
      sample: {
        routes: {
          'content-api': { routes: [route, { ...route, path: '/custom', config: { prefix: '' } }] },
        },
      },
    };
    const routes = await usersPermissionsFactory({ strapi: createStrapiMock(strapi) }).getRoutes();
    expect(routes).toMatchObject({
      'api::article': [{ path: '/api/articles' }],
      'plugin::sample': [{ path: '/api/sample/articles' }, { path: '/api/custom' }],
    });
  });

  it('seeds default roles only once before synchronizing permissions', async () => {
    const { strapi, role, services } = createStrapi();
    role.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    const service = usersPermissionsFactory({ strapi: createStrapiMock(strapi) });
    await service.initialize();
    await service.initialize();
    expect(role.create.mock.calls.map(([params]) => params.data.type)).toEqual([
      'authenticated',
      'public',
    ]);
    expect(services['users-permissions'].syncPermissions).toHaveBeenCalledTimes(2);
  });

  it('grants session management only to authenticated users when seeding permissions', async () => {
    const { strapi, role, permission } = createStrapi();
    role.findMany.mockResolvedValue([
      { id: 1, type: 'public' },
      { id: 2, type: 'authenticated' },
    ]);
    await usersPermissionsFactory({ strapi: createStrapiMock(strapi) }).syncPermissions();
    expect(permission.create).toHaveBeenCalledWith({
      data: { action: 'plugin::users-permissions.auth.register', role: 1 },
    });
    expect(permission.create).toHaveBeenCalledWith({
      data: { action: 'plugin::users-permissions.auth.revokeSession', role: 2 },
    });
    expect(permission.create).not.toHaveBeenCalledWith({
      data: { action: 'plugin::users-permissions.auth.revokeSession', role: 1 },
    });
  });

  it('merges existing permissions into the full action map for a role', async () => {
    const { strapi, role } = createStrapi();
    role.findOne.mockResolvedValue({
      id: 1,
      permissions: [{ id: 3, action: 'api::article.article.find' }],
    });
    await expect(
      roleFactory({ strapi: createStrapiMock(strapi) }).findOne(1)
    ).resolves.toMatchObject({
      permissions: {
        'api::article': { controllers: { article: { find: { enabled: true, policy: '' } } } },
      },
    });
  });

  it('adds user counts to roles and updates the requested user role', async () => {
    const { strapi, role, user } = createStrapi();
    role.findMany.mockResolvedValue([{ id: 1, name: 'Public' }]);
    user.count.mockResolvedValue(3);
    await expect(roleFactory({ strapi: createStrapiMock(strapi) }).find()).resolves.toEqual([
      { id: 1, name: 'Public', nb_users: 3 },
    ]);
    expect(user.count).toHaveBeenCalledWith({ where: { role: { id: 1 } } });
    await usersPermissionsFactory({ strapi: createStrapiMock(strapi) }).updateUserRole(
      { id: 4 },
      1
    );
    expect(user.update).toHaveBeenCalledWith({ where: { id: 4 }, data: { role: 1 } });
  });
});

describe('sparse role permission input', () => {
  const sparsePermissions: RoleInput['permissions'][] = [
    undefined,
    null,
    { 'api::article': {} },
    { 'api::article': { controllers: null } },
    { 'api::article': { controllers: { article: null } } },
  ];

  it.each(sparsePermissions)(
    'treats sparse permissions %j as no enabled actions during create and update',
    async (permissions) => {
      const { strapi, role, permission } = createStrapi();
      role.create.mockResolvedValue({ id: 4 });
      role.findOne.mockResolvedValue({
        id: 4,
        permissions: [{ id: 9, action: 'api::article.article.find' }],
      });
      const service = roleFactory({ strapi: createStrapiMock(strapi) });
      await expect(service.createRole({ name: 'Editor', permissions })).resolves.toBeUndefined();
      await expect(service.updateRole(4, { name: 'Editor', permissions })).resolves.toBeUndefined();
      expect(permission.create).not.toHaveBeenCalled();
      expect(permission.delete).toHaveBeenCalledExactlyOnceWith({ where: { id: 9 } });
    }
  );
});

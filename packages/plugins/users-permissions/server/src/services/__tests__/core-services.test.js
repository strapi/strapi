/* eslint @typescript-eslint/no-var-requires: off */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const providersFactory = require('../providers');
const userFactory = require('../user');
const roleFactory = require('../role');
const permissionFactory = require('../permission');
const usersPermissionsFactory = require('../users-permissions');

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
  const services = {};
  const settings = { allow_register: true, unique_email: true, default_role: 'authenticated' };
  const strapi = {
    db: { query: vi.fn((uid) => ({ user, role, permission })[uid.split('.').pop()]) },
    getModel: vi.fn(() => ({
      attributes: { username: { type: 'string', minLength: 3 }, password: { type: 'password' } },
    })),
    get: vi.fn(() => ({ transform: vi.fn((_uid, params) => params) })),
    plugin: vi.fn(() => ({ service: (name) => services[name] })),
    store: vi.fn(() => ({ get: vi.fn().mockResolvedValue(settings) })),
    config: { get: vi.fn((key) => (key === 'api.rest.prefix' ? '/api' : 'http://localhost:1337')) },
    apis: {},
    plugins: {},
    documents: vi.fn(() => ({ create: vi.fn(), update: vi.fn() })),
  };
  global.strapi = strapi;
  return { strapi, user, role, permission, services, settings };
};

describe('provider registration', () => {
  let fixture;
  let service;
  beforeEach(() => {
    fixture = createStrapi();
    fixture.services['providers-registry'] = {
      run: vi.fn().mockResolvedValue({ username: '  Joe  ', email: 'Joe@Example.com' }),
    };
    fixture.role.findOne.mockResolvedValue({ id: 2 });
    fixture.user.findOne.mockResolvedValue(null);
    fixture.user.create.mockImplementation(({ data }) => ({ id: 7, ...data }));
    service = providersFactory({ strapi: fixture.strapi });
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
    await roleFactory({ strapi }).createRole({
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
  it.each(['findOne', 'updateRole', 'deleteRole'])(
    'rejects missing roles in %s',
    async (method) => {
      const { strapi, role } = createStrapi();
      role.findOne.mockResolvedValue(null);
      await expect(roleFactory({ strapi })[method](3, {})).rejects.toThrow('Role not found');
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
    await roleFactory({ strapi }).updateRole(4, {
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
    await roleFactory({ strapi }).deleteRole(4, 1);
    expect(user.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { role: 1 } });
    expect(permission.delete).toHaveBeenCalledWith({ where: { id: 9 } });
    expect(role.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });
});

describe('user and permission services', () => {
  it('returns null when editing an absent user', async () => {
    const { strapi, user } = createStrapi();
    user.findOne.mockResolvedValue(null);
    await expect(userFactory({ strapi }).edit(42, { username: 'joe' })).resolves.toBeNull();
    expect(strapi.documents).not.toHaveBeenCalled();
  });
  it('resolves the document id before updating relation inputs', async () => {
    const { strapi, user } = createStrapi();
    user.findOne.mockResolvedValue({ documentId: 'document-id' });
    const update = vi.fn().mockResolvedValue({ id: 42 });
    strapi.documents.mockReturnValue({ update });
    await userFactory({ strapi }).edit(42, { role: 'role-document-id' });
    expect(update).toHaveBeenCalledWith({
      documentId: 'document-id',
      data: { role: 'role-document-id' },
      populate: ['role'],
    });
  });
  it('retains the id restriction when fetching with extra filters', async () => {
    const { strapi, user } = createStrapi();
    await userFactory({ strapi }).fetch(42, {
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
      vi.fn(() => ({ invalidateRefreshToken })),
      { hasOrigin: vi.fn(() => true) }
    );
    await userFactory({ strapi }).remove({ id: 42 });
    expect(invalidateRefreshToken).toHaveBeenCalledWith('42');
    expect(user.delete).toHaveBeenCalledWith({ where: { id: 42 } });
  });
  it('loads permissions for the requested role and scopes public permissions', async () => {
    const { strapi, role, permission } = createStrapi();
    const service = permissionFactory({ strapi });
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
    await usersPermissionsFactory({ strapi }).syncPermissions();
    expect(permission.delete).toHaveBeenCalledExactlyOnceWith({
      where: { action: 'api::old.old.find' },
    });
    expect(permission.create).not.toHaveBeenCalled();
  });
  it('interpolates known data without executing template code', () => {
    const { strapi } = createStrapi();
    const service = usersPermissionsFactory({ strapi });
    expect(service.template('Hello <%= USER.username %>', { USER: { username: 'Joe' } })).toBe(
      'Hello Joe'
    );
    expect(service.template('<% throw new Error("unsafe") %>', {})).toBe(
      '<% throw new Error("unsafe") %>'
    );
  });
});

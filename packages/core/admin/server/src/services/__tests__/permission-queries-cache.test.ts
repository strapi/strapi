import {
  findCachedUserPermissions,
  clearRolePermissionsCache,
} from '../permission/queries';

const ROLE_PERMISSIONS_CACHE_TTL = 60 * 1000;

const rawPermission = {
  id: 1,
  action: 'plugin::content-manager.explorer.read',
  actionParameters: {},
  subject: 'api::article.article',
  properties: {},
  conditions: [],
};

const user = { id: 1, roles: [{ id: 1 }] } as any;

describe('Permission queries - role permissions cache', () => {
  let findMany: jest.Mock;
  let now: number;

  beforeEach(() => {
    clearRolePermissionsCache();

    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    findMany = jest.fn(() => Promise.resolve([rawPermission]));

    global.strapi = {
      db: {
        query() {
          return { findMany };
        },
      },
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('A cache hit within 60 seconds does not query the database again', async () => {
    const first = await findCachedUserPermissions(user);

    now += ROLE_PERMISSIONS_CACHE_TTL - 1;

    const second = await findCachedUserPermissions(user);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({ where: { role: { id: 1 } } });
    expect(second).toEqual(first);
  });

  test('An expired entry is refetched', async () => {
    await findCachedUserPermissions(user);

    now += ROLE_PERMISSIONS_CACHE_TTL;

    await findCachedUserPermissions(user);

    expect(findMany).toHaveBeenCalledTimes(2);
  });

  test('clearRolePermissionsCache forces a refetch', async () => {
    await findCachedUserPermissions(user);

    clearRolePermissionsCache();

    await findCachedUserPermissions(user);

    expect(findMany).toHaveBeenCalledTimes(2);
  });

  test('A failing database lookup is not cached', async () => {
    findMany.mockImplementationOnce(() => Promise.reject(new Error('db down')));

    await expect(findCachedUserPermissions(user)).rejects.toThrow('db down');

    const permissions = await findCachedUserPermissions(user);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({ id: 1, action: rawPermission.action });
  });
});

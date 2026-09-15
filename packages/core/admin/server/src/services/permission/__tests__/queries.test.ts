import { findUserPermissions, setUserRolesScope } from '../queries';

/**
 * A user's roles are not always all of them: a deployment can scope a role
 * assignment to part of the project. These cover the seam that says so, and the
 * one place it must not apply.
 */
describe('findUserPermissions', () => {
  let findMany: jest.Mock;
  let removeScope: () => void = () => {};

  const user = { id: 7 } as never;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);

    global.strapi = {
      db: { query: () => ({ findMany }) },
      eventHub: { emit: jest.fn() },
    } as never;
  });

  afterEach(() => {
    removeScope();
    removeScope = () => {};
  });

  it('loads every permission of every role the user holds, by default', async () => {
    await findUserPermissions(user);

    expect(findMany).toHaveBeenCalledWith({ where: { role: { users: { id: 7 } } } });
  });

  it('loads only the roles an installed scope says apply', async () => {
    removeScope = setUserRolesScope(async () => [3, 4]);

    await findUserPermissions(user);

    expect(findMany).toHaveBeenCalledWith({ where: { role: { id: { $in: [3, 4] } } } });
  });

  it('keeps the default when the scope declines to narrow', async () => {
    removeScope = setUserRolesScope(async () => null);

    await findUserPermissions(user);

    expect(findMany).toHaveBeenCalledWith({ where: { role: { users: { id: 7 } } } });
  });

  it('grants nothing when no role applies, rather than falling back to all of them', async () => {
    removeScope = setUserRolesScope(async () => []);

    const permissions = await findUserPermissions(user);

    expect(permissions).toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('ignores the scope when asked for the user’s overall authority', async () => {
    // The ceiling an admin token is clamped to is about the user, not about the
    // request that happens to be running. Narrowing it there would delete token
    // permissions that are still legitimate elsewhere.
    removeScope = setUserRolesScope(async () => [3]);

    await findUserPermissions(user, { scoped: false });

    expect(findMany).toHaveBeenCalledWith({ where: { role: { users: { id: 7 } } } });
  });

  it('stops applying once the scope is removed', async () => {
    const remove = setUserRolesScope(async () => [3]);
    remove();

    await findUserPermissions(user);

    expect(findMany).toHaveBeenCalledWith({ where: { role: { users: { id: 7 } } } });
  });

  it('does not let a stale remover unregister the scope that replaced it', async () => {
    const removeFirst = setUserRolesScope(async () => [1]);
    removeScope = setUserRolesScope(async () => [2]);
    removeFirst();

    await findUserPermissions(user);

    expect(findMany).toHaveBeenCalledWith({ where: { role: { id: { $in: [2] } } } });
  });
});

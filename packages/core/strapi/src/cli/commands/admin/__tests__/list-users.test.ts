import { action as listUsersCommand } from '../list-users';

const destroy = jest.fn();
const findPage = jest.fn();

const load = jest.fn(() => mock) as any;

const admin = {
  services: {
    user: {
      findPage,
    },
  },
};

const mock = {
  load,
  admin,
  destroy,
};

jest.mock('@strapi/core', () => {
  const createStrapi: any = jest.fn(() => mock);
  const compileStrapi = jest.fn();

  return { createStrapi, compileStrapi };
});

describe('admin:list-users command', () => {
  beforeEach(() => {
    load.mockClear();
    findPage.mockClear();
    destroy.mockClear();
  });

  test('lists users and outputs a table', async () => {
    findPage.mockResolvedValue({
      results: [
        {
          id: 1,
          email: 'admin@strapi.io',
          firstname: 'Admin',
          lastname: 'User',
          isActive: true,
          blocked: false,
          roles: [{ name: 'Super Admin' }],
        },
      ],
    });

    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listUsersCommand();

    expect(load).toHaveBeenCalled();
    expect(findPage).toHaveBeenCalledWith({
      select: ['id', 'firstname', 'lastname', 'email', 'isActive', 'blocked'],
      populate: ['roles'],
      pageSize: 100,
    });
    expect(consoleLog).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  test('lists multiple users', async () => {
    findPage.mockResolvedValue({
      results: [
        {
          id: 1,
          email: 'admin@strapi.io',
          firstname: 'Admin',
          lastname: 'User',
          isActive: true,
          blocked: false,
          roles: [{ name: 'Super Admin' }],
        },
        {
          id: 2,
          email: 'editor@strapi.io',
          firstname: 'Editor',
          lastname: 'User',
          isActive: false,
          blocked: true,
          roles: [{ name: 'Editor' }],
        },
      ],
    });

    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listUsersCommand();

    expect(findPage).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  test('handles users with no roles', async () => {
    findPage.mockResolvedValue({
      results: [
        {
          id: 1,
          email: 'noroles@strapi.io',
          firstname: 'No',
          lastname: 'Roles',
          isActive: true,
          blocked: false,
          roles: [],
        },
      ],
    });

    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listUsersCommand();

    expect(findPage).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();

    consoleLog.mockRestore();
  });

  test('handles empty user list', async () => {
    findPage.mockResolvedValue({ results: [] });

    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listUsersCommand();

    expect(findPage).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();

    consoleLog.mockRestore();
  });
});

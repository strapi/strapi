import { action as listUsersCommand } from '../list-users';

const destroy = jest.fn();
const findPage = jest.fn();

const load = jest.fn(() => mock) as any;

const mfaService = {
  isEnabled: jest.fn(() => false),
  requiredForUsers: jest.fn(async (users: unknown[]) => users.map(() => false)),
};
const service = jest.fn(() => mfaService);

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
  service,
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
    mfaService.isEnabled.mockReturnValue(false);
    mfaService.requiredForUsers.mockClear();
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

  test('leaves out the 2FA column when the feature is off', async () => {
    findPage.mockResolvedValue({ results: [] });
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listUsersCommand();

    expect(mfaService.requiredForUsers).not.toHaveBeenCalled();
    expect(consoleLog.mock.calls[0][0]).not.toContain('2FA');

    consoleLog.mockRestore();
  });

  test('adds a 2FA column from the same service call as the panel when the feature is on', async () => {
    mfaService.isEnabled.mockReturnValue(true);
    mfaService.requiredForUsers.mockResolvedValue([false, true, true, false]);
    const base = { firstname: 'A', lastname: 'B', isActive: true, blocked: false, roles: [] };
    findPage.mockResolvedValue({
      results: [
        { ...base, id: 1, email: 'enrolled@strapi.io', mfaEnabledAt: '2026-11-01T00:00:00.000Z' },
        { ...base, id: 2, email: 'grace@strapi.io', mfaGraceUntil: '2026-11-10T00:00:00.000Z' },
        { ...base, id: 3, email: 'locked@strapi.io', mfaLockedAt: '2026-11-02T00:00:00.000Z' },
        { ...base, id: 4, email: 'none@strapi.io' },
      ],
    });
    const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

    await listUsersCommand();

    expect(findPage).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.arrayContaining([
          'password',
          'mfaEnabledAt',
          'mfaGraceUntil',
          'mfaLockedAt',
        ]),
      })
    );
    expect(mfaService.requiredForUsers).toHaveBeenCalledTimes(1);
    const table: string = consoleLog.mock.calls[0][0];
    expect(table).toContain('2FA');
    expect(table).toContain('enrolled');
    expect(table).toContain('required (grace until 2026-11-10T00:00:00.000Z)');
    expect(table).toContain('locked (2026-11-02T00:00:00.000Z)');

    consoleLog.mockRestore();
  });
});

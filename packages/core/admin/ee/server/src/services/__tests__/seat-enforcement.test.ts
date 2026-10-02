import type { Core } from '@strapi/types';
import seatEnforcement from '../seat-enforcement';

describe('seat-enforcement service', () => {
  const setup = ({
    seats,
    activeUserCount = 0,
    disabledUsers = null,
    usersToDisable = [],
  }: {
    seats: number | undefined;
    activeUserCount?: number;
    disabledUsers?: Array<{ id: number; isActive: boolean }> | null;
    usersToDisable?: Array<{ id: number; isActive: boolean }>;
  }) => {
    const updateMany = jest.fn(() => Promise.resolve());
    const findMany = jest.fn(() => Promise.resolve(usersToDisable));
    const getCurrentActiveUserCount = jest.fn(() => Promise.resolve(activeUserCount));
    const store = {
      get: jest.fn(() => Promise.resolve(disabledUsers)),
      set: jest.fn(() => Promise.resolve()),
    };

    global.strapi = {
      ee: {
        features: {
          get: jest.fn((name: string) =>
            name === 'seat-limit' && seats !== undefined ? { name, options: { seats } } : undefined
          ),
        },
      },
      store,
      db: { query: jest.fn(() => ({ updateMany, findMany })) },
      admin: { services: { user: { getCurrentActiveUserCount } } },
    } as unknown as Core.Strapi;

    return { updateMany, getCurrentActiveUserCount, store };
  };

  describe('seatEnforcementWorkflow', () => {
    test('does nothing without the seat-limit feature', async () => {
      const { getCurrentActiveUserCount, store } = setup({ seats: undefined });

      await seatEnforcement.seatEnforcementWorkflow();

      expect(global.strapi.ee.features.get).toHaveBeenCalledWith('seat-limit');
      expect(global.strapi.db.query).not.toHaveBeenCalled();
      expect(store.get).not.toHaveBeenCalled();
      expect(store.set).not.toHaveBeenCalled();
      expect(getCurrentActiveUserCount).not.toHaveBeenCalled();
    });

    test('re-enables the last disabled users while seats are left', async () => {
      const { updateMany, store } = setup({
        seats: 3,
        activeUserCount: 2,
        disabledUsers: [
          { id: 4, isActive: true },
          { id: 5, isActive: true },
        ],
      });

      await seatEnforcement.seatEnforcementWorkflow();

      expect(updateMany).toHaveBeenLastCalledWith({
        where: { id: [5] },
        data: { isActive: true },
      });
      expect(store.set).toHaveBeenCalledWith({
        type: 'ee',
        key: 'disabled_users',
        value: [{ id: 4, isActive: true }],
      });
    });

    test('disables the users above the seat limit and records them', async () => {
      const { updateMany, store } = setup({
        seats: 1,
        activeUserCount: 2,
        disabledUsers: [],
        usersToDisable: [{ id: 2, isActive: true }],
      });

      await seatEnforcement.seatEnforcementWorkflow();

      expect(updateMany).toHaveBeenLastCalledWith({
        where: { id: [2] },
        data: { isActive: false },
      });
      expect(store.set).toHaveBeenCalledWith({
        type: 'ee',
        key: 'disabled_users',
        value: [{ id: 2, isActive: true }],
      });
    });
  });
});

describe('seat enforcement', () => {
  const setup = (
    disabledUsers: readonly { id: number; isActive: boolean }[] | null | undefined
  ) => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const store = {
      get: jest.fn().mockResolvedValue(disabledUsers),
      set: jest.fn().mockResolvedValue(undefined),
    };

    Object.assign(global, {
      strapi: {
        ee: {
          features: {
            get: (name: string) =>
              name === 'seat-limit' ? { name, options: { seats: 3 } } : undefined,
          },
        },
        db: { query: () => ({ updateMany }) },
        store,
        admin: {
          services: {
            user: { getCurrentActiveUserCount: jest.fn().mockResolvedValue(1) },
          },
        },
      },
    });

    return { updateMany, store };
  };

  test.each([null, undefined])(
    'returns an empty disabled-user list for %s',
    async (disabledUsers) => {
      setup(disabledUsers);

      await expect(seatEnforcement.getDisabledUserList()).resolves.toEqual([]);
    }
  );

  test.each([null, undefined])(
    'completes with available seats when the disabled-user list is %s',
    async (disabledUsers) => {
      const { updateMany, store } = setup(disabledUsers);

      await seatEnforcement.seatEnforcementWorkflow();

      expect(updateMany).toHaveBeenCalledTimes(1);
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: [] },
        data: { isActive: true },
      });
      expect(store.set).toHaveBeenCalledWith({
        type: 'ee',
        key: 'disabled_users',
        value: [],
      });
    }
  );

  test('reenables users in reverse order up to the seat limit without mutating the stored list', async () => {
    const disabledUsers = Object.freeze([
      { id: 1, isActive: true },
      { id: 2, isActive: true },
      { id: 3, isActive: true },
    ]);
    const { updateMany, store } = setup(disabledUsers);

    await seatEnforcement.seatEnforcementWorkflow();

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: [1, 2, 3] },
      data: { isActive: false },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: [3, 2] },
      data: { isActive: true },
    });
    expect(store.set).toHaveBeenCalledWith({
      type: 'ee',
      key: 'disabled_users',
      value: [{ id: 1, isActive: true }],
    });
  });
});

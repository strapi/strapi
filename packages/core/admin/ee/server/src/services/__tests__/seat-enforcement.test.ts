import seatEnforcement from '../seat-enforcement';

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
        ee: { seats: 3 },
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

import checkPermissions from '../checkPermissions';

jest.mock('strapi-helper-plugin', () => ({
  hasPermissions: () => Promise.resolve(true),
}));

describe('checkPermissions', () => {
  it('creates an array of boolean corresponding to the permission state', async () => {
    const userPermissions = {};
    const permissions = [{ permissions: {} }, { permissions: {} }];

    const expected = [true, true];
    const actual = await Promise.all(checkPermissions(userPermissions, permissions));

    expect(actual).toEqual(expected);
  });
});

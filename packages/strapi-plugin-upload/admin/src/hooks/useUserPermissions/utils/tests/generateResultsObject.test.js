import generateResultsObject from '../generateResultsObject';

describe('UPLOAD | hooks | useUserPermissions | | utils | generateResultsObject', () => {
  it('should return an object with { key: can<PermissionName>, value: bool }', () => {
    const data = [
      { permissionName: 'read', hasPermission: true },
      { permissionName: 'update', hasPermission: false },
    ];
    const expected = {
      canRead: true,
      canUpdate: false,
    };

    expect(generateResultsObject(data)).toEqual(expected);
  });
});

import retrieveAdminUsers from '../retrieveAdminUsers';

describe('ADMIN | CONTAINERS | USERS | ListPage | utils | retrieveAdminUsers', () => {
  it('should return an array containing the users that have the admin role', () => {
    const users = [
      {
        id: '1',
        roles: [
          {
            code: 'test',
          },
          {
            code: 'test1',
          },
        ],
      },
      {
        id: '2',
        roles: [
          {
            code: 'strapi-super-admin',
          },
          {
            code: 'test1',
          },
        ],
      },
      {
        id: '3',
        roles: [],
      },
      {
        id: 4,
        roles: [
          {
            code: 'strapi-super-admin',
          },
        ],
      },
    ];

    const dataToDelete = [1, 2, 3, 4];
    const expected = [2, 4];

    expect(retrieveAdminUsers(dataToDelete, users)).toEqual(expected);
  });
});

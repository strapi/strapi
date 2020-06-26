import retrieveNonAdminUsers from '../retrieveNonAdminUsers';

describe('ADMIN | CONTAINERS | USERS | ListPage | utils | retrieveNonAdminUsers', () => {
  it('should return an array containing the users that do not have the admin role', () => {
    const usersToDelete = ['1', 7, 3, 2, 5, 6];

    const adminsToDelete = [1, '2', 3, 4];
    const expected = [7, 5, 6];

    expect(retrieveNonAdminUsers(usersToDelete, adminsToDelete)).toEqual(expected);
  });
});

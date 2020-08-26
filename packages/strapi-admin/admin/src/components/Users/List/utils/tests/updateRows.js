import updateRows from '../updateRows';

describe('ADMIN | COMPONENTS | USERS | List | utils | updateRows', () => {
  it('should add the _isChecked key to all elements from the array', () => {
    const data = [
      {
        id: 3,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
      },
      {
        id: 4,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
      },
      {
        id: 5,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
      },
    ];
    const expected = [
      {
        id: 3,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
        _isChecked: false,
      },
      {
        id: 4,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
        _isChecked: false,
      },
      {
        id: 5,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
        _isChecked: false,
      },
    ];

    expect(updateRows(data)).toEqual(expected);
  });
});

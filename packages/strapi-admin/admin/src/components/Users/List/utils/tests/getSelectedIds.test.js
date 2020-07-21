import getSelectedIds from '../getSelectedIds';

describe('ADMIN | COMPONENTS | USERS | List | utils | getSelectedIds', () => {
  it('should return an array with the selected ids if the element at the corresponding index is already checked', () => {
    const data = [
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
        _isChecked: true,
      },
      {
        id: 5,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
        _isChecked: true,
      },
    ];
    const expected = [5];

    expect(getSelectedIds(data, 1)).toEqual(expected);
  });

  it('should return an array with the selected ids if the element at the corresponding index is not already checked', () => {
    const data = [
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
        _isChecked: true,
      },
    ];
    const expected = [4, 5];

    expect(getSelectedIds(data, 1)).toEqual(expected);
  });
});

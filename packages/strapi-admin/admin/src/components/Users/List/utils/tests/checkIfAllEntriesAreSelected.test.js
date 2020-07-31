import checkIfAllEntriesAreSelected from '../checkIfAllEntriesAreSelected';

describe('ADMIN | COMPONENTS | USERS | List | utils | checkIfAllEntriesAreSelected', () => {
  it('should return false if at least one element is not checked', () => {
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
        _isChecked: false,
      },
    ];

    expect(checkIfAllEntriesAreSelected(data)).toBeFalsy();
  });

  it('should return true if all elements are checked', () => {
    const data = [
      {
        id: 3,
        firstname: 'Pierre',
        lastname: 'Gagnaire',
        username: 'test',
        email: 't@t.com',
        isActive: true,
        roles: ['super admin'],
        _isChecked: true,
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

    expect(checkIfAllEntriesAreSelected(data)).toBeTruthy();
  });
});

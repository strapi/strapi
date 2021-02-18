import getFilters from '../getFilters';

describe('ADMIN | CONTAINERS | USERS | ListPage | utils | getFilters', () => {
  it('should return an empty array if there is not filter', () => {
    const search = '_q=test&_sort=firstname&page=1&pageSize=1';

    expect(getFilters(search)).toHaveLength(0);
  });

  it('should handle the = filter correctly ', () => {
    const search = '_sort=firstname&page=1&pageSize=1&firstname=test&firstname_ne=something';
    const expected = [
      {
        displayName: 'firstname',
        name: 'firstname',
        filter: '=',
        value: 'test',
      },
      {
        displayName: 'firstname',
        name: 'firstname_ne',
        filter: '_ne',
        value: 'something',
      },
    ];

    expect(getFilters(search)).toEqual(expected);
  });
});

import getFilters from '../getFilters';

describe('ADMIN | CONTAINERS | USERS | ListPage | utils | getFilters', () => {
  it('should return an empty array if there is not filter', () => {
    const search = '_q=test&_sort=firstname&_page=1&_limit=1';

    expect(getFilters(search)).toHaveLength(0);
  });

  it('should handle the = filter correctly ', () => {
    const search = '_sort=firstname&_page=1&_limit=1&firstname=test&firstname_ne=something';
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

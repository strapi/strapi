import sortIds from '../sortIds';

describe('ADMIN | CONTAINERS | Users | ListPage | utils | sortIds', () => {
  it('should add the current user id to the last index', () => {
    const data = [1, 4, 34, 8, 'test', 10];
    const expected = [1, 4, 8, 'test', 10, 34];

    expect(sortIds(data, 34)).toEqual(expected);
  });

  it('should not add the current user id if it is not in the ref array', () => {
    const data = [1, 4, 34, 8, 'test', 10];
    const expected = [1, 4, 34, 8, 'test', 10];

    expect(sortIds(data, 3)).toEqual(expected);
  });
});

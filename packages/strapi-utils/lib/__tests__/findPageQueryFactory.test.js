'use strict';

const findPageQueryFactory = require('../findPageQueryFactory');

describe('findPageQueryFactory', () => {
  test('Successfully create a query based on given find and count', async () => {
    const find = jest.fn(() => [1, 2]);
    const count = jest.fn(() => 2);

    const findPage = findPageQueryFactory(find, count);

    const data = await findPage({});

    expect(find).toHaveBeenCalled();
    expect(count).toHaveBeenCalled();
    expect(data).toMatchObject({
      results: [1, 2],
      pagination: {
        page: 1,
        pageSize: 100,
        total: 2,
        pageCount: 1,
      },
    });
  });

  test('Use custom pagination options to find a specific page', async () => {
    const find = jest.fn(() => [5, 6]);
    const count = jest.fn(() => 6);

    const findPage = findPageQueryFactory(find, count);

    const data = await findPage({ page: 2, pageSize: 4 });

    expect(find).toHaveBeenCalled();
    expect(count).toHaveBeenCalled();
    expect(data).toMatchObject({
      results: [5, 6],
      pagination: {
        page: 2,
        pageSize: 4,
        total: 6,
        pageCount: 2,
      },
    });
  });
});

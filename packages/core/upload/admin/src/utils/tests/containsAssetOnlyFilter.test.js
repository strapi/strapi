import { containsAssetFilter } from '..';

describe('containsAssetFilter', () => {
  test('does not fail on empty query objects', () => {
    expect(containsAssetFilter(null)).toBeFalsy();
    expect(containsAssetFilter({})).toBeFalsy();
    expect(containsAssetFilter({ filters: {} })).toBeFalsy();
    expect(containsAssetFilter({ filters: { $and: [] } })).toBeFalsy();
  });

  test('recognizes the mime-type filter', () => {
    expect(
      containsAssetFilter({
        filters: {
          $and: [
            {
              mime: 'image',
            },
          ],
        },
      })
    ).toBeTruthy();

    expect(
      containsAssetFilter({
        filters: {
          $and: [
            {
              some: 'filter',
            },
            {
              mime: 'image',
            },
          ],
        },
      })
    ).toBeTruthy();
  });
});

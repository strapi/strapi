import { containsAssetFilter } from '../containsAssetFilter';

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
              mime: { $eq: 'image' },
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
              some: { $eq: 'filter' },
            },
            {
              mime: { $eq: 'image' },
            },
          ],
        },
      })
    ).toBeTruthy();
  });
});

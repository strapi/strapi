import toSingularTypes from '../toSingularTypes';

describe('UPLOAD | utils | toSingularTypes', () => {
  it('returns an array', () => {
    const results = toSingularTypes(undefined);

    expect(results).toEqual([]);
  });

  it('removes the last letter of each element of the array', () => {
    const results = toSingularTypes(['videos', 'files']);

    expect(results).toEqual(['video', 'file']);
  });
});

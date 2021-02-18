import compactParams from '../compactParams';

describe('UPLOAD | utils | compactParams', () => {
  it('should return the params object without the empty values', () => {
    const params = {
      _limit: 10,
      _start: 0,
      _q: '',
      filters: [],
      _n: null,
      _p: undefined,
    };
    const compactedParams = compactParams(params);
    const expectedParams = {
      _limit: 10,
      _start: 0,
    };
    expect(compactedParams).toEqual(expectedParams);
  });
});

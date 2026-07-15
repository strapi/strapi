import eeModule from '../index';

describe('ee accessors', () => {
  it('exposes expireAt from the in-memory license info', () => {
    // The module boots disabled with no license; expireAt is undefined until a license is loaded.
    expect(eeModule).toHaveProperty('expireAt');
    expect(eeModule.expireAt).toBeUndefined();
  });
});

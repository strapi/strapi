import eeModule from '../index';

describe('ee accessors', () => {
  it('exposes expireAt from the in-memory license info', () => {
    // The module boots disabled with no license; expireAt is undefined until a license is loaded.
    expect(eeModule).toHaveProperty('expireAt');
    expect(eeModule.expireAt).toBeUndefined();
  });

  it('defaults renewalDate to null when there is no license', () => {
    expect(eeModule.renewalDate).toBeNull();
  });

  it('defaults planFeatureCatalog to an empty array when there is no license', () => {
    expect(eeModule.planFeatureCatalog).toEqual([]);
  });
});

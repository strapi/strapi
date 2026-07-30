import { isCTVisibleInSpace } from '../visibility';

describe('isCTVisibleInSpace', () => {
  it('returns true when visibleIn lists the space', () => {
    const ct = { pluginOptions: { spaces: { visibleIn: ['acme', 'default'] } } };
    expect(isCTVisibleInSpace(ct, 'acme')).toBe(true);
  });

  it('returns false when visibleIn does not list the space', () => {
    const ct = { pluginOptions: { spaces: { visibleIn: ['default'] } } };
    expect(isCTVisibleInSpace(ct, 'acme')).toBe(false);
  });

  it('treats an empty visibleIn as platform-wide (visible everywhere)', () => {
    const ct = { pluginOptions: { spaces: { visibleIn: [] } } };
    expect(isCTVisibleInSpace(ct, 'acme')).toBe(true);
  });

  it('treats a missing visibleIn as platform-wide', () => {
    const ct = { pluginOptions: { spaces: { scope: 'space' } } };
    expect(isCTVisibleInSpace(ct, 'acme')).toBe(true);
  });

  it('treats missing pluginOptions as platform-wide', () => {
    expect(isCTVisibleInSpace({}, 'acme')).toBe(true);
    expect(isCTVisibleInSpace(null, 'acme')).toBe(true);
    expect(isCTVisibleInSpace(undefined, 'acme')).toBe(true);
  });

  it('treats a non-array visibleIn as platform-wide (defensive)', () => {
    const ct = { pluginOptions: { spaces: { visibleIn: 'acme' } } };
    expect(isCTVisibleInSpace(ct, 'acme')).toBe(true);
  });
});

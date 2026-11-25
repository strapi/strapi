import { registerReleasesEntitlements } from '../entitlements';

const resolveWith = (feature: unknown) => {
  const register = jest.fn();
  registerReleasesEntitlements({ ee: { entitlements: { register } } } as any);

  const [{ feature: name, limits }] = register.mock.calls[0];
  expect(name).toBe('cms-content-releases');
  expect(limits[0]).toMatchObject({ key: 'maximumReleases', unit: 'count' });
  return limits[0].get(feature);
};

describe('content-releases entitlements', () => {
  it('reads the cap from the feature it is handed', () => {
    expect(resolveWith({ name: 'cms-content-releases', options: { maximumReleases: 10 } })).toBe(
      10
    );
  });

  it('reads a numeric string cap as its number', () => {
    expect(resolveWith({ name: 'cms-content-releases', options: { maximumReleases: '90' } })).toBe(
      90
    );
  });

  it.each([
    ['"0"', { name: 'cms-content-releases', options: { maximumReleases: '0' } }],
    ['0', { name: 'cms-content-releases', options: { maximumReleases: 0 } }],
    ['a non-numeric cap', { name: 'cms-content-releases', options: { maximumReleases: 'many' } }],
    ['a missing cap', { name: 'cms-content-releases', options: {} }],
    ['a bare feature name', 'cms-content-releases'],
    ['a missing feature', undefined],
  ])('defaults to the 3 pending releases validation enforces for %s', (_, feature) => {
    expect(resolveWith(feature)).toBe(3);
  });
});

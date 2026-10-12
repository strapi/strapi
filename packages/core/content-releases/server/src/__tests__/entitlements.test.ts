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

  it('defaults to the 3 pending releases validation enforces', () => {
    expect(resolveWith({ name: 'cms-content-releases', options: {} })).toBe(3);
    expect(resolveWith(undefined)).toBe(3);
  });
});

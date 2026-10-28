import isSuperAdmin from '../isSuperAdmin';

describe('isSuperAdmin', () => {
  it('allows the role used by performance homepage widgets', () => {
    expect(
      isSuperAdmin({
        state: { user: { roles: [{ code: 'strapi-super-admin' }] } },
      })
    ).toBe(true);
  });

  it('denies authenticated users without the super-admin role', () => {
    expect(isSuperAdmin({ state: { user: { roles: [{ code: 'strapi-editor' }] } } })).toBe(false);
  });
});

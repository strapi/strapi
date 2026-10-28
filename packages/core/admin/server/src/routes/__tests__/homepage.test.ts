import homepageRoutes from '../homepage';

describe('homepage routes', () => {
  it('restricts performance metrics to the same super-admin role as its widgets', () => {
    const route = homepageRoutes.find((route) => route.path === '/homepage/performance-metrics');

    expect(route?.config.policies).toEqual(['admin::isAuthenticatedAdmin', 'admin::isSuperAdmin']);
  });
});

import auditLogsRoutes from '../audit-logs';

describe('Audit logs routes', () => {
  it('should declare /audit-logs/users before /audit-logs/:id so it is not matched as an id', () => {
    const paths = auditLogsRoutes.routes.map((route) => route.path);

    const usersIndex = paths.indexOf('/audit-logs/users');
    const byIdIndex = paths.indexOf('/audit-logs/:id');

    expect(usersIndex).toBeGreaterThan(-1);
    expect(byIdIndex).toBeGreaterThan(-1);
    expect(usersIndex).toBeLessThan(byIdIndex);
  });

  it('should declare /audit-logs/export before /audit-logs/:id so it is not matched as an id', () => {
    const paths = auditLogsRoutes.routes.map((route) => route.path);

    const exportIndex = paths.indexOf('/audit-logs/export');
    const byIdIndex = paths.indexOf('/audit-logs/:id');

    expect(exportIndex).toBeGreaterThan(-1);
    expect(byIdIndex).toBeGreaterThan(-1);
    expect(exportIndex).toBeLessThan(byIdIndex);
  });

  it('should protect every route with the read permission and feature middleware', () => {
    const expectedActionsByPath: Record<string, string[]> = {
      '/audit-logs/export': ['admin::audit-logs.read', 'admin::audit-logs.export'],
    };

    for (const route of auditLogsRoutes.routes) {
      const expectedActions = expectedActionsByPath[route.path] ?? ['admin::audit-logs.read'];

      expect(expectedActions).toContain('admin::audit-logs.read');
      expect(route.config.middlewares).toHaveLength(1);
      expect(route.config.policies).toEqual([
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: expectedActions },
        },
      ]);
    }
  });
});

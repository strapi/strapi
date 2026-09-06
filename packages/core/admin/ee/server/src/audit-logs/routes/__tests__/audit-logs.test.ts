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

  it('should protect every route with the audit-logs read permission and feature middleware', () => {
    for (const route of auditLogsRoutes.routes) {
      expect(route.config.middlewares).toHaveLength(1);
      expect(route.config.policies).toEqual([
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::audit-logs.read'] },
        },
      ]);
    }
  });
});

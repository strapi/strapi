import { describe, expect, it } from 'vitest';

import adminRoutes from '../routes/admin';

describe('email admin routes', () => {
  const isTemplateRoute = (route: { path: string }) => route.path.startsWith('/templates');

  it('requires the email settings permission on every route, including POST /', () => {
    expect(adminRoutes.routes.length).toBeGreaterThan(0);

    for (const route of adminRoutes.routes.filter((r) => !isTemplateRoute(r))) {
      expect(route.config.policies).toEqual([
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
      ]);
    }

    const send = adminRoutes.routes.find((r) => r.method === 'POST' && r.path === '/');
    expect(send?.handler).toBe('email.send');
  });

  it('requires the email templates permissions on the template routes', () => {
    const templateRoutes = adminRoutes.routes.filter(isTemplateRoute);
    expect(templateRoutes.length).toBeGreaterThan(0);

    for (const route of templateRoutes) {
      const action =
        route.method === 'GET' ? 'plugin::email.templates.read' : 'plugin::email.templates.update';

      expect(route.config.policies).toEqual([
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: [action] } },
      ]);
    }
  });
});

import { describe, expect, it } from 'vitest';

import adminRoutes from '../routes/admin';

describe('email admin routes', () => {
  it('requires the email settings permission on every route, including POST /', () => {
    expect(adminRoutes.routes.length).toBeGreaterThan(0);

    for (const route of adminRoutes.routes) {
      expect(route.config.policies).toEqual([
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['plugin::email.settings.read'] } },
      ]);
    }

    const send = adminRoutes.routes.find((r) => r.method === 'POST' && r.path === '/');
    expect(send?.handler).toBe('email.send');
  });
});

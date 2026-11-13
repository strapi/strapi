import { describe, expect, it, vi } from 'vitest';

describe('content API route compatibility', () => {
  it('shares lazy route mutations with extensions without a global instance', async () => {
    vi.resetModules();
    vi.stubGlobal('strapi', undefined);
    try {
      const { default: createRoutes } = await import('..');
      const legacyRoutes = Reflect.get(createRoutes, 'routes');
      expect(createRoutes().routes).toBe(legacyRoutes);
      expect(createRoutes().routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/auth/local',
            handler: 'auth.callback',
          }),
          expect.objectContaining({ method: 'GET', path: '/users/me', handler: 'user.me' }),
        ])
      );
      const extensionRoutes = [...createRoutes().routes];
      Reflect.set(createRoutes, 'routes', extensionRoutes);
      expect(createRoutes().routes).toBe(extensionRoutes);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});

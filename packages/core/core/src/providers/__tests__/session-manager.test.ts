import sessionManagerProvider from '../session-manager';

const createMockStrapi = (config: Record<string, unknown> = {}) =>
  ({
    add: jest.fn(),
    db: {},
    config: {
      get: jest.fn((key: string) => {
        const parts = key.split('.');
        let current: unknown = config;
        for (const part of parts) {
          if (current && typeof current === 'object') {
            current = (current as Record<string, unknown>)[part];
          } else {
            return undefined;
          }
        }
        return current;
      }),
    },
  }) as any;

describe('session-manager provider', () => {
  describe('init', () => {
    it('registers the sessionManager service', () => {
      const strapi = createMockStrapi();
      sessionManagerProvider.init!(strapi);
      expect(strapi.add).toHaveBeenCalledWith('sessionManager', expect.any(Function));
    });
  });

  describe('bootstrap', () => {
    it('does not throw when serveAdminPanel is false and no JWT secret', async () => {
      const strapi = createMockStrapi({
        admin: { serveAdminPanel: false },
      });

      await expect(sessionManagerProvider.bootstrap!(strapi)).resolves.toBeUndefined();
    });

    it('throws when serveAdminPanel is true and JWT secret is missing', async () => {
      const strapi = createMockStrapi({
        admin: { serveAdminPanel: true, auth: {} },
      });

      await expect(sessionManagerProvider.bootstrap!(strapi)).rejects.toThrow(
        'Missing admin.auth.secret configuration'
      );
    });

    it('does not throw when serveAdminPanel is true and JWT secret is present', async () => {
      const strapi = createMockStrapi({
        admin: { serveAdminPanel: true, auth: { secret: 'test-secret' } },
      });

      await expect(sessionManagerProvider.bootstrap!(strapi)).resolves.toBeUndefined();
    });
  });

  describe('register', () => {
    it('is not defined on the provider', () => {
      expect(sessionManagerProvider.register).toBeUndefined();
    });
  });
});

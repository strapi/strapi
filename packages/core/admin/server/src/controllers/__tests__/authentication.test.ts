import authenticationController from '../authentication';

describe('Authentication Controller', () => {
  describe('registerAdmin', () => {
    const mockCtx = () => ({
      request: { body: { email: 'a@b.c', password: 'Password1!', firstname: 'A' } },
      cookies: { set: jest.fn() },
      state: {},
      internalServerError: jest.fn(),
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    test('throws ApplicationError when admin.register.enabled is false', async () => {
      global.strapi = {
        config: {
          get: jest.fn((key: string, def: unknown) => {
            if (key === 'admin.register.enabled') return false;
            return def;
          }),
        },
        admin: {
          services: {
            user: {
              exists: jest.fn(() => false),
              create: jest.fn(),
              sanitizeUser: jest.fn((u) => u),
            },
            role: {
              getSuperAdmin: jest.fn(() => ({ id: 1 })),
            },
          },
        },
        log: { error: jest.fn() },
        telemetry: { send: jest.fn() },
        eventHub: { emit: jest.fn() },
      } as any;

      const ctx = mockCtx();

      await expect(authenticationController.registerAdmin(ctx as any)).rejects.toThrow(
        'Admin registration is disabled'
      );

      expect(global.strapi.config.get).toHaveBeenCalledWith('admin.register.enabled', true);
      expect(global.strapi.service('admin::user').exists).not.toHaveBeenCalled();
    });

    test('does not short-circuit when admin.register.enabled is true (default)', async () => {
      const hasAdmin = jest.fn(() => true);
      global.strapi = {
        config: {
          get: jest.fn((_key: string, def: unknown) => def),
        },
        admin: {
          services: {
            user: {
              exists: hasAdmin,
              create: jest.fn(),
              sanitizeUser: jest.fn((u) => u),
            },
            role: {
              getSuperAdmin: jest.fn(() => ({ id: 1 })),
            },
          },
        },
        log: { error: jest.fn() },
        telemetry: { send: jest.fn() },
        eventHub: { emit: jest.fn() },
      } as any;

      const ctx = mockCtx();

      // With hasAdmin === true, the existing second guard throws "You cannot register a new super admin".
      // We assert that error specifically — which proves the new guard passed through and the
      // existing guard ran (i.e. the new check did not break the happy path).
      await expect(authenticationController.registerAdmin(ctx as any)).rejects.toThrow(
        'You cannot register a new super admin'
      );
      expect(hasAdmin).toHaveBeenCalled();
    });
  });
});

import bootstrap from '../bootstrap';

jest.mock(
  '@strapi/utils',
  () => ({
    async: {
      pipe:
        (...fns: Array<(value?: unknown) => unknown>) =>
        async () => {
          let result;

          for (const fn of fns) {
            result = await fn(result);
          }

          return result;
        },
    },
  }),
  { virtual: true }
);

const DEPRECATION_WARNING =
  'admin.auth.options.expiresIn is deprecated and will be removed in Strapi 6. Please configure admin.auth.sessions.maxRefreshTokenLifespan and admin.auth.sessions.maxSessionLifespan.';

const createStrapiMock = (config: Record<string, unknown> = {}) => {
  const permissionService = {
    actionProvider: {
      registerMany: jest.fn(),
    },
    conditionProvider: {
      registerMany: jest.fn(),
    },
    cleanPermissionsInDatabase: jest.fn(),
  };

  const roleService = {
    exists: jest.fn().mockResolvedValue(true),
    createRolesIfNoneExist: jest.fn(),
    resetSuperAdminPermissions: jest.fn(),
    displayWarningIfNoSuperAdmin: jest.fn(),
  };

  const userService = {
    count: jest.fn().mockResolvedValue(1),
    displayWarningIfUsersDontHaveRole: jest.fn(),
  };

  const apiTokenService = {
    count: jest.fn().mockResolvedValue(1),
    create: jest.fn(),
    checkSaltIsDefined: jest.fn(),
  };

  const metricsService = {
    sendDidChangeInterfaceLanguage: jest.fn(),
    sendUpdateProjectInformation: jest.fn(),
    startCron: jest.fn(),
  };

  const services: Record<string, unknown> = {
    permission: permissionService,
    role: roleService,
    user: userService,
    'api-token': apiTokenService,
    metrics: metricsService,
    transfer: {
      token: {
        checkSaltIsDefined: jest.fn(),
      },
    },
    token: {
      checkSecretIsDefined: jest.fn(),
    },
  };

  return {
    config: {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return Object.prototype.hasOwnProperty.call(config, key) ? config[key] : defaultValue;
      }),
    },
    contentAPI: {
      permissions: {
        providers: {
          action: {
            keys: jest.fn().mockReturnValue([]),
          },
        },
      },
    },
    db: {
      lifecycles: {
        subscribe: jest.fn(),
      },
      query: jest.fn().mockReturnValue({
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      }),
    },
    log: {
      warn: jest.fn(),
    },
    admin: {
      services,
    },
    apis: {},
    plugins: {},
    service: jest.fn((uid: string) => services[uid.replace('admin::', '')]),
    sessionManager: {
      defineOrigin: jest.fn(),
    },
    store: jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue({ providers: { defaultRole: null } }),
      set: jest.fn(),
    }),
  };
};

describe('admin bootstrap', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not warn about deprecated expiresIn when only the default JWT option is present', async () => {
    const strapi = createStrapiMock({
      'admin.auth': {
        secret: 'admin-secret',
      },
    });
    global.strapi = strapi as any;

    await bootstrap({ strapi: strapi as any });

    expect(strapi.log.warn).not.toHaveBeenCalledWith(DEPRECATION_WARNING);
  });

  test('warns about deprecated expiresIn when it is explicitly configured without new session lifespans', async () => {
    const strapi = createStrapiMock({
      'admin.auth': {
        secret: 'admin-secret',
        options: {
          expiresIn: '7d',
        },
      },
    });
    global.strapi = strapi as any;

    await bootstrap({ strapi: strapi as any });

    expect(strapi.log.warn).toHaveBeenCalledWith(DEPRECATION_WARNING);
  });
});

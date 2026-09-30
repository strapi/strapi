import { createAiAdminService } from '../ai';

describe('AI Container', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV }; // fresh copy for each test

    // Reset global fetch
    delete (global as any).fetch;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // fully restore after suite
  });

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    firstname: 'Test',
    lastname: 'User',
  };

  const createMockStrapi = (config = {}) => {
    return {
      ee: {
        isEE: true,
        providedLicense: 'test-license',
        features: { isEnabled: jest.fn().mockReturnValue(true) },
      },
      config: {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'uuid') return 'test-project-id';
          if (key === 'admin.ai.enabled') return defaultValue ?? true;
          return defaultValue;
        }),
      },
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        http: jest.fn(),
      },
      requestContext: {
        get: jest.fn(() => ({
          state: { user: mockUser },
        })),
      },
      ...config,
    };
  };

  const setupValidEnvironment = () => {
    process.env.STRAPI_AI_URL = 'http://ai-server.com';
  };

  const createSuccessfulTokenFetch = (responseData = {}) => {
    const defaultResponse = {
      jwt: 'test-jwt-token',
      expiresAt: '2025-01-01T12:00:00Z',
    };

    return jest.fn().mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ ...defaultResponse, ...responseData }),
    });
  };

  describe('resolveAIContext (shared by getAiToken and getAiUsage)', () => {
    test('Should throw when the license does not include cms-ai', async () => {
      const mockStrapi = createMockStrapi({
        ee: {
          isEE: true,
          providedLicense: 'test-license',
          features: { isEnabled: jest.fn().mockReturnValue(false) },
        },
      }) as any;
      setupValidEnvironment();
      global.fetch = jest.fn();
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiUsage()).rejects.toThrow(
        'AI usage data request failed. Check server logs for details.'
      );
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI usage data request failed: AI is not enabled'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('Should throw when no EE license is found', async () => {
      const mockStrapi = createMockStrapi() as any;
      mockStrapi.ee.providedLicense = undefined;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiUsage()).rejects.toThrow(
        'AI usage data request failed. Check server logs for details.'
      );
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI usage data request failed: No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.'
      );
    });

    test('Should throw when project ID is not configured', async () => {
      const mockStrapi = createMockStrapi({
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'uuid') return null;
            if (key === 'admin.ai.enabled') return defaultValue ?? true;
            return undefined;
          }),
        },
      }) as any;
      setupValidEnvironment();
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiUsage()).rejects.toThrow(
        'AI usage data request failed. Check server logs for details.'
      );
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI usage data request failed: Project ID not configured'
      );
    });
  });

  describe('getAiToken', () => {
    test('Should throw error when the license does not include cms-ai', async () => {
      const mockStrapi = createMockStrapi({
        ee: {
          isEE: true,
          providedLicense: 'test-license',
          features: { isEnabled: jest.fn().mockReturnValue(false) },
        },
      }) as any;
      setupValidEnvironment();
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: AI is not enabled'
      );
    });

    test('Should throw error when no EE license is found', async () => {
      const mockStrapi = createMockStrapi() as any;
      mockStrapi.ee.providedLicense = undefined;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.'
      );
    });

    test('Should send the license provided to EE, not the one set after startup', async () => {
      const mockStrapi = createMockStrapi() as any;
      mockStrapi.ee.providedLicense = 'provided-license';
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      setupValidEnvironment();
      process.env.STRAPI_LICENSE = 'set-after-startup';
      global.fetch = createSuccessfulTokenFetch();

      await aiContainer.getAiToken();

      const [, request] = (global.fetch as jest.Mock).mock.calls[0];
      expect(JSON.parse(request.body)).toMatchObject({ eeLicense: 'provided-license' });
    });

    test('Should throw error when no authenticated user in request context', async () => {
      const mockStrapi = createMockStrapi({
        requestContext: {
          get: jest.fn(() => ({ state: {} })),
        },
      }) as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: No authenticated user in request context'
      );
    });

    test('Should throw error when project ID is not configured', async () => {
      const mockStrapi = createMockStrapi({
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'uuid') return null;
            if (key === 'admin.ai.enabled') return defaultValue ?? true;
            return defaultValue;
          }),
        },
      }) as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Project ID not configured'
      );
    });

    test('Should successfully return AI token when all conditions are met', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = createSuccessfulTokenFetch();

      const result = await aiContainer.getAiToken();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://ai-server.com/auth/getAiJWT',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Request-Id': expect.any(String),
          }),
          body: expect.stringContaining('test-license'),
        })
      );

      expect(result).toEqual({
        token: 'test-jwt-token',
        expiresAt: '2025-01-01T12:00:00Z',
      });

      expect(mockStrapi.log.http).toHaveBeenCalledWith('Contacting AI Server for token generation');
      expect(mockStrapi.log.info).toHaveBeenCalledWith('AI token generated successfully', {
        userId: 1,
        expiresAt: '2025-01-01T12:00:00Z',
      });
    });

    test('Should use default AI server URL when not configured', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      delete process.env.STRAPI_AI_URL;

      global.fetch = createSuccessfulTokenFetch();

      await aiContainer.getAiToken();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://strapi-ai.apps.strapi.io/auth/getAiJWT',
        expect.any(Object)
      );
    });

    test('Should handle AI server error response', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: jest.fn().mockResolvedValueOnce('{"error": "Invalid license"}'),
      });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Invalid license',
        expect.objectContaining({
          status: 400,
          statusText: 'Bad Request',
        })
      );
    });

    test('Should handle invalid JSON response from AI server', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
      });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Failed to parse AI server response',
        expect.any(Error)
      );
    });

    test('Should handle missing JWT in response', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ expiresAt: '2025-01-01T12:00:00Z' }),
      });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Invalid response: missing JWT token'
      );
    });

    test('Should handle fetch timeout', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValueOnce(abortError);

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Request to AI server timed out'
      );
    });
  });

  describe('getAiUsage', () => {
    const mockUsageResponse = {
      data: { cmsAiCreditsUsed: 42 },
      subscription: {
        subscriptionId: 'sub-1',
        planPriceId: 'price-1',
        subscriptionStatus: 'active',
        isActiveSubscription: true,
        cmsAiEnabled: true,
        cmsAiCreditsBase: 1000,
        cmsAiCreditsMaxUsage: 2000,
        currentTermStart: '2025-01-01',
        currentTermEnd: '2025-12-31',
      },
    };

    test('Should return usage data when all conditions are met', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockUsageResponse),
      });

      const result = await aiContainer.getAiUsage();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://ai-server.com/cms/ai-data',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Request-Id': expect.any(String),
          }),
          body: expect.stringContaining('test-license'),
        })
      );

      expect(result).toEqual({
        cmsAiCreditsUsed: 42,
        subscription: mockUsageResponse.subscription,
      });
    });

    test('Should throw on AI server error response', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: jest.fn().mockResolvedValueOnce('{"error": "Server error"}'),
      });

      await expect(aiContainer.getAiUsage()).rejects.toThrow(
        'AI usage data request failed. Check server logs for details.'
      );
    });

    test('Should throw on fetch timeout', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });
      setupValidEnvironment();

      const abortError = new Error('timeout');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValueOnce(abortError);

      await expect(aiContainer.getAiUsage()).rejects.toThrow(
        'AI usage data request failed. Check server logs for details.'
      );
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI usage data request failed: Request to AI server timed out'
      );
    });
  });

  describe('isAvailable', () => {
    const createStrapi = ({
      configEnabled = true,
      licensedFeatures = ['cms-ai', 'cms-byok-ai'] as string[],
    } = {}) =>
      ({
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'admin.ai.enabled') return configEnabled ? (defaultValue ?? true) : false;
            return defaultValue;
          }),
        },
        ee: {
          isEE: true,
          features: { isEnabled: jest.fn((name: string) => licensedFeatures.includes(name)) },
        },
      }) as any;

    test.each([[['cms-ai']], [['cms-byok-ai']], [['cms-ai', 'cms-byok-ai']]])(
      'returns true when the license lists %p',
      (licensedFeatures) => {
        expect(
          createAiAdminService({ strapi: createStrapi({ licensedFeatures }) }).isAvailable()
        ).toBe(true);
      }
    );

    test('returns false for a license without an AI feature', () => {
      expect(
        createAiAdminService({ strapi: createStrapi({ licensedFeatures: ['sso'] }) }).isAvailable()
      ).toBe(false);
    });

    test('returns false when config explicitly disables AI', () => {
      expect(
        createAiAdminService({ strapi: createStrapi({ configEnabled: false }) }).isAvailable()
      ).toBe(false);
    });

    test('returns false when ee is undefined', () => {
      const strapi = createStrapi();
      strapi.ee = undefined;

      expect(createAiAdminService({ strapi }).isAvailable()).toBe(false);
    });
  });

  describe('isStrapiManagedAiEnabled', () => {
    const createStrapi = ({ configEnabled = true, licensedFeatures = [] as string[] } = {}) =>
      ({
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'admin.ai.enabled') return configEnabled ? (defaultValue ?? true) : false;
            return defaultValue;
          }),
        },
        ee: {
          isEE: true,
          features: { isEnabled: jest.fn((name: string) => licensedFeatures.includes(name)) },
        },
      }) as any;

    test('follows the cms-ai license feature', () => {
      expect(
        createAiAdminService({
          strapi: createStrapi({ licensedFeatures: ['cms-ai'] }),
        }).isStrapiManagedAiEnabled()
      ).toBe(true);

      expect(createAiAdminService({ strapi: createStrapi() }).isStrapiManagedAiEnabled()).toBe(
        false
      );
    });

    test('returns false when config explicitly disables AI', () => {
      expect(
        createAiAdminService({
          strapi: createStrapi({ configEnabled: false, licensedFeatures: ['cms-ai'] }),
        }).isStrapiManagedAiEnabled()
      ).toBe(false);
    });

    test('returns false when ee is undefined', () => {
      const strapi = createStrapi({ licensedFeatures: ['cms-ai'] });
      strapi.ee = undefined;

      expect(createAiAdminService({ strapi }).isStrapiManagedAiEnabled()).toBe(false);
    });

    test('follows the license when the entitlement is revoked at runtime', () => {
      const licensedFeatures = ['cms-ai'];
      const aiContainer = createAiAdminService({ strapi: createStrapi({ licensedFeatures }) });

      expect(aiContainer.isStrapiManagedAiEnabled()).toBe(true);

      licensedFeatures.length = 0;

      expect(aiContainer.isStrapiManagedAiEnabled()).toBe(false);
    });
  });

  describe('authorizeCustomProvider', () => {
    const createStrapi = ({ configEnabled = true, licensedFeatures = [] as string[] } = {}) =>
      ({
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'admin.ai.enabled') return configEnabled ? (defaultValue ?? true) : false;
            return defaultValue;
          }),
        },
        ee: {
          isEE: true,
          features: { isEnabled: jest.fn((name: string) => licensedFeatures.includes(name)) },
        },
        log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() },
      }) as any;

    test('returns true and does not log when the cms-byok-ai feature is present', () => {
      const strapi = createStrapi({ licensedFeatures: ['cms-byok-ai'] });
      const aiContainer = createAiAdminService({ strapi });

      expect(aiContainer.authorizeCustomProvider()).toBe(true);
      expect(strapi.log.warn).not.toHaveBeenCalled();
      expect(strapi.log.info).not.toHaveBeenCalled();
    });

    test('returns false and calls log.warn once with a message containing cms-byok-ai when the feature is missing', () => {
      const strapi = createStrapi();
      const aiContainer = createAiAdminService({ strapi });

      expect(aiContainer.authorizeCustomProvider()).toBe(false);
      expect(strapi.log.warn).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('cms-byok-ai'));
    });

    test('after one rejection, isAvailable and isStrapiManagedAiEnabled return false, even when features.isEnabled later returns true', () => {
      const strapi = createStrapi();
      const aiContainer = createAiAdminService({ strapi });

      expect(aiContainer.authorizeCustomProvider()).toBe(false);

      strapi.ee.features.isEnabled.mockReturnValue(true);

      expect(aiContainer.isAvailable()).toBe(false);
      expect(aiContainer.isStrapiManagedAiEnabled()).toBe(false);
    });

    test('returns false, logs info, does not warn, and does not block when admin.ai.enabled is false', () => {
      let enabled = false;
      const strapi = {
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'admin.ai.enabled') return enabled;
            return defaultValue;
          }),
        },
        ee: {
          isEE: true,
          features: { isEnabled: jest.fn().mockReturnValue(true) },
        },
        log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() },
      } as any;
      const aiContainer = createAiAdminService({ strapi });

      expect(aiContainer.authorizeCustomProvider()).toBe(false);
      expect(strapi.log.info).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn).not.toHaveBeenCalled();

      enabled = true;

      expect(aiContainer.isStrapiManagedAiEnabled()).toBe(true);
    });
  });

  describe('license truth table', () => {
    type Row = {
      isEE: boolean;
      features: string[];
      customProvider: boolean;
      available: boolean;
      managed: boolean;
      authorized?: boolean;
    };

    // A license lists features only while EE is enabled, so the rows without EE list none
    const rows: Row[] = [
      { isEE: false, features: [], customProvider: false, available: false, managed: false },
      {
        isEE: false,
        features: [],
        customProvider: true,
        available: false,
        managed: false,
        authorized: false,
      },
      { isEE: true, features: [], customProvider: false, available: false, managed: false },
      {
        isEE: true,
        features: [],
        customProvider: true,
        available: false,
        managed: false,
        authorized: false,
      },
      { isEE: true, features: ['cms-ai'], customProvider: false, available: true, managed: true },
      {
        isEE: true,
        features: ['cms-ai'],
        customProvider: true,
        available: false,
        managed: false,
        authorized: false,
      },
      {
        isEE: true,
        features: ['cms-byok-ai'],
        customProvider: false,
        available: true,
        managed: false,
      },
      {
        isEE: true,
        features: ['cms-byok-ai'],
        customProvider: true,
        available: true,
        managed: false,
        authorized: true,
      },
      {
        isEE: true,
        features: ['cms-ai', 'cms-byok-ai'],
        customProvider: false,
        available: true,
        managed: true,
      },
      {
        isEE: true,
        features: ['cms-ai', 'cms-byok-ai'],
        customProvider: true,
        available: true,
        managed: true,
        authorized: true,
      },
    ];

    test.each(rows)(
      'isEE: $isEE, features: $features, custom provider: $customProvider',
      ({ isEE, features, customProvider, available, managed, authorized }) => {
        const strapi = {
          config: { get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue) },
          ee: {
            isEE,
            features: { isEnabled: jest.fn((name: string) => features.includes(name)) },
          },
          log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() },
        } as any;
        const aiContainer = createAiAdminService({ strapi });

        if (customProvider === true) {
          expect(aiContainer.authorizeCustomProvider()).toBe(authorized);
        }

        expect(aiContainer.isAvailable()).toBe(available);
        expect(aiContainer.isStrapiManagedAiEnabled()).toBe(managed);
      }
    );
  });

  describe('getAiFeatureConfig', () => {
    const createStrapi = ({
      hasAiFeature = true,
      i18n,
      upload,
    }: { hasAiFeature?: boolean; i18n?: unknown; upload?: unknown } = {}) =>
      ({
        config: { get: jest.fn((key: string, defaultValue?: unknown) => defaultValue) },
        ee: { isEE: true, features: { isEnabled: jest.fn().mockReturnValue(hasAiFeature) } },
        plugin: jest.fn((name: string) => {
          if (name === 'i18n' && i18n !== undefined) return { service: jest.fn(() => i18n) };
          if (name === 'upload' && upload !== undefined) return { service: jest.fn(() => upload) };
          return undefined;
        }),
      }) as any;

    test('asks the plugin that owns each feature', async () => {
      const strapi = createStrapi({
        i18n: { isEnabled: jest.fn().mockResolvedValue(true) },
        upload: { isEnabled: jest.fn().mockResolvedValue(false) },
      });

      await expect(createAiAdminService({ strapi }).getAiFeatureConfig()).resolves.toEqual({
        isAiI18nConfigured: true,
        isAiMediaLibraryConfigured: false,
      });

      expect(strapi.plugin).toHaveBeenCalledWith('i18n');
      expect(strapi.plugin).toHaveBeenCalledWith('upload');
    });

    test('reports a feature as not configured when its plugin is not installed', async () => {
      await expect(
        createAiAdminService({ strapi: createStrapi() }).getAiFeatureConfig()
      ).resolves.toEqual({
        isAiI18nConfigured: false,
        isAiMediaLibraryConfigured: false,
      });
    });

    test('reports a feature as not configured when its plugin has no AI service', async () => {
      await expect(
        createAiAdminService({ strapi: createStrapi({ i18n: {} }) }).getAiFeatureConfig()
      ).resolves.toEqual({
        isAiI18nConfigured: false,
        isAiMediaLibraryConfigured: false,
      });
    });

    test('skips the plugins without an AI license feature', async () => {
      const strapi = createStrapi({
        hasAiFeature: false,
        i18n: { isEnabled: jest.fn().mockResolvedValue(true) },
      });

      await expect(createAiAdminService({ strapi }).getAiFeatureConfig()).resolves.toEqual({
        isAiI18nConfigured: false,
        isAiMediaLibraryConfigured: false,
      });

      expect(strapi.plugin).not.toHaveBeenCalled();
    });
  });
});

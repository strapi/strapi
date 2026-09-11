import fs from 'fs';
import path from 'path';
import { createAiAdminService } from '../ai';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('AI Container', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV }; // fresh copy for each test

    // Reset global fetch
    delete (global as any).fetch;

    // Reset fs mocks
    mockFs.readFileSync.mockReset();
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
        features: { isEnabled: jest.fn().mockReturnValue(true) },
      },
      dirs: { app: { root: '/app' } },
      config: {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'uuid') return 'test-project-id';
          if (key === 'admin.ai.enabled') return defaultValue ?? true;
          return defaultValue;
        }),
      },
      log: {
        info: jest.fn(),
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
    process.env.STRAPI_LICENSE = 'test-license';
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
    test('Should throw when EE features are not enabled', async () => {
      // isEnabled() must pass (config + license feature ok) so resolveAiContext runs;
      // the isEE: false guard inside resolveAiContext is what this test exercises.
      const mockStrapi = createMockStrapi({
        ee: {
          isEE: false,
          features: { isEnabled: jest.fn().mockReturnValue(true) },
        },
      }) as any;
      setupValidEnvironment();
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiUsage()).rejects.toThrow(
        'AI usage data request failed. Check server logs for details.'
      );
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI usage data request failed: Enterprise Edition features are not enabled'
      );
    });

    test('Should throw when no EE license is found', async () => {
      const mockStrapi = createMockStrapi() as any;
      delete process.env.STRAPI_LICENSE;
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
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
    test('Should throw error when EE features are not enabled', async () => {
      // isEnabled() must pass so resolveAiContext runs; isEE: false is what resolveAiContext checks.
      const mockStrapi = createMockStrapi({
        ee: {
          isEE: false,
          features: { isEnabled: jest.fn().mockReturnValue(true) },
        },
      }) as any;
      setupValidEnvironment();
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Enterprise Edition features are not enabled'
      );
    });

    test('Should throw error when no EE license is found', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      delete process.env.STRAPI_LICENSE;
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.'
      );
    });

    test('Should read license from file when environment variable is not set', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAiAdminService({ strapi: mockStrapi });

      delete process.env.STRAPI_LICENSE;
      process.env.STRAPI_AI_URL = 'http://ai-server.com';

      mockFs.readFileSync.mockReturnValue(Buffer.from('file-license-content'));
      global.fetch = createSuccessfulTokenFetch();

      await aiContainer.getAiToken();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(path.join('/app', 'license.txt'));
      expect(global.fetch).toHaveBeenCalledWith(
        'http://ai-server.com/auth/getAiJWT',
        expect.objectContaining({
          body: expect.stringContaining('file-license-content'),
        })
      );
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

      process.env.STRAPI_LICENSE = 'test-license';
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
    const createStrapi = ({ configEnabled = true, isEE = true } = {}) =>
      ({
        config: {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === 'admin.ai.enabled') return configEnabled ? (defaultValue ?? true) : false;
            return defaultValue;
          }),
        },
        ee: { isEE, features: { isEnabled: jest.fn().mockReturnValue(true) } },
      }) as any;

    test('follows the Enterprise license', () => {
      expect(createAiAdminService({ strapi: createStrapi() }).isAvailable()).toBe(true);
      expect(createAiAdminService({ strapi: createStrapi({ isEE: false }) }).isAvailable()).toBe(
        false
      );
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

  describe('getAiFeatureConfig', () => {
    const createStrapi = ({
      isEE = true,
      i18n,
      upload,
    }: { isEE?: boolean; i18n?: unknown; upload?: unknown } = {}) =>
      ({
        config: { get: jest.fn((key: string, defaultValue?: unknown) => defaultValue) },
        ee: { isEE, features: { isEnabled: jest.fn().mockReturnValue(true) } },
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

    test('skips the plugins without an Enterprise license', async () => {
      const strapi = createStrapi({
        isEE: false,
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

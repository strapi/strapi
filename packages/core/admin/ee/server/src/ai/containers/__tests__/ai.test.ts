import fs from 'fs';
import path from 'path';
import { createAIContainer } from '../ai';

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

  describe('getAiToken', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      firstname: 'Test',
      lastname: 'User',
    };

    const createMockStrapi = (config = {}) => {
      return {
        ee: { isEE: true },
        dirs: { app: { root: '/app' } },
        config: {
          get: jest.fn((key, defaultValue) => {
            if (key === 'uuid') return 'test-project-id';
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

    // Helper to setup standard valid environment
    const setupValidEnvironment = () => {
      process.env.STRAPI_LICENSE = 'test-license';
      process.env.STRAPI_AI_URL = 'http://ai-server.com';
    };

    // Helper to create successful AI server response
    const createSuccessfulFetch = (responseData = {}) => {
      const defaultResponse = {
        jwt: 'test-jwt-token',
        expiresAt: '2025-01-01T12:00:00Z',
      };

      return jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ ...defaultResponse, ...responseData }),
      });
    };

    test('Should throw error when EE features are not enabled', async () => {
      const mockStrapi = createMockStrapi({
        ee: { isEE: false },
      }) as any;
      const aiContainer = createAIContainer({ strapi: mockStrapi });

      await expect(aiContainer.getAiToken()).rejects.toThrow(
        'AI token request failed. Check server logs for details.'
      );

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'AI token request failed: Enterprise Edition features are not enabled'
      );
    });

    test('Should throw error when no EE license is found', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAIContainer({ strapi: mockStrapi });

      // Ensure no license is available
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
      const aiContainer = createAIContainer({ strapi: mockStrapi });

      delete process.env.STRAPI_LICENSE;
      process.env.STRAPI_AI_URL = 'http://ai-server.com';

      mockFs.readFileSync.mockReturnValue(Buffer.from('file-license-content'));
      global.fetch = createSuccessfulFetch();

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
      const aiContainer = createAIContainer({ strapi: mockStrapi });
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
          get: jest.fn((key) => (key === 'uuid' ? null : 'default-value')),
        },
      }) as any;
      const aiContainer = createAIContainer({ strapi: mockStrapi });
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
      const aiContainer = createAIContainer({ strapi: mockStrapi });
      setupValidEnvironment();

      global.fetch = createSuccessfulFetch();

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
      const aiContainer = createAIContainer({ strapi: mockStrapi });

      process.env.STRAPI_LICENSE = 'test-license';
      delete process.env.STRAPI_AI_URL;

      global.fetch = createSuccessfulFetch();

      await aiContainer.getAiToken();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://strapi-ai.apps.strapi.io/auth/getAiJWT',
        expect.any(Object)
      );
    });

    test('Should handle AI server error response', async () => {
      const mockStrapi = createMockStrapi() as any;
      const aiContainer = createAIContainer({ strapi: mockStrapi });
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
      const aiContainer = createAIContainer({ strapi: mockStrapi });
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
      const aiContainer = createAIContainer({ strapi: mockStrapi });
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
      const aiContainer = createAIContainer({ strapi: mockStrapi });
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

  describe('getAIFeatureConfig', () => {
    test('Should return AI feature configuration', async () => {
      const mockI18nSettings = { aiLocalizations: true };
      const mockUploadSettings = { aiMetadata: false };

      const mockStrapi = {
        plugin: jest.fn((pluginName) => {
          if (pluginName === 'i18n') {
            return {
              service: jest.fn(() => ({
                getSettings: jest.fn().mockResolvedValue(mockI18nSettings),
              })),
            };
          }
          if (pluginName === 'upload') {
            return {
              service: jest.fn(() => ({
                getSettings: jest.fn().mockResolvedValue(mockUploadSettings),
              })),
            };
          }
          return {};
        }),
      } as any;

      const aiContainer = createAIContainer({ strapi: mockStrapi });
      const result = await aiContainer.getAIFeatureConfig();

      expect(result).toEqual({
        isAIi18nConfigured: true,
        isAIMediaLibraryConfigured: false,
      });
    });
  });
});

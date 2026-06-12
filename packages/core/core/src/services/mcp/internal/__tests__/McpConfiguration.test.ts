import type { Core } from '@strapi/types';
import { McpConfiguration } from '../McpConfiguration';

describe('McpConfiguration', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let configGetSpy: jest.Mock;

  beforeEach(() => {
    configGetSpy = jest.fn();
    mockStrapi = {
      config: {
        get: configGetSpy,
      } as any,
    };
  });

  test('should initialize with default values when config is not set', () => {
    configGetSpy.mockImplementation((key, defaultValue) => defaultValue);

    const config = new McpConfiguration(mockStrapi as Core.Strapi);

    expect(config.path).toBe('/mcp');
    expect(config.connectTimeoutMs).toBe(5 * 1000);
    expect(config.requestTimeoutMs).toBe(60 * 1000);
  });

  test('should use custom connectTimeoutMs when provided', () => {
    configGetSpy.mockImplementation((key, defaultValue) => {
      const customConfig: Record<string, any> = {
        'server.mcp.connectTimeoutMs': 10 * 1000,
      };
      return customConfig[key] ?? defaultValue;
    });

    const config = new McpConfiguration(mockStrapi as Core.Strapi);

    expect(config.connectTimeoutMs).toBe(10 * 1000);
  });

  test('should use custom requestTimeoutMs when provided', () => {
    configGetSpy.mockImplementation((key, defaultValue) => {
      const customConfig: Record<string, any> = {
        'server.mcp.requestTimeoutMs': 120 * 1000,
      };
      return customConfig[key] ?? defaultValue;
    });

    const config = new McpConfiguration(mockStrapi as Core.Strapi);

    expect(config.requestTimeoutMs).toBe(120 * 1000);
  });

  describe('isEnabled', () => {
    test('should return true when mcp.enabled is true', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'server.mcp.enabled') return true;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isEnabled()).toBe(true);
    });

    test('should return false when mcp.enabled is false', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'server.mcp.enabled') return false;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isEnabled()).toBe(false);
    });

    test('should return false when mcp.enabled is not set', () => {
      configGetSpy.mockImplementation((key, defaultValue) => defaultValue);

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isEnabled()).toBe(false);
    });
  });

  describe('isDevMode', () => {
    test('should return true when autoReload is true', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'autoReload') return true;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isDevMode()).toBe(true);
    });

    test('should return false when autoReload is false', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'autoReload') return false;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isDevMode()).toBe(false);
    });
  });
});

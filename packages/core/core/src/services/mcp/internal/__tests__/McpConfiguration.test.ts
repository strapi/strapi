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
    expect(config.sessionIdleTimeoutMs).toBe(30 * 60 * 1000);
    expect(config.maxSessions).toBe(100);
    expect(config.cleanupIntervalMs).toBe(5 * 60 * 1000);
    expect(config.requestTimeoutMs).toBe(30 * 1000);
  });

  test('should use custom config values when provided', () => {
    configGetSpy.mockImplementation((key, defaultValue) => {
      const customConfig: Record<string, any> = {
        'server.mcp.sessionIdleTimeoutMs': 10 * 60 * 1000,
        'server.mcp.maxSessions': 50,
        'server.mcp.cleanupIntervalMs': 2 * 60 * 1000,
        'server.mcp.requestTimeoutMs': 60 * 1000,
      };
      return customConfig[key] ?? defaultValue;
    });

    const config = new McpConfiguration(mockStrapi as Core.Strapi);

    expect(config.sessionIdleTimeoutMs).toBe(10 * 60 * 1000);
    expect(config.maxSessions).toBe(50);
    expect(config.cleanupIntervalMs).toBe(2 * 60 * 1000);
    expect(config.requestTimeoutMs).toBe(60 * 1000);
  });

  describe('isEnabled', () => {
    test('should return true when both mcp.enabled and autoReload are true', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'server.mcp.enabled') return true;
        if (key === 'autoReload') return true;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isEnabled()).toBe(true);
    });

    test('should return false when mcp.enabled is false', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'server.mcp.enabled') return false;
        if (key === 'autoReload') return true;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isEnabled()).toBe(false);
    });

    test('should return false when autoReload is false', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'server.mcp.enabled') return true;
        if (key === 'autoReload') return false;
        return defaultValue;
      });

      const config = new McpConfiguration(mockStrapi as Core.Strapi);

      expect(config.isEnabled()).toBe(false);
    });

    test('should return false when both are false', () => {
      configGetSpy.mockImplementation((key, defaultValue) => {
        if (key === 'server.mcp.enabled') return false;
        if (key === 'autoReload') return false;
        return defaultValue;
      });

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

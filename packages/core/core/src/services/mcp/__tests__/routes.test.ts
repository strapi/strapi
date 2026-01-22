import type { Core } from '@strapi/types';
import { McpConfiguration } from '../internal/McpConfiguration';
import { createMcpRoutes } from '../index';

describe('MCP Routes', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockHandlers: {
    handlePost: Core.MiddlewareHandler;
    handleGet: Core.MiddlewareHandler;
    handleDelete: Core.MiddlewareHandler;
  };

  beforeEach(() => {
    mockStrapi = {
      config: {
        get: jest.fn((key, defaultValue) => defaultValue),
      } as any,
    };
    mockConfig = new McpConfiguration(mockStrapi as Core.Strapi);

    mockHandlers = {
      handlePost: jest.fn(),
      handleGet: jest.fn(),
      handleDelete: jest.fn(),
    };
  });

  describe('createMcpRoutes', () => {
    test('should create routes with correct structure', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes).toHaveLength(3);
      expect(routes).toEqual([
        {
          method: 'POST',
          path: mockConfig.path,
          handler: mockHandlers.handlePost,
          config: {
            auth: false,
          },
        },
        {
          method: 'GET',
          path: mockConfig.path,
          handler: mockHandlers.handleGet,
          config: {
            auth: false,
          },
        },
        {
          method: 'DELETE',
          path: mockConfig.path,
          handler: mockHandlers.handleDelete,
          config: {
            auth: false,
          },
        },
      ]);
    });

    test('should use path from config', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes[0].path).toBe('/mcp');
      expect(routes[1].path).toBe('/mcp');
      expect(routes[2].path).toBe('/mcp');
    });

    test('should disable auth for all routes', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      routes.forEach((route) => {
        expect(route.config?.auth).toBe(false);
      });
    });

    test('should have correct HTTP methods', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes[0].method).toBe('POST');
      expect(routes[1].method).toBe('GET');
      expect(routes[2].method).toBe('DELETE');
    });

    test('should assign correct handlers', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes[0].handler).toBe(mockHandlers.handlePost);
      expect(routes[1].handler).toBe(mockHandlers.handleGet);
      expect(routes[2].handler).toBe(mockHandlers.handleDelete);
    });
  });

  describe('route configuration', () => {
    test('should use default path when config does not override', () => {
      const defaultStrapi = {
        config: {
          get: jest.fn((key, defaultValue) => defaultValue),
        } as any,
      };
      const defaultConfig = new McpConfiguration(defaultStrapi as Core.Strapi);
      const routes = createMcpRoutes(defaultConfig, mockHandlers);

      expect(routes[0].path).toBe('/mcp');
    });

    test('should create routes with hardcoded /mcp path', () => {
      // Path is currently hardcoded in McpConfiguration
      const strapi = {
        config: {
          get: jest.fn((key, defaultValue) => defaultValue),
        } as any,
      };
      const config = new McpConfiguration(strapi as Core.Strapi);
      const routes = createMcpRoutes(config, mockHandlers);

      routes.forEach((route) => {
        expect(route.path).toBe('/mcp');
      });
    });
  });

  describe('handler assignment', () => {
    test('should not mutate handlers object', () => {
      const originalHandlers = { ...mockHandlers };

      createMcpRoutes(mockConfig, mockHandlers);

      expect(mockHandlers).toEqual(originalHandlers);
    });

    test('should create independent route objects', () => {
      const routes1 = createMcpRoutes(mockConfig, mockHandlers);
      const routes2 = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes1).not.toBe(routes2);
      expect(routes1[0]).not.toBe(routes2[0]);
    });
  });
});

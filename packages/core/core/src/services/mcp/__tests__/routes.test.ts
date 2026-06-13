import type { Core } from '@strapi/types';
import { McpConfiguration } from '../internal/McpConfiguration';

import { type McpRouteHandlers, createMcpRoutes } from '../routes';

describe('MCP Routes', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockConfig: McpConfiguration;
  let mockHandlers: McpRouteHandlers;

  beforeEach(() => {
    mockStrapi = {
      config: {
        get: jest.fn((key, defaultValue) => defaultValue),
      } as any,
    };
    mockConfig = new McpConfiguration(mockStrapi as Core.Strapi);

    mockHandlers = {
      handlePost: jest.fn(),
    };
  });

  describe('createMcpRoutes', () => {
    test('should create routes with correct structure', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes).toHaveLength(5);
      expect(routes).toStrictEqual([
        {
          method: 'POST',
          path: '/mcp',
          handler: expect.any(Function),
          config: {
            auth: false,
          },
        },
        {
          method: 'GET',
          path: '/mcp',
          handler: expect.any(Function),
          config: {
            auth: false,
          },
        },
        {
          method: 'DELETE',
          path: '/mcp',
          handler: expect.any(Function),
          config: {
            auth: false,
          },
        },
        {
          method: 'PUT',
          path: '/mcp',
          handler: expect.any(Function),
          config: {
            auth: false,
          },
        },
        {
          method: 'PATCH',
          path: '/mcp',
          handler: expect.any(Function),
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
      expect(routes[3].method).toBe('PUT');
      expect(routes[4].method).toBe('PATCH');
    });

    test('should assign correct handlers', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      expect(routes[0].handler).toBe(mockHandlers.handlePost);
    });

    test('should use the same internal handler for all non-POST methods', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      const nonPostHandlers = routes.slice(1).map((r) => r.handler);
      const [first, ...rest] = nonPostHandlers;
      rest.forEach((h) => expect(h).toBe(first));
    });

    test('should have handleMethodNotAllowed set ctx.respond = false and send Allow header via res.setHeader', async () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);
      const nonPostHandler = routes[1].handler as Core.MiddlewareHandler;

      const setHeaderSpy = jest.fn();
      const writeHeadSpy = jest.fn();
      const endSpy = jest.fn();
      const ctx = {
        respond: true,
        res: {
          headersSent: false,
          setHeader: setHeaderSpy,
          writeHead: writeHeadSpy,
          end: endSpy,
        },
      } as any;

      await nonPostHandler(ctx, () => Promise.resolve());

      expect(ctx.respond).toBe(false);
      expect(setHeaderSpy).toHaveBeenCalledWith('Allow', 'POST');
    });

    test('should not include OAuth discovery routes', () => {
      const routes = createMcpRoutes(mockConfig, mockHandlers);

      const oauthPaths = routes.filter(
        (r) =>
          r.path === '/.well-known/oauth-authorization-server' ||
          r.path === '/.well-known/openid-configuration' ||
          r.path === '/register'
      );
      expect(oauthPaths).toHaveLength(0);
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

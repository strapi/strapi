import type { Core } from '@strapi/types';
import { createMcpService } from '../index';

jest.mock('../utils/createManagedInterval', () => ({
  createManagedInterval: () => ({
    start: jest.fn(),
    clear: jest.fn(),
  }),
}));

describe('MCP Service Integration', () => {
  let mockStrapi: Partial<Core.Strapi>;
  let mockServerRoutes: jest.Mock;
  let logDebugSpy: jest.Mock;
  let logInfoSpy: jest.Mock;
  let logErrorSpy: jest.Mock;

  beforeEach(() => {
    logDebugSpy = jest.fn();
    logInfoSpy = jest.fn();
    logErrorSpy = jest.fn();
    mockServerRoutes = jest.fn();

    mockStrapi = {
      log: {
        debug: logDebugSpy,
        info: logInfoSpy,
        error: logErrorSpy,
      } as any,
      config: {
        get: jest.fn((key, defaultValue) => {
          if (key === 'server.mcp.enabled') {
            return true;
          }
          if (key === 'autoReload') {
            return true; // Required for isEnabled() to return true
          }
          if (key === 'server.url') {
            return 'http://localhost:1337';
          }
          return defaultValue;
        }),
      } as any,
      server: {
        routes: mockServerRoutes,
      } as any,
    };
  });

  describe('route registration on start', () => {
    test('should register all three routes when service starts', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      expect(mockServerRoutes).toHaveBeenCalledTimes(1);
      const registeredRoutes = mockServerRoutes.mock.calls[0][0];

      expect(registeredRoutes).toHaveLength(3);
    });

    test('should register POST route with correct configuration', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      const registeredRoutes = mockServerRoutes.mock.calls[0][0];
      const postRoute = registeredRoutes.find((r: any) => r.method === 'POST');

      expect(postRoute).toBeDefined();
      expect(postRoute.path).toBe('/mcp');
      expect(postRoute.config.auth).toBe(false);
      expect(typeof postRoute.handler).toBe('function');
    });

    test('should register GET route with correct configuration', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      const registeredRoutes = mockServerRoutes.mock.calls[0][0];
      const getRoute = registeredRoutes.find((r: any) => r.method === 'GET');

      expect(getRoute).toBeDefined();
      expect(getRoute.path).toBe('/mcp');
      expect(getRoute.config.auth).toBe(false);
      expect(typeof getRoute.handler).toBe('function');
    });

    test('should register DELETE route with correct configuration', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      const registeredRoutes = mockServerRoutes.mock.calls[0][0];
      const deleteRoute = registeredRoutes.find((r: any) => r.method === 'DELETE');

      expect(deleteRoute).toBeDefined();
      expect(deleteRoute.path).toBe('/mcp');
      expect(deleteRoute.config.auth).toBe(false);
      expect(typeof deleteRoute.handler).toBe('function');
    });

    test('should use hardcoded /mcp path', async () => {
      // Path is currently hardcoded in McpConfiguration
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      const registeredRoutes = mockServerRoutes.mock.calls[0][0];

      registeredRoutes.forEach((route: any) => {
        expect(route.path).toBe('/mcp');
      });
    });

    test('should not register routes when service is disabled', async () => {
      const disabledStrapi = {
        ...mockStrapi,
        config: {
          get: jest.fn((key: string, defaultValue?: any) => {
            if (key === 'server.mcp.enabled') {
              return false;
            }
            if (key === 'autoReload') {
              return false; // Disabled will also require autoReload to be false
            }
            return defaultValue;
          }),
        } as any,
      };

      const service = createMcpService(disabledStrapi as Core.Strapi);

      await service.start();

      expect(mockServerRoutes).not.toHaveBeenCalled();
      expect(logDebugSpy).toHaveBeenCalledWith('[MCP] Server is disabled');
    });

    test('should log correct endpoint URL after starting', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      expect(logInfoSpy).toHaveBeenCalledWith(
        '[MCP] Server available at http://localhost:1337/mcp'
      );
    });
  });

  describe('route authentication', () => {
    test('should disable authentication for all routes', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      const registeredRoutes = mockServerRoutes.mock.calls[0][0];

      registeredRoutes.forEach((route: any) => {
        expect(route.config).toBeDefined();
        expect(route.config.auth).toBe(false);
      });
    });
  });

  describe('service state management', () => {
    test('should update status to running after registering routes', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      expect(service.isRunning()).toBe(false);

      await service.start();

      expect(service.isRunning()).toBe(true);
    });

    test('should prevent registration before routes are registered', () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      // Tools can be registered before start
      expect(() => {
        service.registerTool({
          name: 'test-tool',
          title: 'Test Tool',
          description: 'Test tool',
          outputSchema: {} as any,
          devModeOnly: true,
          createHandler: jest.fn(),
        });
      }).not.toThrow();
    });

    test('should throw when registering a non-devModeOnly capability without auth', () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      expect(() => {
        service.registerTool(
          // @ts-expect-error - testing invalid tool registration
          {
            name: 'invalid-tool',
            title: 'Invalid Tool',
            description: 'Missing auth and not dev-only',
            outputSchema: {} as any,
            createHandler: jest.fn(),
          }
        );
      }).toThrow(
        '[MCP] tool "invalid-tool" must declare either devModeOnly === true or an auth requirement'
      );
    });

    test('should throw error when registering tools after start', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      expect(() => {
        service.registerTool({
          name: 'test-tool',
          title: 'Test Tool',
          description: 'Test tool',
          outputSchema: {} as any,
          devModeOnly: true,
          createHandler: jest.fn(),
        });
      }).toThrow('[MCP] Tools must be registered before MCP server starts');
    });
  });

  describe('error state handling', () => {
    test('should handle start/stop lifecycle correctly', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      // Start service
      await service.start();
      expect(mockServerRoutes).toHaveBeenCalledTimes(1);
      expect(service.isRunning()).toBe(true);

      // Stop service successfully
      await service.stop();
      expect(service.isRunning()).toBe(false);

      // Should be able to start again after clean stop
      await service.start();
      expect(mockServerRoutes).toHaveBeenCalledTimes(2);
      expect(service.isRunning()).toBe(true);
    });

    test('should prevent starting twice in a row', async () => {
      const service = createMcpService(mockStrapi as Core.Strapi);

      await service.start();

      // Try to start again without stopping
      await expect(service.start()).rejects.toThrow('[MCP] Server already started or starting');
    });
  });
});

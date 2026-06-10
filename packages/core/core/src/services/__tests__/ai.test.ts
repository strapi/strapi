import { createAiNamespace } from '../ai';

const createMockStrapi = (services: Record<string, unknown>) =>
  ({
    get: jest.fn((name: string) => {
      if (name in services) return services[name];
      throw new Error(`Could not resolve service ${name}`);
    }),
  }) as any;

describe('createAiNamespace', () => {
  it('returns a namespace with admin and mcp properties', () => {
    const ns = createAiNamespace(createMockStrapi({ 'ai.admin': {}, 'ai.mcp': {} }));
    expect(ns.admin).toBeDefined();
    expect(ns.mcp).toBeDefined();
  });

  describe('container delegation', () => {
    it('returns the services registered under ai.admin and ai.mcp', () => {
      const aiAdminService = {
        isEnabled: jest.fn().mockReturnValue(true),
        getAiToken: jest.fn(),
        getAiUsage: jest.fn(),
        getAiFeatureConfig: jest.fn(),
      };
      const mcpService = {
        isEnabled: jest.fn().mockReturnValue(true),
        isRunning: jest.fn().mockReturnValue(false),
        start: jest.fn(),
        stop: jest.fn(),
      };

      const ns = createAiNamespace(
        createMockStrapi({ 'ai.admin': aiAdminService, 'ai.mcp': mcpService })
      );
      expect(ns.admin).toBe(aiAdminService);
      expect(ns.mcp).toBe(mcpService);
    });

    it('calls get() on each access (no stale cache)', () => {
      const mockStrapi = createMockStrapi({ 'ai.admin': {}, 'ai.mcp': {} });
      const ns = createAiNamespace(mockStrapi);

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.admin;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.admin;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.mcp;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.mcp;

      expect(mockStrapi.get).toHaveBeenCalledTimes(4);
      expect(mockStrapi.get).toHaveBeenNthCalledWith(1, 'ai.admin');
      expect(mockStrapi.get).toHaveBeenNthCalledWith(2, 'ai.admin');
      expect(mockStrapi.get).toHaveBeenNthCalledWith(3, 'ai.mcp');
      expect(mockStrapi.get).toHaveBeenNthCalledWith(4, 'ai.mcp');
    });
  });
});

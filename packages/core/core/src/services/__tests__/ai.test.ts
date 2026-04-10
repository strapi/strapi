import { createAiNamespace } from '../ai';

const createMockStrapi = (aiAdminService?: unknown) =>
  ({
    get: jest.fn((name: string) => {
      if (name === 'ai.admin') return aiAdminService;
      throw new Error(`Could not resolve service ${name}`);
    }),
  }) as any;

describe('createAiNamespace', () => {
  it('returns a namespace with an admin property', () => {
    const ns = createAiNamespace(createMockStrapi({}));
    expect(ns.admin).toBeDefined();
  });

  describe('container delegation', () => {
    it('returns the service registered under ai.admin', () => {
      const aiAdminService = {
        isEnabled: jest.fn().mockReturnValue(true),
        getAiToken: jest.fn(),
        getAiUsage: jest.fn(),
        getAiFeatureConfig: jest.fn(),
      };

      const ns = createAiNamespace(createMockStrapi(aiAdminService));
      expect(ns.admin).toBe(aiAdminService);
    });

    it('calls get() on each access (no stale cache)', () => {
      const mockStrapi = createMockStrapi({});
      const ns = createAiNamespace(mockStrapi);

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.admin;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.admin;

      expect(mockStrapi.get).toHaveBeenCalledTimes(2);
    });
  });
});

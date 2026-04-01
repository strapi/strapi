import { createAiNamespace } from '../ai';

const createMockStrapi = (hasAiAdmin = false, aiAdminService?: unknown) =>
  ({
    get: jest.fn((name: string) => {
      if (name === 'ai.admin' && hasAiAdmin === true) return aiAdminService;
      throw new Error(`Could not resolve service ${name}`);
    }),
  }) as any;

describe('createAiNamespace', () => {
  it('returns a namespace with an admin property', () => {
    const ns = createAiNamespace(createMockStrapi());
    expect(ns.admin).toBeDefined();
  });

  describe('admin stub fallback (ai.admin not registered)', () => {
    it('isEnabled() returns false', () => {
      const ns = createAiNamespace(createMockStrapi());
      expect(ns.admin.isEnabled()).toBe(false);
    });

    it('getAiToken() rejects', async () => {
      const ns = createAiNamespace(createMockStrapi());
      await expect(ns.admin.getAiToken()).rejects.toThrow('AI admin service is not enabled');
    });

    it('getAiUsage() rejects', async () => {
      const ns = createAiNamespace(createMockStrapi());
      await expect(ns.admin.getAiUsage()).rejects.toThrow('AI admin service is not enabled');
    });

    it('getAIFeatureConfig() rejects', async () => {
      const ns = createAiNamespace(createMockStrapi());
      await expect(ns.admin.getAIFeatureConfig()).rejects.toThrow(
        'AI admin service is not enabled'
      );
    });
  });

  describe('container delegation (ai.admin registered)', () => {
    it('returns the registered service from the container', () => {
      const realService = {
        isEnabled: jest.fn().mockReturnValue(true),
        getAiToken: jest.fn(),
        getAiUsage: jest.fn(),
        getAIFeatureConfig: jest.fn(),
      };

      const ns = createAiNamespace(createMockStrapi(true, realService));
      expect(ns.admin).toBe(realService);
      expect(ns.admin.isEnabled()).toBe(true);
    });
  });

  describe('getter re-evaluation', () => {
    it('calls get() on each access (no stale cache)', () => {
      const mockStrapi = createMockStrapi();
      const ns = createAiNamespace(mockStrapi);

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.admin;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ns.admin;

      expect(mockStrapi.get).toHaveBeenCalledTimes(2);
    });
  });
});

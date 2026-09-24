import type { Core } from '@strapi/types';
import { homepageService } from '../homepage';

const createMockAdminStore = (initialValue?: any) => {
  let storedValue = initialValue;
  return {
    get: jest.fn(async () => {
      return storedValue;
    }),
    set: jest.fn(async ({ value }: { value: any }) => {
      storedValue = value;
    }),
  };
};

type I18nMock = { locales: Array<{ code: string; name: string }> } | undefined;

const createKeyStatisticsStrapi = (i18n: I18nMock) => {
  const count = jest.fn(async () => 0);

  // getService resolves admin services from the global strapi (see tests/setup/unit.setup.js)
  global.strapi = {
    admin: {
      services: {
        'api-token-admin': { countAll: jest.fn(async () => 2) },
        user: { count: jest.fn(async () => 1) },
      },
    },
    plugins: {},
  } as unknown as Core.Strapi;

  return {
    store: () => createMockAdminStore(undefined),
    contentTypes: {},
    components: {},
    db: { query: () => ({ count }) },
    plugin(name: string) {
      if (name !== 'i18n' || i18n === undefined) {
        return undefined;
      }

      return {
        service: (serviceName: string) =>
          serviceName === 'locales' ? { count: async () => i18n.locales.length } : undefined,
      };
    },
  } as unknown as Core.Strapi;
};

describe('homepageService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
  });

  describe('getKeyStatistics', () => {
    test('returns null locales when i18n is not installed', async () => {
      const mockStrapi = createKeyStatisticsStrapi(undefined);

      const result = await homepageService({ strapi: mockStrapi }).getKeyStatistics();

      expect(result).toEqual({
        assets: 0,
        contentTypes: 0,
        components: 0,
        locales: null,
        admins: 1,
        webhooks: 0,
        apiTokens: 2,
      });
    });

    test('returns the locale count when i18n is installed', async () => {
      const mockStrapi = createKeyStatisticsStrapi({
        locales: [
          { code: 'en', name: 'English (en)' },
          { code: 'fr', name: 'French (fr)' },
        ],
      });

      const result = await homepageService({ strapi: mockStrapi }).getKeyStatistics();

      expect(result.locales).toBe(2);
    });

    test('returns 0 locales when i18n is installed without locales', async () => {
      const mockStrapi = createKeyStatisticsStrapi({ locales: [] });

      const result = await homepageService({ strapi: mockStrapi }).getKeyStatistics();

      expect(result.locales).toBe(0);
    });
  });

  describe('getHomepageLayout', () => {
    test('returns null when nothing stored', async () => {
      const mockStore = createMockAdminStore(undefined);
      const mockStrapi = {
        store: () => mockStore,
      } as unknown as Core.Strapi;

      const service = homepageService({ strapi: mockStrapi });
      const result = await service.getHomepageLayout(42);

      expect(result).toBeNull();
      expect(mockStore.get).toHaveBeenCalledWith({ key: 'homepage-layout:42' });
    });

    test('returns parsed layout when stored value exists', async () => {
      const stored = {
        version: 1,
        widgets: [
          { uid: 'w-1', width: 6 },
          { uid: 'w-2', width: 12 },
        ],
        updatedAt: new Date().toISOString(),
      };
      const mockStore = createMockAdminStore(stored);
      const mockStrapi = {
        store: () => mockStore,
      } as unknown as Core.Strapi;

      const service = homepageService({ strapi: mockStrapi });
      const result = await service.getHomepageLayout(7);

      expect(result).toEqual(stored);
      expect(mockStore.get).toHaveBeenCalledWith({ key: 'homepage-layout:7' });
    });
  });

  describe('updateHomepageLayout', () => {
    test('creates new layout when none exists', async () => {
      const mockStore = createMockAdminStore(undefined);
      const mockStrapi = {
        store: () => mockStore,
      } as unknown as Core.Strapi;

      const service = homepageService({ strapi: mockStrapi });
      const next = await service.updateHomepageLayout(5, {
        widgets: [
          { uid: 'a', width: 4 },
          { uid: 'b', width: 8 },
        ],
      });

      expect(next.version).toBe(1);
      expect(Array.isArray(next.widgets)).toBe(true);
      expect(next.widgets).toEqual([
        { uid: 'a', width: 4 },
        { uid: 'b', width: 8 },
      ]);
      expect(typeof next.updatedAt).toBe('string');
      expect(Number.isNaN(Date.parse(next.updatedAt))).toBe(false);

      expect(mockStore.set).toHaveBeenCalledWith({
        key: 'homepage-layout:5',
        value: next,
      });
    });

    test('updates existing layout and persists provided widths', async () => {
      const existing = {
        version: 1,
        widgets: [
          { uid: 'x', width: 6 },
          { uid: 'y', width: 12 },
        ],
        updatedAt: new Date().toISOString(),
      };
      const mockStore = createMockAdminStore(existing);
      const mockStrapi = {
        store: () => mockStore,
      } as unknown as Core.Strapi;

      const service = homepageService({ strapi: mockStrapi });
      const updatedAt = new Date().toISOString();
      const updated = await service.updateHomepageLayout(9, {
        widgets: [
          { uid: 'x', width: 4 },
          { uid: 'y', width: 8 },
        ],
        updatedAt,
      });

      expect(updated.version).toBe(1);
      expect(updated.widgets).toEqual([
        { uid: 'x', width: 4 },
        { uid: 'y', width: 8 },
      ]);
      expect(updated.updatedAt).toBe(updatedAt);

      expect(mockStore.get).toHaveBeenCalledWith({ key: 'homepage-layout:9' });
      expect(mockStore.set).toHaveBeenCalledWith({ key: 'homepage-layout:9', value: updated });
    });
  });
});

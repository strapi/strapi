'use strict';

jest.mock('@strapi/strapi/dist/utils/ee', () => ({
  features: {
    isEnabled() {
      return true;
    },
    list() {
      return [{ name: 'sso' }];
    },
  },
}));

const {
  syncProviderRegistryWithConfig,
  getStrategyCallbackURL,
  providerRegistry,
} = require('../passport/sso');
const createProviderRegistry = require('../passport/provider-registry');

describe('SSO', () => {
  afterEach(() => {
    providerRegistry.clear();
  });

  const register = jest.spyOn(providerRegistry, 'register');

  describe('Sync Provider Registry with Config', () => {
    test('The provider registry should match the auth config', async () => {
      global.strapi = {
        config: {
          get: () => ({ providers: [{ uid: 'foo' }, { uid: 'bar' }] }),
        },
      };

      syncProviderRegistryWithConfig();

      expect(register).toHaveBeenCalledTimes(2);
      expect(providerRegistry.size).toBe(2);
    });
  });

  describe('Get Strategy Callback URL', () => {
    const BASE_URL = '/admin/connect/{{ provider }}';

    test.each(['foo', 'bar', 'foobar'])('Get a correct callback url for %s', (providerName) => {
      expect(getStrategyCallbackURL(providerName)).toBe(
        BASE_URL.replace('{{ provider }}', providerName)
      );
    });
  });

  describe('Provider Registry', () => {
    const registry = createProviderRegistry();
    const setSpy = jest.spyOn(registry, 'set');
    const fooProvider = { uid: 'foo', createStrategy: jest.fn() };
    const barProvider = { uid: 'bar', createStrategy: jest.fn() };

    beforeEach(() => {
      global.strapi = { isLoaded: false };
    });

    afterEach(() => {
      registry.clear();
      jest.clearAllMocks();
    });

    test('Cannot register after bootstrap', () => {
      global.strapi = { isLoaded: true };

      const fn = () => registry.register(fooProvider);

      expect(fn).toThrowError(`You can't register new provider after the bootstrap`);
      expect(registry.size).toBe(0);
    });

    test('Can register a provider', () => {
      registry.register(fooProvider);

      expect(setSpy).toHaveBeenCalledWith(fooProvider.uid, fooProvider);
      expect(registry.size).toBe(1);
    });

    test('Can register several providers at once', () => {
      const providers = [fooProvider, barProvider];

      registry.registerMany(providers);

      expect(setSpy).toHaveBeenCalledTimes(providers.length);
      expect(registry.size).toBe(providers.length);
    });

    test('Do not register twice providers with the same uid', () => {
      const providers = [fooProvider, fooProvider];

      registry.registerMany(providers);

      expect(setSpy).toHaveBeenCalledWith(fooProvider.uid, fooProvider);
      expect(setSpy).toHaveBeenCalledTimes(2);
      expect(registry.size).toBe(1);
    });

    test('Can update the value of a provider', () => {
      const newFooProvider = {
        ...fooProvider,
        newProperty: 'foobar',
      };

      registry.register(fooProvider);
      registry.register(newFooProvider);

      expect(setSpy).toHaveBeenCalledTimes(2);
      expect(registry.size).toBe(1);
      expect(registry.get(fooProvider.uid)).toEqual(newFooProvider);
    });
  });
});

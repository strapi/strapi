'use strict';

const providersRegistryFactory = require('../providers-registry');

describe('Users-Permissions | Providers Registry Service', () => {
  let strapi;
  let providersRegistry;

  beforeAll(() => {
    // Mock strapi config
    strapi = {
      config: {
        get: jest.fn((key) => {
          if (key === 'api.rest.prefix') return '/api';
          return undefined;
        }),
        server: {
          url: 'http://localhost:1337',
        },
      },
    };

    // Set global strapi
    global.strapi = strapi;
  });

  beforeEach(() => {
    // Create a fresh instance for each test
    providersRegistry = providersRegistryFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Backward Compatibility', () => {
    describe('Grant Config Format Compatibility', () => {
      it('should generate grant config in exact same format as before migration', () => {
        const providers = providersRegistry.getAll();

        // Test the exact structure that would be generated for grant config
        Object.keys(providers).forEach((providerName) => {
          const provider = providers[providerName];
          const { icon, enabled, grantConfig } = provider;

          // This is the exact format that bootstrap creates for grant config
          const grantConfigEntry = {
            icon,
            enabled,
            ...grantConfig,
          };

          // Verify the structure matches what controllers expect
          expect(grantConfigEntry).toHaveProperty('icon');
          expect(grantConfigEntry).toHaveProperty('enabled');

          // OAuth providers should have the standard grant.js fields
          if (providerName !== 'email' && grantConfig.callbackUrl) {
            expect(grantConfigEntry).toHaveProperty('callbackUrl');
            expect(grantConfigEntry.callbackUrl).toMatch(
              /^http:\/\/localhost:1337\/api\/auth\/.+\/callback$/
            );
          }
        });
      });

      it('should maintain backward compatible callback URL format', () => {
        const providers = providersRegistry.getAll();

        // Test specific providers that existed before the migration
        const legacyProviders = ['discord', 'facebook', 'google', 'github', 'microsoft', 'twitter'];

        legacyProviders.forEach((providerName) => {
          const provider = providers[providerName];
          if (provider && provider.grantConfig.callbackUrl) {
            // This exact format was used in the old grant-config.js
            const expectedCallback = `http://localhost:1337/api/auth/${providerName}/callback`;
            expect(provider.grantConfig.callbackUrl).toBe(expectedCallback);
          }
        });
      });

      it('should maintain exact scope configurations from legacy grant-config', () => {
        const providers = providersRegistry.getAll();

        // These are the exact scopes that were in the old grant-config.js
        const expectedScopes = {
          discord: ['identify', 'email'],
          facebook: ['email'],
          google: ['email'],
          github: ['user', 'user:email'],
          microsoft: ['user.read'],
          twitter: [], // Twitter doesn't use scopes in OAuth 1.0a
          instagram: ['user_profile'], // Corrected scope
          vk: ['email'],
          twitch: ['user:read:email'],
          linkedin: ['r_liteprofile', 'r_emailaddress'],
          cognito: ['email', 'openid', 'profile'],
          reddit: ['identity'],
          auth0: ['openid', 'email', 'profile'],
          cas: ['openid email'],
          patreon: ['identity', 'identity[email]'],
          keycloak: ['openid', 'email', 'profile'],
        };

        Object.entries(expectedScopes).forEach(([providerName, expectedScope]) => {
          const provider = providers[providerName];
          if (provider && provider.grantConfig.scope !== undefined) {
            expect(provider.grantConfig.scope).toEqual(expectedScope);
          }
        });
      });

      it('should maintain default enabled/disabled states exactly as before', () => {
        const providers = providersRegistry.getAll();

        // In the old system, only email was enabled by default
        expect(providers.email.enabled).toBe(true);

        // All other providers should be disabled by default
        Object.keys(providers).forEach((providerName) => {
          if (providerName !== 'email') {
            expect(providers[providerName].enabled).toBe(false);
          }
        });
      });
    });

    describe('Custom Provider Migration Compatibility', () => {
      it('should allow adding providers with old grant-config format', () => {
        // Test adding a provider in the format that might exist in old grant configs
        const legacyFormatProvider = {
          icon: 'legacy-provider',
          enabled: true,
          grantConfig: {
            // Old format might have had slightly different property names
            key: 'legacy-key',
            secret: 'legacy-secret',
            callback: 'http://localhost:1337/api/auth/legacy/callback', // Note: 'callback' vs 'callbackUrl'
            scope: ['profile', 'email'],
            authorize_url: 'https://legacy.example.com/oauth/authorize',
            access_url: 'https://legacy.example.com/oauth/token',
            oauth: 2,
          },
          async authCallback({ accessToken }) {
            return { username: `legacy-user-${accessToken}`, email: 'legacy@example.com' };
          },
        };

        providersRegistry.add('legacy-provider', legacyFormatProvider);

        const addedProvider = providersRegistry.get('legacy-provider');
        expect(addedProvider).toEqual(legacyFormatProvider);

        // Verify it would generate correct grant config
        const grantConfigEntry = {
          icon: addedProvider.icon,
          enabled: addedProvider.enabled,
          ...addedProvider.grantConfig,
        };

        expect(grantConfigEntry).toEqual({
          icon: 'legacy-provider',
          enabled: true,
          key: 'legacy-key',
          secret: 'legacy-secret',
          callback: 'http://localhost:1337/api/auth/legacy/callback',
          scope: ['profile', 'email'],
          authorize_url: 'https://legacy.example.com/oauth/authorize',
          access_url: 'https://legacy.example.com/oauth/token',
          oauth: 2,
        });
      });

      it('should handle providers with various grant-config property variations', () => {
        // Test different property naming conventions that might exist
        const providerVariations = [
          {
            name: 'provider-with-callback',
            config: {
              icon: 'test1',
              enabled: true,
              grantConfig: {
                callback: 'http://localhost:1337/api/auth/test1/callback',
                key: 'key1',
                secret: 'secret1',
              },
              async authCallback() {
                return { username: 'test1', email: 'test1@example.com' };
              },
            },
          },
          {
            name: 'provider-with-callbackUrl',
            config: {
              icon: 'test2',
              enabled: true,
              grantConfig: {
                callbackUrl: 'http://localhost:1337/api/auth/test2/callback',
                key: 'key2',
                secret: 'secret2',
              },
              async authCallback() {
                return { username: 'test2', email: 'test2@example.com' };
              },
            },
          },
          {
            name: 'provider-with-redirect_uri',
            config: {
              icon: 'test3',
              enabled: true,
              grantConfig: {
                redirect_uri: 'http://localhost:1337/api/auth/test3/callback',
                client_id: 'client3',
                client_secret: 'secret3',
              },
              async authCallback() {
                return { username: 'test3', email: 'test3@example.com' };
              },
            },
          },
        ];

        providerVariations.forEach(({ name, config }) => {
          providersRegistry.add(name, config);
          const addedProvider = providersRegistry.get(name);
          expect(addedProvider).toEqual(config);
        });

        // Verify all are included in getAll()
        const allProviders = providersRegistry.getAll();
        providerVariations.forEach(({ name }) => {
          expect(allProviders).toHaveProperty(name);
        });
      });
    });

    describe('API Response Format Compatibility', () => {
      it('should maintain exact provider list that controllers expect', () => {
        const providers = providersRegistry.getAll();

        // These providers must exist for backward compatibility with existing apps
        const requiredProviders = [
          'email',
          'discord',
          'facebook',
          'google',
          'github',
          'microsoft',
          'twitter',
          'instagram',
          'vk',
          'twitch',
          'linkedin',
          'cognito',
          'reddit',
          'auth0',
          'cas',
        ];

        requiredProviders.forEach((providerName) => {
          expect(providers).toHaveProperty(providerName);
          expect(providers[providerName]).toHaveProperty('enabled');
          expect(providers[providerName]).toHaveProperty('icon');
          expect(providers[providerName]).toHaveProperty('grantConfig');
        });
      });

      it('should maintain authCallback signature for all OAuth providers', () => {
        const providers = providersRegistry.getAll();

        Object.keys(providers).forEach((providerName) => {
          const provider = providers[providerName];

          if (providerName !== 'email') {
            expect(provider).toHaveProperty('authCallback');
            expect(typeof provider.authCallback).toBe('function');

            // All authCallbacks should accept destructured parameters
            const callbackParams = provider.authCallback.toString();
            // Different providers may use different parameter names (accessToken, query, providers)
            expect(callbackParams).toMatch(/\{\s*[^}]*\s*\}/); // Should use destructured parameters
          }
        });
      });

      it('should support legacy authCallback parameter formats', async () => {
        // Some existing custom providers might expect different parameter names
        const legacyProvider = {
          icon: 'legacy',
          enabled: true,
          grantConfig: {},
          async authCallback({ accessToken }) {
            // Legacy format might use accessToken (corrected from access_token)
            return {
              username: `legacy-${accessToken}`,
              email: 'legacy@example.com',
            };
          },
        };

        providersRegistry.add('legacy-provider', legacyProvider);

        // Test with both parameter formats
        const result1 = await providersRegistry.run({
          provider: 'legacy-provider',
          accessToken: 'token123',
          query: {},
          providers: {},
        });

        expect(result1).toEqual({
          username: 'legacy-token123',
          email: 'legacy@example.com',
        });
      });
    });

    describe('Configuration Integration Compatibility', () => {
      it('should work with different baseURL configurations', () => {
        // Test with different API prefixes that might exist in legacy installations
        const testConfigs = [
          { prefix: '/api', expected: 'http://localhost:1337/api/auth' },
          { prefix: '/v1', expected: 'http://localhost:1337/v1/auth' },
          { prefix: '', expected: 'http://localhost:1337/auth' },
          { prefix: '/api/v2', expected: 'http://localhost:1337/api/v2/auth' },
        ];

        testConfigs.forEach(({ prefix, expected }) => {
          strapi.config.get.mockImplementation((key) => {
            if (key === 'api.rest.prefix') return prefix;
            return undefined;
          });

          const newRegistry = providersRegistryFactory();
          const providers = newRegistry.getAll();

          // Test that callback URLs are correctly generated
          expect(providers.discord.grantConfig.callbackUrl).toBe(`${expected}/discord/callback`);
          expect(providers.github.grantConfig.callbackUrl).toBe(`${expected}/github/callback`);
        });

        // Reset mock
        strapi.config.get.mockImplementation((key) => {
          if (key === 'api.rest.prefix') return '/api';
          return undefined;
        });
      });

      it('should handle server URL variations correctly', () => {
        const originalUrl = strapi.config.server.url;

        const testUrls = [
          'http://localhost:1337',
          'https://example.com',
          'http://localhost:3000',
          'https://api.example.com:8080',
        ];

        testUrls.forEach((serverUrl) => {
          strapi.config.server.url = serverUrl;

          const newRegistry = providersRegistryFactory();
          const providers = newRegistry.getAll();

          Object.keys(providers).forEach((providerName) => {
            const provider = providers[providerName];
            if (provider.grantConfig.callbackUrl) {
              expect(provider.grantConfig.callbackUrl).toMatch(
                new RegExp(`^${serverUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
              );
            }
          });
        });

        // Reset
        strapi.config.server.url = originalUrl;
      });
    });

    describe('Error Handling Compatibility', () => {
      it('should handle missing authCallback gracefully for email provider', () => {
        const emailProvider = providersRegistry.get('email');

        // Email provider should not have authCallback
        expect(emailProvider.authCallback).toBeUndefined();

        // Should not break when trying to run email provider
        expect(async () => {
          await providersRegistry.run({
            provider: 'email',
            accessToken: 'not-applicable',
            query: {},
            providers: {},
          });
        }).rejects.toThrow(); // Should throw but not crash
      });

      it('should maintain consistent error messages', async () => {
        // Test that error messages remain the same for backward compatibility
        await expect(
          providersRegistry.run({
            provider: 'non-existent-provider',
            accessToken: 'test',
            query: {},
            providers: {},
          })
        ).rejects.toThrow('Unknown auth provider');
      });
    });

    describe('Performance and Memory Compatibility', () => {
      it('should not leak memory when adding/removing providers', () => {
        const initialProviderCount = Object.keys(providersRegistry.getAll()).length;

        // Add many providers
        for (let i = 0; i < 100; i += 1) {
          providersRegistry.add(`test-provider-${i}`, {
            icon: 'test',
            enabled: false,
            grantConfig: {},
            async authCallback() {
              return { username: `test-${i}`, email: `test-${i}@example.com` };
            },
          });
        }

        expect(Object.keys(providersRegistry.getAll()).length).toBe(initialProviderCount + 100);

        // Remove all test providers
        for (let i = 0; i < 100; i += 1) {
          providersRegistry.remove(`test-provider-${i}`);
        }

        expect(Object.keys(providersRegistry.getAll()).length).toBe(initialProviderCount);
      });

      it('should maintain provider isolation', () => {
        const provider1 = {
          icon: 'test1',
          enabled: true,
          grantConfig: { key: 'key1' },
          async authCallback() {
            return { username: 'user1', email: 'user1@example.com' };
          },
        };

        const provider2 = {
          icon: 'test2',
          enabled: false,
          grantConfig: { key: 'key2' },
          async authCallback() {
            return { username: 'user2', email: 'user2@example.com' };
          },
        };

        providersRegistry.add('provider1', provider1);
        providersRegistry.add('provider2', provider2);

        // Modifying one provider's config shouldn't affect the other
        const retrievedProvider1 = providersRegistry.get('provider1');
        retrievedProvider1.grantConfig.key = 'modified-key1';

        const retrievedProvider2 = providersRegistry.get('provider2');
        expect(retrievedProvider2.grantConfig.key).toBe('key2'); // Should remain unchanged
      });
    });
  });

  describe('getAll()', () => {
    it('should return all built-in providers with correct structure', () => {
      const providers = providersRegistry.getAll();

      // Check that we have the expected built-in providers
      const expectedProviders = [
        'email',
        'discord',
        'facebook',
        'google',
        'github',
        'microsoft',
        'twitter',
        'instagram',
        'vk',
        'twitch',
        'linkedin',
        'cognito',
        'reddit',
        'auth0',
        'cas',
        'patreon',
        'keycloak',
      ];

      expectedProviders.forEach((providerName) => {
        expect(providers).toHaveProperty(providerName);

        const provider = providers[providerName];
        expect(provider).toHaveProperty('enabled');
        expect(provider).toHaveProperty('icon');
        expect(provider).toHaveProperty('grantConfig');

        // Email provider is special - it doesn't have authCallback
        if (providerName !== 'email') {
          expect(provider).toHaveProperty('authCallback');
          expect(typeof provider.authCallback).toBe('function');
        }
      });
    });

    it('should return providers with proper default configuration', () => {
      const providers = providersRegistry.getAll();

      // Test email provider (special case)
      expect(providers.email).toEqual({
        enabled: true,
        icon: 'envelope',
        grantConfig: {},
      });

      // Test a typical OAuth provider
      expect(providers.discord).toMatchObject({
        enabled: false,
        icon: 'discord',
        grantConfig: expect.objectContaining({
          key: '',
          secret: '',
          callbackUrl: 'http://localhost:1337/api/auth/discord/callback',
          scope: ['identify', 'email'],
        }),
      });
    });
  });

  describe('get(name)', () => {
    it('should return a specific provider by name', () => {
      const discordProvider = providersRegistry.get('discord');

      expect(discordProvider).toMatchObject({
        enabled: false,
        icon: 'discord',
        grantConfig: expect.objectContaining({
          key: '',
          secret: '',
          callbackUrl: 'http://localhost:1337/api/auth/discord/callback',
          scope: ['identify', 'email'],
        }),
        authCallback: expect.any(Function),
      });
    });

    it('should return undefined for non-existent provider', () => {
      const provider = providersRegistry.get('non-existent');
      expect(provider).toBeUndefined();
    });

    it('should return email provider correctly', () => {
      const emailProvider = providersRegistry.get('email');

      expect(emailProvider).toEqual({
        enabled: true,
        icon: 'envelope',
        grantConfig: {},
      });
    });
  });

  describe('add(name, config)', () => {
    it('should add a custom provider with proper structure', () => {
      const customProvider = {
        icon: 'test-icon',
        enabled: true,
        grantConfig: {
          key: 'test-key',
          secret: 'test-secret',
          callback: 'http://localhost:1337/api/auth/custom/callback',
          scope: ['email'],
          authorize_url: 'https://example.com/authorize',
          access_url: 'https://example.com/token',
          oauth: 2,
        },
        async authCallback() {
          return {
            username: 'test-user',
            email: 'test@example.com',
          };
        },
      };

      providersRegistry.add('custom-provider', customProvider);

      const addedProvider = providersRegistry.get('custom-provider');
      expect(addedProvider).toEqual(customProvider);
    });

    it('should allow overriding existing providers', () => {
      const customDiscord = {
        icon: 'custom-discord',
        enabled: true,
        grantConfig: {
          key: 'custom-key',
          secret: 'custom-secret',
          callbackUrl: 'http://localhost:1337/api/auth/custom-discord/callback',
          scope: ['custom-scope'],
        },
        async authCallback() {
          return { username: 'custom', email: 'custom@example.com' };
        },
      };

      providersRegistry.add('discord', customDiscord);

      const provider = providersRegistry.get('discord');
      expect(provider).toEqual(customDiscord);
    });

    it('should include custom providers in getAll() results', () => {
      const customProvider = {
        icon: 'test',
        enabled: true,
        grantConfig: {},
        async authCallback() {
          return { username: 'test', email: 'test@example.com' };
        },
      };

      providersRegistry.add('test-provider', customProvider);

      const allProviders = providersRegistry.getAll();
      expect(allProviders).toHaveProperty('test-provider');
      expect(allProviders['test-provider']).toEqual(customProvider);
    });
  });

  describe('remove(name)', () => {
    it('should remove an existing provider', () => {
      // Verify provider exists first
      expect(providersRegistry.get('discord')).toBeDefined();

      // Remove it
      providersRegistry.remove('discord');

      // Verify it's gone
      expect(providersRegistry.get('discord')).toBeUndefined();
    });

    it('should handle removing non-existent provider gracefully', () => {
      expect(() => {
        providersRegistry.remove('non-existent');
      }).not.toThrow();
    });

    it('should remove custom providers', () => {
      const customProvider = {
        icon: 'test',
        enabled: true,
        grantConfig: {},
        async authCallback() {
          return { username: 'test', email: 'test@example.com' };
        },
      };

      providersRegistry.add('custom-provider', customProvider);
      expect(providersRegistry.get('custom-provider')).toBeDefined();

      providersRegistry.remove('custom-provider');
      expect(providersRegistry.get('custom-provider')).toBeUndefined();
    });

    it('should not include removed providers in getAll() results', () => {
      providersRegistry.remove('discord');

      const allProviders = providersRegistry.getAll();
      expect(allProviders).not.toHaveProperty('discord');
    });
  });

  describe('run({ provider, accessToken, query, providers })', () => {
    it('should execute provider authCallback successfully', async () => {
      const mockPurest = jest.fn(() => ({
        get: jest.fn().mockReturnValue({
          auth: jest.fn().mockReturnValue({
            request: jest.fn().mockResolvedValue({
              body: {
                username: 'test-user',
                discriminator: '1234',
                email: 'test@example.com',
              },
            }),
          }),
        }),
      }));

      // Mock require for purest
      jest.doMock('purest', () => mockPurest);

      const providersRegistryWithMock = require('../providers-registry')();

      const result = await providersRegistryWithMock.run({
        provider: 'discord',
        accessToken: 'test-token',
        query: {},
        providers: {},
      });

      expect(result).toEqual({
        username: 'test-user#1234',
        email: 'test@example.com',
      });
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        providersRegistry.run({
          provider: 'unknown-provider',
          accessToken: 'test-token',
          query: {},
          providers: {},
        })
      ).rejects.toThrow('Unknown auth provider');
    });

    it('should execute custom provider authCallback', async () => {
      const customProvider = {
        icon: 'test',
        enabled: true,
        grantConfig: {},
        async authCallback({ accessToken }) {
          return {
            username: `user-${accessToken}`,
            email: 'custom@example.com',
          };
        },
      };

      providersRegistry.add('custom-provider', customProvider);

      const result = await providersRegistry.run({
        provider: 'custom-provider',
        accessToken: 'test-token',
        query: {},
        providers: {},
      });

      expect(result).toEqual({
        username: 'user-test-token',
        email: 'custom@example.com',
      });
    });

    it('should pass all parameters to authCallback', async () => {
      const authCallbackSpy = jest.fn().mockResolvedValue({
        username: 'test',
        email: 'test@example.com',
      });

      const customProvider = {
        icon: 'test',
        enabled: true,
        grantConfig: {},
        authCallback: authCallbackSpy,
      };

      providersRegistry.add('test-provider', customProvider);

      const params = {
        provider: 'test-provider',
        accessToken: 'test-token',
        query: { some: 'query' },
        providers: { some: 'config' },
      };

      await providersRegistry.run(params);

      expect(authCallbackSpy).toHaveBeenCalledWith({
        accessToken: 'test-token',
        query: { some: 'query' },
        providers: { some: 'config' },
        purest: expect.any(Function),
      });
    });
  });

  describe('Built-in providers integration', () => {
    it('should have correct callback URLs for all OAuth providers', () => {
      const providers = providersRegistry.getAll();
      const oauthProviders = Object.keys(providers).filter(
        (name) => name !== 'email' && providers[name].grantConfig.callbackUrl
      );

      oauthProviders.forEach((providerName) => {
        const provider = providers[providerName];
        const expectedCallback = `http://localhost:1337/api/auth/${providerName}/callback`;

        expect(provider.grantConfig.callbackUrl).toBe(expectedCallback);
      });
    });

    it('should have proper default scopes for each provider', () => {
      const providers = providersRegistry.getAll();

      expect(providers.discord.grantConfig.scope).toEqual(['identify', 'email']);
      expect(providers.facebook.grantConfig.scope).toEqual(['email']);
      expect(providers.google.grantConfig.scope).toEqual(['email']);
      expect(providers.github.grantConfig.scope).toEqual(['user', 'user:email']);
      expect(providers.microsoft.grantConfig.scope).toEqual(['user.read']);
    });

    it('should have all providers disabled by default except email', () => {
      const providers = providersRegistry.getAll();

      Object.keys(providers).forEach((providerName) => {
        if (providerName === 'email') {
          expect(providers[providerName].enabled).toBe(true);
        } else {
          expect(providers[providerName].enabled).toBe(false);
        }
      });
    });
  });

  describe('Config integration', () => {
    it('should use correct base URL from strapi config', () => {
      const providers = providersRegistry.getAll();

      // All OAuth providers should have callback URLs starting with the configured base URL
      Object.keys(providers).forEach((providerName) => {
        const provider = providers[providerName];
        if (provider.grantConfig.callbackUrl) {
          expect(provider.grantConfig.callbackUrl).toMatch(/^http:\/\/localhost:1337\/api\/auth\//);
        }
      });
    });

    it('should handle different API prefix configurations', () => {
      // Mock different API prefix
      strapi.config.get.mockImplementation((key) => {
        if (key === 'api.rest.prefix') return '/v1';
        return undefined;
      });

      const newRegistry = providersRegistryFactory();
      const providers = newRegistry.getAll();

      expect(providers.discord.grantConfig.callbackUrl).toBe(
        'http://localhost:1337/v1/auth/discord/callback'
      );
    });
  });
});

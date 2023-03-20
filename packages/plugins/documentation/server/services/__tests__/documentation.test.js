'use strict';

const fse = require('fs-extra');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { api, plugins, components, contentTypes } = require('../__mocks__/mock-strapi-data');
const documentation = require('../documentation');
const override = require('../override');
const defaultConfig = require('../../config/default-plugin-config');

const mockStrapiInstance = {
  dirs: {
    app: {
      api: './',
      extensions: './',
    },
  },
  contentTypes,
  components,
  api,
  plugins,
  config: {
    get: () => defaultConfig,
  },
  log: {
    info: jest.fn(),
    warn: jest.fn(),
  },
};

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  writeJson: jest.fn(),
  ensureFile: jest.fn(),
}));

describe('Documentation service', () => {
  beforeAll(() => {
    global.strapi = mockStrapiInstance;
    global.strapi.contentType = jest.fn((uid) => {
      // Only deal with mocked data, return empty attributes for unmocked relations
      if (!global.strapi.contentTypes[uid]) return { attributes: {} };

      return global.strapi.contentTypes[uid];
    });
    global.strapi.plugin = jest.fn((name) => global.strapi.plugins[name]);

    global.strapi.plugins.documentation = {
      service: jest.fn((name) => {
        const mockServices = {
          override: override({ strapi: global.strapi }),
        };

        return mockServices[name];
      }),
    };
  });

  afterAll(() => {
    // Teardown the mocked strapi instance
    global.strapi = {};
  });

  afterEach(() => {
    // Reset the mocked strapi config
    global.strapi.config.get = () => defaultConfig;
  });

  it('generates a valid openapi schema', async () => {
    const docService = documentation({ strapi: global.strapi });
    await docService.generateFullDoc();
    const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
    const mockFinalDoc = lastMockCall[1];

    const validatePromise = SwaggerParser.validate(mockFinalDoc);

    await expect(validatePromise).resolves.not.toThrow();
  });

  describe('Determines the plugins that need documentation', () => {
    it('generates documentation for the default plugins if the user provided nothing in the config', async () => {
      const docService = documentation({ strapi: global.strapi });

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual(['upload', 'users-permissions']);
    });

    it("generates documentation only for plugins in the user's config", async () => {
      global.strapi.config.get = () => ({
        ...defaultConfig,
        'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: ['upload'] },
      });

      const docService = documentation({ strapi: global.strapi });

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual(['upload']);
    });

    it('does not generate documentation for any plugins', async () => {
      global.strapi.config.get = () => ({
        ...defaultConfig,
        'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: [] },
      });

      const docService = documentation({ strapi: global.strapi });

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual([]);
    });
  });

  describe('Handles user config and overrides', () => {
    it('replaces default config with the user config', async () => {
      const userConfig = {
        info: {
          version: '4.0.0',
          title: 'custom-documentation',
          description: 'custom description',
          termsOfService: 'custom terms of service',
          contact: {
            name: 'custom-team',
            email: 'custom-contact-email@something.io',
            url: 'custom-mywebsite.io',
          },
          license: {
            name: 'custom Apache 2.0',
            url: 'custom https://www.apache.org/licenses/LICENSE-2.0.html',
          },
        },
        'x-strapi-config': {
          path: 'custom-documentation',
          plugins: [],
        },
        servers: [{ server: 'custom-server' }],
        externalDocs: {
          description: 'custom Find out more',
          url: 'custom-doc-url',
        },
        webhooks: {
          test: {},
        },
        security: [
          {
            bearerAuth: ['custom'],
          },
        ],
      };
      global.strapi.config.get = () => ({ ...userConfig });
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc.info).toEqual(userConfig.info);
      expect(mockFinalDoc['x-strapi-config']).toEqual(userConfig['x-strapi-config']);
      expect(mockFinalDoc.externalDocs).toEqual(userConfig.externalDocs);
      expect(mockFinalDoc.security).toEqual(userConfig.security);
      expect(mockFinalDoc.webhooks).toEqual(userConfig.webhooks);
      expect(mockFinalDoc.servers).toEqual(userConfig.servers);
    });

    it("does not apply an override if the plugin providing the override isn't specified in the x-strapi-config.plugins", async () => {
      global.strapi.config.get = () => ({
        ...defaultConfig,
        'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: [] },
      });
      const docService = documentation({ strapi: global.strapi });
      const overrideService = override({ strapi: global.strapi });

      overrideService.registerOverride(
        {
          paths: {
            '/test': {
              get: {
                tags: ['Users-Permissions - Users & Roles'],
                summary: 'Get list of users',
                responses: {},
              },
            },
          },
        },
        { pluginOrigin: 'users-permissions' }
      );

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc.paths['/test']).toBeUndefined();
    });

    it('overrides (extends) Tags', async () => {
      const overrideService = override({ strapi: global.strapi });
      // Simulate override from users-permissions plugin
      overrideService.registerOverride(
        {
          tags: ['users-permissions-tag'],
        },
        { pluginOrigin: 'users-permissions' }
      );
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          tags: ['upload-tag'],
        },
        { pluginOrigin: 'upload' }
      );
      // Use the override service in the documentation service
      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          };

          return mockServices[name];
        }),
      };
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc.tags).toEqual(['users-permissions-tag', 'upload-tag']);
    });

    it('overrides (replaces existing or adds new) Paths', async () => {
      const overrideService = override({ strapi: global.strapi });
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          paths: {
            // This path exists after generating with mock data, replace it
            '/upload/files': {
              get: {
                responses: ['existing-path-test'],
              },
            },
            // This path does not exist after generating with mock data, add it
            '/upload/new-path': {
              get: {
                responses: ['new-path-test'],
              },
            },
          },
        },
        { pluginOrigin: 'upload' }
      );
      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          };

          return mockServices[name];
        }),
      };
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc.paths['/upload/files'].get.responses).toEqual(['existing-path-test']);
      expect(Object.keys(mockFinalDoc.paths['/upload/files'].get)).toEqual(['responses']);
      expect(mockFinalDoc.paths['/upload/new-path'].get.responses).toEqual(['new-path-test']);
    });

    it('overrides (replaces existing or adds new) Components', async () => {
      const overrideService = override({ strapi: global.strapi });
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          components: {
            schemas: {
              // This component schema exists after generating with mock data, replace it
              UploadFileResponse: {
                properties: {
                  data: { $ref: 'test-existing-component' },
                  meta: { type: 'object' },
                },
              },
              // This component schema does not exist after generating with mock data, add it
              UploadFileMockCompo: {
                properties: {
                  data: { $ref: 'test-new-component' },
                  meta: { type: 'object' },
                },
              },
            },
          },
        },
        { pluginOrigin: 'upload' }
      );
      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          };

          return mockServices[name];
        }),
      };
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc.components.schemas.UploadFileResponse.properties.data.$ref).toEqual(
        'test-existing-component'
      );
      expect(mockFinalDoc.components.schemas.UploadFileMockCompo.properties.data.$ref).toEqual(
        'test-new-component'
      );
    });
  });
});

'use strict';

const fse = require('fs-extra');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { api, plugins, components, contentTypes } = require('../__mocks__/mock-strapi-data');
const documentation = require('../documentation');
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
    get: jest.fn(() => defaultConfig),
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
  });

  afterAll(() => {
    // Teardown the mocked strapi instance
    global.strapi = {};
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

      const pluginsToDocument = docService.getPluginsThatNeedDocumentation();
      const expectededPlugins = ['email', 'upload', 'users-permissions'];
      expect(pluginsToDocument).toEqual(expectededPlugins);

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual(expectededPlugins);
    });

    it("generates documentation only for plugins in the user's config", async () => {
      global.strapi.config.get.mockReturnValueOnce({
        ...defaultConfig,
        'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: ['email'] },
      });
      const docService = documentation({ strapi: global.strapi });

      const pluginsToDocument = docService.getPluginsThatNeedDocumentation();
      expect(pluginsToDocument).toEqual(['email']);

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual(['email']);
    });

    it('does not generate documentation for any plugins', async () => {
      global.strapi.config.get.mockReturnValueOnce({
        ...defaultConfig,
        'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: [] },
      });
      const docService = documentation({ strapi: global.strapi });

      const pluginsToDocument = docService.getPluginsThatNeedDocumentation();
      expect(pluginsToDocument).toEqual([]);

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual([]);
    });
  });

  describe('Handles overrides', () => {
    it("does not apply an override if the plugin providing the override isn't specified in the x-strapi-config.plugins", async () => {
      global.strapi.config.get.mockReturnValueOnce({
        ...defaultConfig,
        'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: [] },
      });
      const docService = documentation({ strapi: global.strapi });

      docService.registerDoc(
        {
          '/test': {
            get: {
              tags: ['Users-Permissions - Users & Roles'],
              summary: 'Get list of users',
              responses: {},
            },
          },
        },
        'users-permissions'
      );

      expect(global.strapi.log.info).toHaveBeenCalledWith(
        `@strapi/documentation will not use the override provided by users-permissions since the plugin was not specified in the x-strapi-config.plugins array`
      );

      await docService.generateFullDoc();
      const lastMockCall = fse.writeJson.mock.calls[fse.writeJson.mock.calls.length - 1];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc.paths['/test']).toBeUndefined();
    });
  });
});

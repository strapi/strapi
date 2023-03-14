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
});

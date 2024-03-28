import _ from 'lodash/fp';
import fse from 'fs-extra';
// eslint-disable-next-line node/no-unpublished-import
import SwaggerParser from '@apidevtools/swagger-parser';
import { apis, plugins, components, contentTypes } from '../__mocks__/mock-strapi-data';
import documentation from '../documentation';
import override from '../override';
import { defaultConfig } from '../../config/default-plugin-config';

const mockStrapiInstance = {
  dirs: {
    app: {
      api: './',
      extensions: './',
    },
  },
  contentTypes,
  components,
  apis,
  plugins,
  config: {
    get: () => defaultConfig,
  },
  log: {
    info: jest.fn(),
    warn: jest.fn(),
  },
} as any;

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  writeJson: jest.fn(),
  ensureFile: jest.fn(),
}));

describe('Documentation plugin | Documentation service', () => {
  beforeAll(() => {
    global.strapi = mockStrapiInstance;
    global.strapi.contentType = jest.fn((uid) => {
      // Only deal with mocked data, return empty attributes for unmocked relations
      if (!global.strapi.contentTypes[uid]) return { attributes: {} };

      return global.strapi.contentTypes[uid];
    }) as any;

    global.strapi.plugins.documentation = {
      service: jest.fn((name) => {
        const mockServices = {
          override: override({ strapi: global.strapi }),
        } as any;

        return mockServices[name];
      }),
    } as any;
  });

  afterAll(() => {
    // Teardown the mocked strapi instance
    global.strapi = {} as any;
  });

  afterEach(() => {
    // Reset the mocked strapi config
    global.strapi.config.get = () => defaultConfig as any;
  });

  it('generates a valid openapi schema', async () => {
    const docService = documentation({ strapi: global.strapi });
    await docService.generateFullDoc();
    const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
      jest.mocked(fse.writeJson).mock.calls.length - 1
    ];
    const mockFinalDoc = lastMockCall[1];

    // The final documenation is read only, clone deep for this test
    const validatePromise = SwaggerParser.validate(_.cloneDeep(mockFinalDoc));

    await expect(validatePromise).resolves.not.toThrow();
  });

  it('generates the correct response component schema for a single type', async () => {
    const docService = documentation({ strapi: global.strapi });
    await docService.generateFullDoc();
    const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
      jest.mocked(fse.writeJson).mock.calls.length - 1
    ];
    const mockFinalDoc = lastMockCall[1];
    const expected = {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/HomepageResponse',
          },
        },
      },
    };
    expect(mockFinalDoc.paths['/homepage'].get.responses['200']).toEqual(expected);
    expect(mockFinalDoc.paths['/homepage'].put.responses['200']).toEqual(expected);
    expect(mockFinalDoc.paths['/homepage'].post.responses['200']).toEqual(expected);
  });

  it('generates the correct response component schema for a collection type', async () => {
    const docService = documentation({ strapi: global.strapi });
    await docService.generateFullDoc();
    const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
      jest.mocked(fse.writeJson).mock.calls.length - 1
    ];
    const mockFinalDoc = lastMockCall[1];
    const expectedList = {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/KitchensinkListResponse',
          },
        },
      },
    };
    const expectedOne = {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/KitchensinkResponse',
          },
        },
      },
    };
    expect(mockFinalDoc.paths['/kitchensinks'].get.responses['200']).toEqual(expectedList);
    expect(mockFinalDoc.paths['/kitchensinks'].post.responses['200']).toEqual(expectedOne);
    expect(mockFinalDoc.paths['/kitchensinks/{id}'].get.responses['200']).toEqual(expectedOne);
    expect(mockFinalDoc.paths['/kitchensinks/{id}'].put.responses['200']).toEqual(expectedOne);
  });

  describe('Determines the plugins that need documentation', () => {
    it('generates documentation for the default plugins if the user provided nothing in the config', async () => {
      const docService = documentation({ strapi: global.strapi });

      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual(['upload', 'users-permissions']);
    });

    it("generates documentation only for plugins in the user's config", async () => {
      global.strapi.config.get = () =>
        ({
          ...defaultConfig,
          'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: ['upload'] },
        }) as any;

      const docService = documentation({ strapi: global.strapi });

      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc['x-strapi-config'].plugins).toEqual(['upload']);
    });

    it('does not generate documentation for any plugins', async () => {
      global.strapi.config.get = () =>
        ({
          ...defaultConfig,
          'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: [] },
        }) as any;

      const docService = documentation({ strapi: global.strapi });

      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
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

      global.strapi.config.get = () => ({ ...userConfig }) as any;
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];
      // The generation data is dynamically added, it cannot be modified by the user
      const { 'x-generation-date': generationConfig, ...mockFinalDocInfo } = mockFinalDoc.info;
      expect(mockFinalDocInfo).toEqual(userConfig.info);
      expect(mockFinalDoc['x-strapi-config']).toEqual(userConfig['x-strapi-config']);
      expect(mockFinalDoc.externalDocs).toEqual(userConfig.externalDocs);
      expect(mockFinalDoc.security).toEqual(userConfig.security);
      expect(mockFinalDoc.webhooks).toEqual(userConfig.webhooks);
      expect(mockFinalDoc.servers).toEqual(userConfig.servers);
    });

    it("does not apply an override if the plugin providing the override isn't specified in the x-strapi-config.plugins", async () => {
      global.strapi.config.get = () =>
        ({
          ...defaultConfig,
          'x-strapi-config': { ...defaultConfig['x-strapi-config'], plugins: [] },
        }) as any;
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
        } as any,
        { pluginOrigin: 'users-permissions' }
      );

      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc.paths['/test']).toBeUndefined();
    });

    it('overrides (extends) Tags', async () => {
      const overrideService = override({ strapi: global.strapi });
      // Simulate override from users-permissions plugin
      overrideService.registerOverride(
        {
          tags: ['users-permissions-tag'],
        } as any,
        { pluginOrigin: 'users-permissions' }
      );
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          tags: ['upload-tag'],
        } as any,
        { pluginOrigin: 'upload' }
      );
      // Use the override service in the documentation service
      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          } as any;

          return mockServices[name];
        }),
      } as any;
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
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
        } as any,
        { pluginOrigin: 'upload' }
      );
      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          } as any;

          return mockServices[name];
        }),
      } as any;

      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
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
          } as any;

          return mockServices[name];
        }),
      } as any;
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc.components.schemas.UploadFileResponse.properties.data.$ref).toEqual(
        'test-existing-component'
      );
      expect(mockFinalDoc.components.schemas.UploadFileMockCompo.properties.data.$ref).toEqual(
        'test-new-component'
      );
    });
    it('overrides only the specified version', async () => {
      const overrideService = override({ strapi: global.strapi });
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          // Only override for version 1.0.0
          info: { version: '1.0.0' },
          components: {
            schemas: {
              // This component schema exists after generating with mock data, replace it
              ShouldNotBeAdded: {},
            },
          },
        } as any,
        { pluginOrigin: 'upload' }
      );
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          // Only override for version 2.0.0
          info: { version: '2.0.0' },
          components: {
            schemas: {
              // This component schema exists after generating with mock data, replace it
              ShouldBeAdded: {},
            },
          },
        } as any,
        { pluginOrigin: 'upload' }
      );
      // Simulate override from upload plugin
      overrideService.registerOverride(
        {
          components: {
            schemas: {
              // This component schema exists after generating with mock data, replace it
              ShouldAlsoBeAdded: {},
            },
          },
        },
        { pluginOrigin: 'upload' }
      );
      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          } as any;

          return mockServices[name];
        }),
      } as any;
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc('2.0.0');
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];

      expect(mockFinalDoc.components.schemas.ShouldNotBeAdded).toBeUndefined();
      expect(mockFinalDoc.components.schemas.ShouldBeAdded).toBeDefined();
      expect(mockFinalDoc.components.schemas.ShouldAlsoBeAdded).toBeDefined();
    });
    it('excludes apis and plugins from generation', async () => {
      const overrideService = override({ strapi: global.strapi });

      overrideService.excludeFromGeneration('kitchensink');

      global.strapi.plugins.documentation = {
        service: jest.fn((name) => {
          const mockServices = {
            override: overrideService,
          } as any;

          return mockServices[name];
        }),
      } as any;

      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];

      expect(
        Object.keys(mockFinalDoc.paths).find((path) => path.includes('kitchensink'))
      ).toBeUndefined();
      expect(
        Object.keys(mockFinalDoc.components.schemas).find((compo) => compo.includes('Kitchensink'))
      ).toBeUndefined();
    });
    it("applies a user's mutateDocumentation function", async () => {
      global.strapi.config.get = () =>
        ({
          ...defaultConfig,
          'x-strapi-config': {
            ...defaultConfig['x-strapi-config'],
            mutateDocumentation(draft: any) {
              draft.paths['/kitchensinks'] = {
                get: { responses: { 200: { description: 'test' } } },
              };
            },
          },
        }) as any;
      const docService = documentation({ strapi: global.strapi });
      await docService.generateFullDoc();
      const lastMockCall = jest.mocked(fse.writeJson).mock.calls[
        jest.mocked(fse.writeJson).mock.calls.length - 1
      ];
      const mockFinalDoc = lastMockCall[1];
      expect(mockFinalDoc.paths['/kitchensinks']).toEqual({
        get: { responses: { 200: { description: 'test' } } },
      });
    });
  });
});

import { cloneDeep } from 'lodash/fp';
import { Readable, Writable } from 'stream-chain';
import { createTransferEngine } from '..';
import { IDestinationProvider, ISourceProvider, ITransferEngineOptions } from '../../../types';
import {
  extendExpectForDataTransferTests,
  providerStages,
  sourceStages,
} from '../../__tests__/test-utils';

const getMockSourceStream = (data: Iterable<any> = ['foo', 'bar']) => {
  const stream = Readable.from(data);

  return stream;
};

const getMockDestinationStream = () => {
  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      callback();
    },
  });
  return stream;
};

extendExpectForDataTransferTests();

const metadata = {
  createdAt: '2022-11-23T09:26:43.463Z',
  strapi: {
    version: '1.2.3',
    plugins: [
      {
        name: 'content-manager',
        version: '1.2.3',
      },
      {
        name: 'content-type-builder',
        version: '1.2.3',
      },
    ],
  },
};

const schemas = [
  {
    collectionName: 'admin_permissions',
    info: {
      name: 'Permission',
      description: '',
      singularName: 'permission',
      pluralName: 'permissions',
      displayName: 'Permission',
    },
    options: {},
    pluginOptions: {
      'content-manager': { visible: false },
      'content-type-builder': { visible: false },
    },
    attributes: {
      action: { type: 'string', minLength: 1, configurable: false, required: true },
      subject: { type: 'string', minLength: 1, configurable: false, required: false },
      properties: { type: 'json', configurable: false, required: false, default: {} },
      conditions: { type: 'json', configurable: false, required: false, default: [] },
      role: {
        configurable: false,
        type: 'relation',
        relation: 'manyToOne',
        inversedBy: 'permissions',
        target: 'admin::role',
      },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
      },
    },
    kind: 'collectionType',
    modelType: 'contentType',
    modelName: 'permission',
    uid: 'admin::permission',
    plugin: 'admin',
    globalId: 'AdminPermission',
  },
  {
    collectionName: 'homepages',
    info: { displayName: 'Homepage', singularName: 'homepage', pluralName: 'homepages' },
    options: { draftAndPublish: true },
    pluginOptions: { i18n: { localized: true } },
    attributes: {
      title: { type: 'string', required: true, pluginOptions: { i18n: { localized: true } } },
      slug: {
        type: 'uid',
        targetField: 'title',
        required: true,
        pluginOptions: { i18n: { localized: true } },
      },
      single: { type: 'media', allowedTypes: ['images', 'files', 'videos'], required: false },
      multiple: {
        type: 'media',
        multiple: true,
        allowedTypes: ['images', 'videos'],
        required: false,
      },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
      publishedAt: { type: 'datetime', configurable: false, writable: true, visible: false },
      createdBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
      },
      updatedBy: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'admin::user',
        configurable: false,
        writable: false,
        visible: false,
        useJoinTable: false,
        private: true,
      },
      localizations: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::homepage.homepage',
      },
      locale: {
        writable: true,
        private: false,
        configurable: false,
        visible: false,
        type: 'string',
      },
    },
    kind: 'singleType',
    modelType: 'contentType',
    modelName: 'homepage',
    uid: 'api::homepage.homepage',
    globalId: 'Homepage',
  },
];

const createSource = (streamData?) => {
  return {
    type: 'source',
    name: 'completeSource',
    getMetadata: jest.fn().mockResolvedValue(metadata) as any,
    getSchemas: jest.fn().mockResolvedValue(schemas) as any,

    bootstrap: jest.fn() as any,
    close: jest.fn() as any,

    streamEntities: jest.fn().mockResolvedValue(getMockSourceStream(streamData)) as any,
    streamLinks: jest.fn().mockResolvedValue(getMockSourceStream(streamData)) as any,
    streamAssets: jest.fn().mockResolvedValue(getMockSourceStream(streamData)) as any,
    streamConfiguration: jest.fn().mockResolvedValue(getMockSourceStream(streamData)) as any,
    streamSchemas: jest.fn().mockReturnValue(getMockSourceStream(streamData)) as any,
  } as ISourceProvider;
};

const createDestination = () => {
  return {
    type: 'destination',
    name: 'completeDestination',
    getMetadata: jest.fn().mockResolvedValue(metadata) as any,
    getSchemas: jest.fn().mockResolvedValue(schemas) as any,

    bootstrap: jest.fn() as any,
    close: jest.fn() as any,

    getEntitiesStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getLinksStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getAssetsStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getConfigurationStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getSchemasStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
  } as IDestinationProvider;
};

describe('Transfer engine', () => {
  // TODO: if these are needed for any other tests, a factory should be added to test-utils

  const minimalSource = {
    type: 'source',
    name: 'minimalSource',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as ISourceProvider;

  const minimalDestination = {
    type: 'destination',
    name: 'minimalDestination',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as IDestinationProvider;

  const defaultOptions = {
    strategy: 'restore',
    versionMatching: 'exact',
    schemasMatching: 'exact',
    exclude: [],
  } as ITransferEngineOptions;

  let completeSource;
  let completeDestination;

  beforeEach(() => {
    jest.restoreAllMocks();
    completeSource = createSource();
    completeDestination = createDestination();
  });

  describe('createTransferEngine', () => {
    test('creates a valid transfer engine', () => {
      const engine = createTransferEngine(minimalSource, minimalDestination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
    });

    test('throws when given invalid source provider', () => {
      expect(() => {
        createTransferEngine(completeDestination, minimalDestination, defaultOptions);
      }).toThrow();
    });

    test('throws when given invalid destination provider', () => {
      expect(() => {
        createTransferEngine(minimalSource, completeSource, defaultOptions);
      }).toThrow();
    });
  });

  describe('bootstrap', () => {
    test('works for providers without a bootstrap', async () => {
      const engine = createTransferEngine(minimalSource, minimalDestination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();
      expect(minimalSource).toHaveSourceStagesCalledTimes(1);
    });

    test('bootstraps all providers with a bootstrap', async () => {
      const source = {
        ...minimalSource,
        bootstrap: jest.fn().mockResolvedValue(true),
      };
      const destination = {
        ...minimalDestination,
        bootstrap: jest.fn().mockResolvedValue(true),
      };
      const engine = createTransferEngine(source, destination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();

      expect(minimalSource).toHaveSourceStagesCalledTimes(1);
    });
  });

  describe('transfer', () => {
    test('requires strategy to be either restore or merge', async () => {
      const engineOptions = {
        versionMatching: 'exact',
        exclude: [],
      } as unknown as ITransferEngineOptions;

      const restoreEngine = createTransferEngine(minimalSource, minimalDestination, {
        ...engineOptions,
        strategy: 'restore',
      });
      await restoreEngine.transfer();
      expect(restoreEngine).toBeValidTransferEngine();

      const mergeEngine = createTransferEngine(minimalSource, minimalDestination, {
        ...engineOptions,
        strategy: 'merge',
      });
      await mergeEngine.transfer();
      expect(mergeEngine).toBeValidTransferEngine();

      // undefined strategy
      await expect(
        (async () => {
          const invalidEngine = createTransferEngine(
            minimalSource,
            minimalDestination,
            engineOptions
          );
          await invalidEngine.transfer();
        })()
      ).rejects.toThrow();

      // invalid strategy
      await expect(
        (async () => {
          const invalidEngine = createTransferEngine(minimalSource, minimalDestination, {
            ...engineOptions,
            strategy: 'foo',
          } as unknown as ITransferEngineOptions);
          await invalidEngine.transfer();
        })()
      ).rejects.toThrow();
    });

    test('calls all provider stages', async () => {
      const engine = createTransferEngine(completeSource, completeDestination, defaultOptions);
      expect(completeSource).toHaveSourceStagesCalledTimes(0);
      expect(completeDestination).toHaveDestinationStagesCalledTimes(0);
      await engine.transfer();

      expect(completeSource).toHaveSourceStagesCalledTimes(1);
      expect(completeDestination).toHaveDestinationStagesCalledTimes(1);
    });

    test('returns provider results', async () => {
      const source = {
        ...minimalSource,
        results: { foo: 'bar' },
      };
      const destination = {
        ...minimalDestination,
        results: { foo: 'baz' },
      };

      const engine = createTransferEngine(source, destination, defaultOptions);
      const results = await engine.transfer();
      expect(results).toMatchObject({
        source: { foo: 'bar' },
        destination: { foo: 'baz' },
      });
    });
  });

  describe('progressStream', () => {
    test("emits 'progress' events", async () => {
      const streamData = [{ foo: 'bar' }, { bar: 'baz' }, { some: 'other', data: 'here' }];
      const source = createSource(streamData);
      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      let calls = 0;
      engine.progress.stream.on('progress', ({ stage, data }) => {
        expect(data).toMatchObject(engine.progress.data);
        calls += 1;
      });

      await engine.transfer();

      expect(calls).toEqual((sourceStages.length - providerStages.length) * streamData.length);
    });

    // TODO: to implement these, the mocked streams need to be improved
    test.todo("emits 'start' events");
    test.todo("emits 'complete' events");
  });

  describe('integrity checks', () => {
    describe('schema matching', () => {
      describe('exact', () => {
        const engineOptions = {
          strategy: 'restore',
          versionMatching: 'exact',
          schemasMatching: 'exact',
          exclude: [],
        } as ITransferEngineOptions;
        test('source with source schema missing in destination fails', async () => {
          const source = createSource();
          source.getSchemas = jest.fn().mockResolvedValue([...schemas, { foo: 'bar' }]);
          const engine = createTransferEngine(source, completeDestination, engineOptions);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });
        test('source with destination schema missing in source fails', async () => {
          const destination = createDestination();
          destination.getSchemas = jest.fn().mockResolvedValue([...schemas, { foo: 'bar' }]);
          const engine = createTransferEngine(completeSource, destination, engineOptions);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });
        test('differing nested field fails', async () => {
          const destination = createDestination();
          const fakeSchema = cloneDeep(schemas);
          fakeSchema[0].attributes.action.minLength = 2;
          destination.getSchemas = jest.fn().mockResolvedValue(fakeSchema);
          const engine = createTransferEngine(completeSource, destination, engineOptions);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });
      });
    });

    describe('version matching', () => {
      test('works with invalid version string', async () => {
        const versionsThatFail = ['foo', 'z1.2.3', '1.2.3z'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionMatching: 'exact',
        };

        versionsThatFail.forEach((version) => {
          const modifiedMetadata = cloneDeep(metadata);
          modifiedMetadata.strapi.version = version;
          const source = createSource();
          source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
          const engine = createTransferEngine(source, completeDestination, options);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });
      });

      test('exact works', async () => {
        const versionsThatFail = ['1.2.3-alpha', '1.2.4', '2.2.3'];
        const versionsThatSucceed = ['1.2.3'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionMatching: 'exact',
        };

        versionsThatFail.forEach((version) => {
          const modifiedMetadata = cloneDeep(metadata);
          modifiedMetadata.strapi.version = version;
          const source = createSource();
          source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
          const engine = createTransferEngine(source, completeDestination, options);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });

        versionsThatSucceed.forEach((version) => {
          const modifiedMetadata = cloneDeep(metadata);
          modifiedMetadata.strapi.version = version;
          const source = createSource();
          source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
          const engine = createTransferEngine(source, completeDestination, options);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).resolves.toBe(undefined);
        });
      });

      test('major works', async () => {
        const versionsThatFail = ['2.2.3'];
        const versionsThatSucceed = ['1.2.3', '1.3.4', '1.4.4-alpha'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionMatching: 'major',
        };

        await Promise.all(
          versionsThatFail.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).rejects.toThrow();
          })
        );

        await Promise.all(
          versionsThatSucceed.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).resolves.toBe(undefined);
          })
        );
      });

      test('minor works', async () => {
        const versionsThatFail = ['2.2.3', '1.4.3', '1.4.3-alpha'];
        const versionsThatSucceed = ['1.2.3', '1.2.40', '1.2.4-alpha'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionMatching: 'minor',
        };

        await Promise.all(
          versionsThatFail.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).rejects.toThrow();
          })
        );

        await Promise.all(
          versionsThatSucceed.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).resolves.toBe(undefined);
          })
        );
      });

      test('patch works', async () => {
        const versionsThatFail = ['1.2.4', '1.2.4-alpha', '2.2.3'];
        const versionsThatSucceed = ['1.2.3'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionMatching: 'patch',
        };

        await Promise.all(
          versionsThatFail.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).rejects.toThrow();
          })
        );

        await Promise.all(
          versionsThatSucceed.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).resolves.toBe(undefined);
          })
        );
      });

      test('ignore works', async () => {
        const versionsThatSucceed = ['1.2.3', '1.3.4', '5.24.44-alpha'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionMatching: 'ignore',
        };

        await Promise.all(
          versionsThatSucceed.map(async (version) => {
            const modifiedMetadata = cloneDeep(metadata);
            modifiedMetadata.strapi.version = version;
            const source = createSource();
            source.getMetadata = jest.fn().mockResolvedValue(modifiedMetadata);
            const engine = createTransferEngine(source, completeDestination, options);
            await expect(
              (async () => {
                await engine.transfer();
              })()
            ).resolves.toBe(undefined);
          })
        );
      });
    });
  });
});

import { posix, win32 } from 'path';
import { cloneDeep, get, set } from 'lodash/fp';
import { Readable, Writable } from 'stream-chain';
import type { Struct } from '@strapi/types';
import { createTransferEngine, TRANSFER_STAGES } from '..';

import type {
  IAsset,
  IConfiguration,
  IDestinationProvider,
  IEntity,
  ILink,
  ISourceProvider,
  ITransferEngineOptions,
  TransferFilterPreset,
} from '../../../types';
import {
  extendExpectForDataTransferTests,
  providerStages,
  sourceStages,
} from '../../__tests__/test-utils';
import { TransferEngineValidationError } from '../errors';

const getMockSourceStream = (data: Iterable<unknown>) => Readable.from(data);

const defaultLinksData: Array<ILink> = [
  {
    kind: 'relation.basic',
    relation: 'oneToOne',
    left: { type: 'api::foo.foo', ref: 1, field: 'foo' },
    right: { type: 'api::bar.bar', ref: 2, field: 'bar' },
  },
  {
    kind: 'relation.basic',
    relation: 'oneToMany',
    left: { type: 'api::foo.foo', ref: 1, field: 'foos' },
    right: { type: 'api::bar.bar', ref: 2, field: 'bar' },
  },
  {
    kind: 'relation.basic',
    relation: 'oneToMany',
    left: { type: 'basic.foo', field: 'foo', ref: 1 },
    right: { type: 'api::foo.foo', ref: 1 },
  },
];

const schemas = {
  'admin::permission': {
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
  'api::homepage.homepage': {
    collectionName: 'homepages',
    info: { displayName: 'Homepage', singularName: 'homepage', pluralName: 'homepages' },
    options: {},
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
  'api::bar.bar': {
    kind: 'collectionType',
    collectionName: 'bars',
    modelType: 'contentType',
    info: {
      singularName: 'bar',
      pluralName: 'bars',
      displayName: 'bar',
      description: '',
    },
    options: {},
    pluginOptions: {},
    attributes: {
      bar: {
        type: 'integer',
      },
      foo: {
        displayName: 'foo',
        type: 'component',
        repeatable: false,
        component: 'basic.foo',
      },
    },
  },
  'api::foo.foo': {
    kind: 'collectionType',
    collectionName: 'foos',
    modelType: 'contentType',
    info: {
      singularName: 'foo',
      pluralName: 'foos',
      displayName: 'foo',
    },
    options: {},
    pluginOptions: {},
    attributes: {
      foo: {
        type: 'string',
      },
    },
  },
  'basic.foo': {
    collectionName: 'components_basic_foos',
    info: { displayName: 'Good Basic' },
    options: {},
    attributes: {
      foo: { type: 'relation', relation: 'oneToOne', target: 'api::foo.foo' },
    },
    modelType: 'component',
    modelName: 'foo-basic',
    uid: 'basic.foo',
    globalId: 'ComponentBasicFoo',
  },
};

type Entity = IEntity<
  'api::foo.foo' | 'api::bar.bar' | 'admin::permission' | 'api::homepage.homepage'
>;

const getEntitiesMockSourceStream = (
  data: Array<Entity> = [
    { id: 1, type: 'api::foo.foo', data: { foo: 'bar' } },
    { id: 2, type: 'api::bar.bar', data: { bar: 'foo' } },
    { id: 1, type: 'admin::permission', data: { foo: 'bar' } },
    { id: 2, type: 'api::homepage.homepage', data: { bar: 'foo' } },
  ]
) => getMockSourceStream(data);

const getLinksMockSourceStream = (data: Array<ILink> = defaultLinksData) =>
  getMockSourceStream(data);

const getAssetsMockSourceStream = (
  data: Iterable<IAsset> = [
    {
      filename: 'foo.jpg',
      filepath: posix.join(__dirname, 'foo.jpg'), // test a file with a posix path
      stats: { size: 24 },
      stream: Readable.from([1, 2, 3]),
    },
    {
      filename: 'bar.jpg',
      filepath: win32.join(__dirname, 'bar.jpg'), // test a file with a win32 path
      stats: { size: 48 },
      stream: Readable.from([4, 5, 6, 7, 8, 9]),
    },
  ]
) => getMockSourceStream(data);

const getConfigurationMockSourceStream = (
  data: Iterable<unknown> = [
    { key: 'foo', value: 'alice' },
    { key: 'bar', value: 'bob' },
  ]
) => getMockSourceStream(data);

const getSchemasMockSourceStream = (
  data: Array<Struct.Schema> = [
    {
      uid: 'api::foo.foo',
      kind: 'collectionType',
      modelName: 'foo',
      globalId: 'foo',
      info: { displayName: 'foo', singularName: 'foo', pluralName: 'foos' },
      modelType: 'contentType',
      attributes: { foo: { type: 'string' } },
    },
    {
      uid: 'api::bar.bar',
      kind: 'collectionType',
      modelName: 'bar',
      globalId: 'bar',
      info: { displayName: 'bar', singularName: 'bar', pluralName: 'bars' },
      modelType: 'contentType',
      attributes: { bar: { type: 'integer' } },
    },
    {
      uid: 'api::homepage.homepage',
      kind: 'collectionType',
      modelName: 'homepage',
      globalId: 'homepage',
      info: { displayName: 'Homepage', singularName: 'homepage', pluralName: 'homepages' },
      modelType: 'contentType',
      attributes: {
        action: { type: 'string' },
      },
    },
    {
      uid: 'api::permission.permission',
      kind: 'collectionType',
      modelName: 'permission',
      globalId: 'permission',
      info: { displayName: 'Permission', singularName: 'permission', pluralName: 'permissions' },
      modelType: 'contentType',
      attributes: {
        action: { type: 'string' },
      },
    },
  ]
) => getMockSourceStream(data);

const getMockDestinationStream = (listener?: any) => {
  return new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      if (listener) {
        listener(chunk);
      }
      callback();
    },
  });
};

extendExpectForDataTransferTests();

const metadata = {
  createdAt: '2022-11-23T09:26:43.463Z',
  strapi: {
    version: '1.2.3',
  },
};

const createSource = (streamData?: {
  assets?: IAsset[];
  entities?: Entity[];
  links?: ILink[];
  configuration?: IConfiguration[];
  schemas?: Struct.Schema[];
}): ISourceProvider => {
  return {
    type: 'source',
    name: 'completeSource',
    getMetadata: jest.fn().mockResolvedValue(metadata),
    getSchemas: jest.fn().mockResolvedValue(schemas),

    bootstrap: jest.fn(),
    close: jest.fn(),

    createEntitiesReadStream: jest
      .fn()
      .mockResolvedValue(getEntitiesMockSourceStream(streamData?.entities)),
    createLinksReadStream: jest.fn().mockResolvedValue(getLinksMockSourceStream(streamData?.links)),
    createAssetsReadStream: jest
      .fn()
      .mockResolvedValue(getAssetsMockSourceStream(streamData?.assets)),
    createConfigurationReadStream: jest
      .fn()
      .mockResolvedValue(getConfigurationMockSourceStream(streamData?.configuration)),
    createSchemasReadStream: jest
      .fn()
      .mockReturnValue(getSchemasMockSourceStream(streamData?.schemas)),
  };
};

const createDestination = (
  overrideOptions?: Partial<IDestinationProvider>
): IDestinationProvider => {
  return {
    type: 'destination',
    name: 'completeDestination',
    getMetadata: jest.fn().mockResolvedValue(metadata),
    getSchemas: jest.fn().mockResolvedValue(schemas),

    bootstrap: jest.fn(),
    close: jest.fn(),
    createEntitiesWriteStream: jest.fn().mockResolvedValue(getMockDestinationStream()),
    createLinksWriteStream: jest.fn().mockResolvedValue(getMockDestinationStream()),
    createAssetsWriteStream: jest.fn().mockResolvedValue(getMockDestinationStream()),
    createConfigurationWriteStream: jest.fn().mockResolvedValue(getMockDestinationStream()),
    createSchemasWriteStream: jest.fn().mockResolvedValue(getMockDestinationStream()),
    ...overrideOptions,
  };
};

describe('Transfer engine', () => {
  // TODO: if these are needed for any other tests, a factory should be added to test-utils

  const minimalSource = {
    type: 'source',
    name: 'minimalSource',
    getMetadata: jest.fn(),
    getSchemas: jest.fn(),
  } as ISourceProvider;

  const minimalDestination = {
    type: 'destination',
    name: 'minimalDestination',
    getMetadata: jest.fn(),
    getSchemas: jest.fn(),
  } as IDestinationProvider;

  const defaultOptions = {
    versionStrategy: 'exact',
    schemaStrategy: 'exact',
    exclude: [],
  } as unknown as ITransferEngineOptions;

  let completeSource: ISourceProvider;
  let completeDestination: IDestinationProvider;

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
      expect(minimalSource).toHaveAllSourceStagesCalledTimes(1);
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

      expect(minimalSource).toHaveAllSourceStagesCalledTimes(1);
    });
  });

  describe('transfer', () => {
    test('calls all provider stages', async () => {
      const engine = createTransferEngine(completeSource, completeDestination, defaultOptions);
      expect(completeSource).toHaveAllSourceStagesCalledTimes(0);
      expect(completeDestination).toHaveAllDestinationStagesCalledTimes(0);
      await engine.transfer();

      expect(completeSource).toHaveAllSourceStagesCalledTimes(1);
      expect(completeDestination).toHaveAllDestinationStagesCalledTimes(1);
    });

    test.each<
      // (givenStages, mustBeCalled, mustNotBeCalled)
      [TransferFilterPreset[], (keyof IDestinationProvider)[], (keyof IDestinationProvider)[]]
    >([
      [
        // javascript could send undefined
        undefined as unknown as TransferFilterPreset[],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
          'createAssetsWriteStream',
        ],
        [],
      ],
      [
        [],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
          'createAssetsWriteStream',
        ],
        [],
      ],
      [
        ['files'],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
        ],
        ['createAssetsWriteStream'],
      ],
      [
        ['content'],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createAssetsWriteStream',
          'createConfigurationWriteStream',
        ],
        ['createLinksWriteStream', 'createEntitiesWriteStream'],
      ],
      [
        ['content', 'config'],
        ['bootstrap', 'createSchemasWriteStream', 'createAssetsWriteStream'],
        ['createLinksWriteStream', 'createEntitiesWriteStream', 'createConfigurationWriteStream'],
      ],
      [
        ['content', 'config', 'files'],
        ['bootstrap', 'createSchemasWriteStream'],
        [
          'createAssetsWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
        ],
      ],
    ])(
      `'exclude' options includes correct stages with %s`,
      async (excludeStages, mustBeCalled, mustNotBeCalled) => {
        const engine = createTransferEngine(completeSource, completeDestination, {
          ...defaultOptions,
          exclude: excludeStages,
        });

        await engine.transfer();

        expect(completeDestination).toHaveDestinationStagesCalledTimes(mustBeCalled, 1);
        expect(completeDestination).toHaveDestinationStagesCalledTimes(mustNotBeCalled, 0);
      }
    );

    test.each<
      // (givenStages, mustBeCalled, mustNotBeCalled)
      [TransferFilterPreset[], (keyof IDestinationProvider)[], (keyof IDestinationProvider)[]]
    >([
      [
        // javascript could send undefined
        undefined as unknown as TransferFilterPreset[],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
          'createAssetsWriteStream',
        ],
        [],
      ],
      [
        [],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
          'createAssetsWriteStream',
        ],
        [],
      ],
      [
        ['files'],
        ['bootstrap', 'createSchemasWriteStream', 'createAssetsWriteStream'],
        ['createLinksWriteStream', 'createEntitiesWriteStream', 'createConfigurationWriteStream'],
      ],
      [
        ['content'],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
        ],
        ['createAssetsWriteStream', 'createConfigurationWriteStream'],
      ],
      [
        ['content', 'config'],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
        ],
        ['createAssetsWriteStream'],
      ],
      [
        ['content', 'config', 'files'],
        [
          'bootstrap',
          'createSchemasWriteStream',
          'createLinksWriteStream',
          'createEntitiesWriteStream',
          'createConfigurationWriteStream',
          'createAssetsWriteStream',
        ],
        [],
      ],
    ])(
      `'only' option includes correct stages with %s`,
      async (onlyStages, mustBeCalled, mustNotBeCalled) => {
        const engine = createTransferEngine(completeSource, completeDestination, {
          ...defaultOptions,
          only: onlyStages,
        });

        await engine.transfer();

        expect(completeDestination).toHaveDestinationStagesCalledTimes(mustBeCalled, 1);
        expect(completeDestination).toHaveDestinationStagesCalledTimes(mustNotBeCalled, 0);
      }
    );

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
    test("emits 'transfer::start' and 'transfer::finish' events", async () => {
      const source = createSource();
      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      let calledStart = 0;
      engine.progress.stream.on('transfer::start', (/* payload */) => {
        calledStart += 1;
      });

      let calledFinish = 0;
      engine.progress.stream.on('transfer::finish', (/* payload */) => {
        calledFinish += 1;
      });

      // first call
      await engine.transfer();
      expect(calledStart).toEqual(1);
      expect(calledFinish).toEqual(1);

      // second call -- currently not supported
      // await engine.transfer();
      // expect(calledStart).toEqual(2);
      // expect(calledFinish).toEqual(2);
    });

    test("emits 'stage::progress' events", async () => {
      const source = createSource();
      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      let calls = 0;
      engine.progress.stream.on('stage::progress', ({ stage, data }) => {
        expect(TRANSFER_STAGES.includes(stage)).toBe(true);
        expect(data).toMatchObject(engine.progress.data);
        calls += 1;
      });

      await engine.transfer();

      // Two values are emitted by default for each stage
      // TODO: this is no longer true, we should be checking the sum of the various mocked streams
      const itemPerStage = 3;

      expect(calls).toEqual((sourceStages.length - providerStages.length) * itemPerStage);
    });

    test("emits 'stage::start' events", async () => {
      const source = createSource();
      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      let calls = 0;
      engine.progress.stream.on('stage::start', ({ stage, data }) => {
        expect(TRANSFER_STAGES.includes(stage)).toBe(true);
        expect(data).toMatchObject(engine.progress.data);
        calls += 1;
      });

      await engine.transfer();

      expect(calls).toEqual(TRANSFER_STAGES.length);
    });

    test("emits 'stage::finish' events", async () => {
      const source = createSource();
      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      let calls = 0;
      engine.progress.stream.on('stage::finish', ({ stage, data }) => {
        expect(TRANSFER_STAGES.includes(stage)).toBe(true);
        expect(data).toMatchObject(engine.progress.data);
        calls += 1;
      });

      await engine.transfer();

      expect(calls).toEqual(TRANSFER_STAGES.length);
    });

    test("emits 'stage::skip' events", async () => {
      const source = createSource();
      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      // delete 3 stages from source
      delete source.createSchemasReadStream;
      delete source.createLinksReadStream;
      delete source.createEntitiesReadStream;

      let calls = 0;
      engine.progress.stream.on('stage::skip', ({ stage, data }) => {
        expect(TRANSFER_STAGES.includes(stage)).toBe(true);
        expect(data).toMatchObject(engine.progress.data);
        calls += 1;
      });

      await engine.transfer();

      expect(calls).toEqual(3); // 3 deleted stages above
    });

    test('relations inside components are transferred', async () => {
      const processedLinks: ILink[] = [];

      completeDestination = createDestination({
        createLinksWriteStream: jest.fn().mockResolvedValue(
          getMockDestinationStream((chunk: ILink) => {
            processedLinks.push(chunk);
          })
        ),
      });
      const engine = createTransferEngine(completeSource, completeDestination, defaultOptions);

      await engine.transferLinks();

      expect(completeDestination.createLinksWriteStream).toHaveBeenCalled();
      expect(processedLinks).toStrictEqual(defaultLinksData);
    });
  });

  describe('integrity checks', () => {
    describe('schema matching', () => {
      describe('exact', () => {
        const engineOptions = {
          versionStrategy: 'exact',
          schemaStrategy: 'exact',
          exclude: [],
        } as unknown as ITransferEngineOptions;

        test('source with source schema missing in destination fails', async () => {
          const source = createSource();
          source.getSchemas = jest.fn().mockResolvedValue({ ...schemas, foo: { foo: 'bar' } });
          const engine = createTransferEngine(source, completeDestination, engineOptions);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });

        test('source with destination schema missing in source fails', async () => {
          const destination = createDestination();
          destination.getSchemas = jest.fn().mockResolvedValue({ ...schemas, foo: { foo: 'bar' } });
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

          if (fakeSchema['admin::permission'].attributes.action) {
            fakeSchema['admin::permission'].attributes.action.minLength = 2;
          }

          destination.getSchemas = jest.fn().mockResolvedValue(fakeSchema);
          const engine = createTransferEngine(completeSource, destination, engineOptions);
          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow();
        });
      });

      describe('strict', () => {
        const engineOptions = {
          versionStrategy: 'exact',
          schemaStrategy: 'strict',
          exclude: [],
        } as unknown as ITransferEngineOptions;

        test.each([
          ['private', (v: boolean) => !v],
          ['required', (v: boolean) => !v],
          ['configurable', (v: boolean) => v],
          ['default', () => () => null],
        ])(
          `Don't throw on ignorable attribute's properties: %s`,
          (attributeName, transformValue) => {
            const destination = createDestination();
            const fakeSchemas = cloneDeep(schemas);

            const path = `attributes.createdAt.${attributeName}`;
            const oldValue = get(path, fakeSchemas['api::homepage.homepage']);

            fakeSchemas['api::homepage.homepage'] = set(
              path,
              transformValue(oldValue),
              fakeSchemas['api::homepage.homepage']
            );

            destination.getSchemas = jest.fn().mockResolvedValue(fakeSchemas);
            const engine = createTransferEngine(completeSource, destination, engineOptions);

            expect(
              (async () => {
                await engine.transfer();
              })()
            ).resolves.not.toThrow();
          }
        );

        test(`Throws on regular attributes' properties`, () => {
          const destination = createDestination();
          const fakeSchemas = set(
            '["api::homepage.homepage"].attributes.createdAt.type',
            'string',
            cloneDeep(schemas)
          );

          destination.getSchemas = jest.fn().mockResolvedValue(fakeSchemas);
          const engine = createTransferEngine(completeSource, destination, engineOptions);

          expect(
            (async () => {
              await engine.transfer();
            })()
          ).rejects.toThrow(
            new TransferEngineValidationError(`Invalid schema changes detected during integrity checks (using the strict strategy). Please find a summary of the changes below:
- api::homepage.homepage:
  - Schema value changed at "attributes.createdAt.type": "datetime" (string) => "string" (string)`)
          );
        });
      });
    });

    describe('version matching', () => {
      test('works with invalid version string', async () => {
        const versionsThatFail = ['foo', 'z1.2.3', '1.2.3z'];
        const options: ITransferEngineOptions = {
          ...defaultOptions,
          versionStrategy: 'exact',
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
          versionStrategy: 'exact',
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
          versionStrategy: 'major',
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
          versionStrategy: 'minor',
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
          versionStrategy: 'patch',
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
          versionStrategy: 'ignore',
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

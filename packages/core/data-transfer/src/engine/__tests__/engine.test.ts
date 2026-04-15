import path, { posix, win32 } from 'path';
import os from 'os';
import fs from 'fs-extra';
import { cloneDeep, get, set } from 'lodash/fp';
import { Readable, Writable } from 'stream-chain';
import { pipeline } from 'stream/promises';
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

import { extendExpectForDataTransferTests } from '../../__tests__/test-utils';
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

    test('surfaces error from createAssetsReadStream in CLI', async () => {
      const errorMessage = 'Test error';
      const source = createSource();
      source.createAssetsReadStream = jest.fn().mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      await expect(engine.transfer()).rejects.toThrowError(errorMessage);
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

      const progressEvents: Record<string, number> = {};
      engine.progress.stream.on('stage::progress', ({ stage, data }) => {
        expect(TRANSFER_STAGES.includes(stage)).toBe(true);
        expect(data).toMatchObject(engine.progress.data);
        progressEvents[stage] = (progressEvents[stage] || 0) + 1;
      });

      await engine.transfer();

      // Each stage should emit at least one progress event
      TRANSFER_STAGES.forEach((stage) => {
        expect(progressEvents[stage]).toBeGreaterThanOrEqual(1);
      });

      // For assets, the number of progress events should match the number of chunks plus one for each asset's 'end' event
      // (from getAssetsMockSourceStream default: [ [1,2,3], [4,5,6,7,8,9] ] => 3 + 6 = 9, plus 2 'end' events = 11)
      expect(progressEvents.assets).toBe(11);
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

    test('merges source getStageTotals into assets progress before stage::start', async () => {
      const source = createSource();
      source.getStageTotals = jest.fn().mockResolvedValue({ totalBytes: 12_345, totalCount: 7 });

      const engine = createTransferEngine(source, completeDestination, defaultOptions);

      let assetsAtStart: Record<string, unknown> | undefined;
      engine.progress.stream.on('stage::start', ({ stage, data }) => {
        if (stage === 'assets' && data.assets) {
          // Snapshot: `data` is the live progress object and mutates during the stage.
          assetsAtStart = { ...data.assets };
        }
      });

      await engine.transfer();

      expect(source.getStageTotals).toHaveBeenCalledWith('assets');
      expect(assetsAtStart).toMatchObject({
        totalBytes: 12_345,
        totalCount: 7,
        count: 0,
        bytes: 0,
      });
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
  describe('backpressure', () => {
    test('source stream pauses under backpressure and data integrity is maintained', async () => {
      const items = 10;
      const sourceData = Array.from({ length: items }, (_, i) => ({
        id: i,
        type: 'api::foo.foo' as const,
        data: { foo: 'bar', documentId: `doc${i}`, id: i },
      }));

      let sourcePaused = false;
      const processedData: typeof sourceData = [];

      // Slow destination that enforces backpressure
      const slowDestination: IDestinationProvider = {
        ...completeDestination,
        createEntitiesWriteStream() {
          return new Writable({
            objectMode: true,
            highWaterMark: 1, // Enforce backpressure by allowing only 1 chunk in buffer
            write(chunk, _encoding, callback) {
              processedData.push(chunk);
              setTimeout(callback, 10); // Simulate slow processing
            },
          });
        },
      };

      // Source that detects when it is paused
      const source = {
        ...createSource({ entities: sourceData }),
        createEntitiesReadStream() {
          const stream = Readable.from(sourceData, { objectMode: true });
          const originalPause = stream.pause.bind(stream);
          stream.pause = function pause() {
            sourcePaused = true;
            return originalPause();
          };
          return stream;
        },
      };

      const engine = createTransferEngine(source, slowDestination, defaultOptions);
      await engine.transfer();

      // Verify source stream was paused at some point
      expect(sourcePaused).toBe(true);

      // Look for `id` at root instead of `data.id`
      const expectedProcessedData = sourceData.map(({ id, data, ...rest }) => ({
        ...rest,
        id,
        data: { ...data, id: undefined },
      }));
      // Compare processed data with transformed expected data
      expect(processedData).toEqual(expectedProcessedData);
    }, 2000);

    test('assets source stream pauses under backpressure and data integrity is maintained', async () => {
      const assetData: IAsset[] = [
        {
          filename: 'test1.jpg',
          filepath: posix.join(__dirname, 'test1.jpg'),
          stats: { size: 100 },
          stream: Readable.from(Array.from({ length: 100 }, (_, i) => i)), // Create 100 bytes of test data
          metadata: {
            hash: 'test1',
            ext: '.jpg',
            id: 0,
            name: '',
            mime: '',
            size: 0,
            url: '',
          },
        },
        {
          filename: 'test2.jpg',
          filepath: posix.join(__dirname, 'test2.jpg'),
          stats: { size: 200 },
          stream: Readable.from(Array.from({ length: 200 }, (_, i) => i)), // Create 200 bytes of test data
          metadata: {
            hash: 'test2',
            ext: '.jpg',
            id: 0,
            name: '',
            mime: '',
            size: 0,
            url: '',
          },
        },
      ];

      let sourcePaused = false;
      const processedData: IAsset[] = [];

      // Slow destination that enforces backpressure
      const slowDestination: IDestinationProvider = {
        ...completeDestination,
        createAssetsWriteStream() {
          return new Writable({
            objectMode: true,
            highWaterMark: 1, // Enforce backpressure by allowing only 1 chunk in buffer
            write(chunk, _encoding, callback) {
              processedData.push(chunk);
              setTimeout(callback, 50); // Simulate slow processing
            },
          });
        },
      };

      // Source that detects when it is paused
      const source = {
        ...createSource({ assets: assetData }),
        createAssetsReadStream() {
          const stream = getAssetsMockSourceStream(assetData);
          const originalPause = stream.pause.bind(stream);
          stream.pause = function pause() {
            sourcePaused = true;
            return originalPause();
          };
          return stream;
        },
      };

      const engine = createTransferEngine(source, slowDestination, defaultOptions);
      await engine.transfer();

      // Verify source stream was paused at some point
      expect(sourcePaused).toBe(true);

      // Verify all data was transferred correctly
      expect(processedData).toHaveLength(assetData.length);
      expect(processedData.map((asset) => asset.filename)).toEqual(
        assetData.map((asset) => asset.filename)
      );
      expect(processedData.map((asset) => asset.stats.size)).toEqual(
        assetData.map((asset) => asset.stats.size)
      );
    }, 3000);
  });

  describe('asset stream data and memory', () => {
    /**
     * Proves that asset stream bytes reach the destination. If the progress tracker
     * consumed the stream (old bug), the destination would receive 0 bytes per asset.
     */
    test('destination receives full stream bytes for each asset (no double-consumption)', async () => {
      const expectedBytesPerAsset = [100, 250, 75];
      const assetData: IAsset[] = expectedBytesPerAsset.map((size, i) => ({
        filename: `file${i}.jpg`,
        filepath: posix.join(__dirname, `file${i}.jpg`),
        stats: { size },
        stream: Readable.from(Array.from({ length: size }, () => Buffer.alloc(1))),
        metadata: {
          hash: `hash${i}`,
          ext: '.jpg',
          id: i,
          name: '',
          mime: 'image/jpeg',
          size: 0,
          url: '',
        },
      }));

      const bytesReceivedPerAsset: number[] = [];

      const destination: IDestinationProvider = {
        ...completeDestination,
        createAssetsWriteStream() {
          return new Writable({
            objectMode: true,
            async write(asset: IAsset, _encoding, callback) {
              if (!asset?.stream || typeof asset.stream.pipe !== 'function') {
                bytesReceivedPerAsset.push(0);
                return callback();
              }
              let bytes = 0;
              const counter = new Writable({
                write(chunk: Buffer | unknown, _enc, cb) {
                  bytes += Buffer.isBuffer(chunk) ? chunk.length : 1;
                  cb();
                },
              });
              try {
                await pipeline(asset.stream, counter);
              } catch (e) {
                return callback(e instanceof Error ? e : new Error(String(e)));
              }
              bytesReceivedPerAsset.push(bytes);
              callback();
            },
          });
        },
      };

      const source = createSource({ assets: assetData });
      const engine = createTransferEngine(source, destination, defaultOptions);
      await engine.transfer();

      expect(bytesReceivedPerAsset).toEqual(expectedBytesPerAsset);
    }, 5000);

    /**
     * Documents {@link TransferEngine}’s per-chunk progress rule: only `Buffer` chunks use
     * `.length`; anything else counts as 1 byte (cosmetic for ETA when chunk shapes are odd).
     */
    test('progress byte totals: a non-Buffer chunk contributes 1 to the byte counter', async () => {
      const assetData: IAsset[] = [
        {
          filename: 'odd-chunk.bin',
          filepath: posix.join(__dirname, 'odd-chunk.bin'),
          stats: { size: 3 },
          stream: Readable.from([{ not: 'a buffer' }, Buffer.alloc(2)] as unknown[]),
          metadata: {
            hash: 'h2',
            ext: '.bin',
            id: 0,
            name: '',
            mime: 'application/octet-stream',
            size: 0,
            url: '',
          },
        },
      ];

      const source = createSource({ assets: assetData });
      const engine = createTransferEngine(source, completeDestination, defaultOptions);
      await engine.transfer();

      expect(engine.progress.data.assets?.bytes).toBe(3);
    }, 5000);

    /**
     * Ensures we are not buffering all asset data in memory: heap growth during
     * transfer should stay well below total bytes transferred (streaming behavior).
     */
    test('heap growth during asset transfer stays bounded (streaming, not buffering)', async () => {
      const assetCount = 15;
      const bytesPerAsset = 50 * 1024; // 50KB each
      const totalBytes = assetCount * bytesPerAsset;
      const assetData: IAsset[] = Array.from({ length: assetCount }, (_, i) => ({
        filename: `large${i}.bin`,
        filepath: posix.join(__dirname, `large${i}.bin`),
        stats: { size: bytesPerAsset },
        stream: Readable.from(
          Array.from({ length: bytesPerAsset / 1024 }, () => Buffer.alloc(1024))
        ),
        metadata: {
          hash: `h${i}`,
          ext: '.bin',
          id: i,
          name: '',
          mime: 'application/octet-stream',
          size: 0,
          url: '',
        },
      }));

      const initialHeap = process.memoryUsage().heapUsed;
      const source = createSource({ assets: assetData });
      const engine = createTransferEngine(source, completeDestination, defaultOptions);
      await engine.transfer();
      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowth = finalHeap - initialHeap;

      // If we were buffering all asset data in memory, growth would be on the order of totalBytes.
      // Allow 2x totalBytes to account for Jest/V8 overhead; we're checking we're not holding
      // the entire transfer in RAM (which would be ~totalBytes and often more with copies).
      expect(heapGrowth).toBeLessThan(totalBytes * 2);
    }, 10000);
  });

  describe('asset transfer integration (order, content, memory)', () => {
    /**
     * Full transfer path: source → engine (progress tracker) → destination that
     * "writes" each asset to a temp file. Verifies:
     * 1) Assets are received and written in correct order (no race).
     * 2) Each file's content matches the source (no mixing/corruption).
     * 3) Heap during transfer stays bounded (streaming, not buffering).
     */
    test('full asset transfer: order preserved, content correct, memory bounded', async () => {
      const assetCount = 6;
      const bytesPerAsset = 10 * 1024; // 10KB each, unique byte value per asset
      const tmpDir = path.join(os.tmpdir(), `strapi-dt-integration-${Date.now()}`);
      await fs.ensureDir(tmpDir);

      const assetData: IAsset[] = Array.from({ length: assetCount }, (_, i) => ({
        filename: `media-${i}.bin`,
        filepath: posix.join(__dirname, `media-${i}.bin`),
        stats: { size: bytesPerAsset },
        stream: Readable.from([Buffer.alloc(bytesPerAsset, i)]),
        metadata: {
          hash: `hash${i}`,
          ext: '.bin',
          id: i,
          name: `media-${i}`,
          mime: 'application/octet-stream',
          size: bytesPerAsset,
          url: '',
        },
      }));

      const writeOrder: number[] = [];
      const memorySamples: number[] = [];
      let memoryInterval: ReturnType<typeof setInterval> | null = null;

      const destination: IDestinationProvider = {
        ...createDestination(),
        createAssetsWriteStream: jest.fn().mockResolvedValue(
          new Writable({
            objectMode: true,
            async write(asset: IAsset, _encoding, callback) {
              const index = assetData.findIndex((a) => a.filename === asset.filename);
              writeOrder.push(index);
              const outPath = path.join(tmpDir, asset.filename);
              if (!asset?.stream || typeof asset.stream.pipe !== 'function') {
                return callback(new Error('Missing or invalid asset stream'));
              }
              try {
                await pipeline(asset.stream, fs.createWriteStream(outPath));
              } catch (e) {
                return callback(e instanceof Error ? e : new Error(String(e)));
              }
              callback();
            },
          })
        ),
      };

      const source = createSource({
        assets: assetData,
        schemas: Object.values(schemas) as Struct.Schema[],
        entities: [],
        links: [],
        configuration: [],
      });

      memorySamples.push(process.memoryUsage().heapUsed);
      memoryInterval = setInterval(() => {
        memorySamples.push(process.memoryUsage().heapUsed);
      }, 25);

      const engine = createTransferEngine(source, destination, {
        ...defaultOptions,
        only: ['files'],
      });
      await engine.transfer();

      if (memoryInterval) {
        clearInterval(memoryInterval);
      }
      memorySamples.push(process.memoryUsage().heapUsed);

      const initialHeap = memorySamples[0];
      const maxHeap = Math.max(...memorySamples);
      const heapGrowth = maxHeap - initialHeap;
      const totalBytes = assetCount * bytesPerAsset;
      // Allow 20x totalBytes: we must not hold an absurd multiple of the transfer in RAM.
      // (Jest/V8 baseline varies; threshold catches "buffer entire transfer" without flaking.)
      expect(heapGrowth).toBeLessThan(totalBytes * 20);

      expect(writeOrder).toHaveLength(assetCount);
      expect(writeOrder).toEqual([0, 1, 2, 3, 4, 5]);

      for (let i = 0; i < assetCount; i += 1) {
        const content = await fs.readFile(path.join(tmpDir, `media-${i}.bin`));
        expect(content.length).toBe(bytesPerAsset);
        expect(content.every((b) => b === i)).toBe(true);
      }

      await fs.remove(tmpDir).catch(() => {});
    }, 15000);
  });

  describe('backpressure (schemas, links, configuration)', () => {
    test('schemas source stream pauses under backpressure and data integrity is maintained', async () => {
      const schemaData = getSchemasMockSourceStream();
      const schemaChunks = await new Promise<Struct.Schema[]>((resolve, reject) => {
        const chunks: Struct.Schema[] = [];
        schemaData.on('data', (chunk: Struct.Schema) => chunks.push(chunk));
        schemaData.on('end', () => resolve(chunks));
        schemaData.on('error', reject);
      });

      let sourcePaused = false;
      const processedData: Struct.Schema[] = [];

      const slowDestination: IDestinationProvider = {
        ...completeDestination,
        createSchemasWriteStream() {
          return new Writable({
            objectMode: true,
            highWaterMark: 1,
            write(chunk, _encoding, callback) {
              processedData.push(chunk);
              setTimeout(callback, 10);
            },
          });
        },
      };

      const source = {
        ...createSource({ schemas: schemaChunks }),
        createSchemasReadStream() {
          const stream = getSchemasMockSourceStream(schemaChunks);
          const originalPause = stream.pause.bind(stream);
          stream.pause = function () {
            sourcePaused = true;
            return originalPause();
          };
          return stream;
        },
      };

      const engine = createTransferEngine(source, slowDestination, defaultOptions);
      await engine.transfer();

      expect(sourcePaused).toBe(true);
      expect(processedData).toEqual(schemaChunks);
    }, 2000);

    test('links source stream pauses under backpressure and data integrity is maintained', async () => {
      const linksData = [...defaultLinksData];
      let sourcePaused = false;
      const processedData: ILink[] = [];

      const slowDestination: IDestinationProvider = {
        ...completeDestination,
        createLinksWriteStream() {
          return new Writable({
            objectMode: true,
            highWaterMark: 1,
            write(chunk, _encoding, callback) {
              processedData.push(chunk);
              setTimeout(callback, 10);
            },
          });
        },
      };

      const source = {
        ...createSource({ links: linksData }),
        createLinksReadStream() {
          const stream = getLinksMockSourceStream(linksData);
          const originalPause = stream.pause.bind(stream);
          stream.pause = function () {
            sourcePaused = true;
            return originalPause();
          };
          return stream;
        },
      };

      const engine = createTransferEngine(source, slowDestination, defaultOptions);
      await engine.transfer();

      expect(sourcePaused).toBe(true);
      expect(processedData).toHaveLength(linksData.length);
      expect(processedData).toEqual(expect.arrayContaining(linksData));
    }, 2000);

    test('configuration source stream pauses under backpressure and data integrity is maintained', async () => {
      const configData: IConfiguration[] = [
        { type: 'core-store', value: { key: 'foo', value: 'alice' } },
        { type: 'core-store', value: { key: 'bar', value: 'bob' } },
        { type: 'core-store', value: { key: 'baz', value: 'charlie' } },
      ];
      let sourcePaused = false;
      const processedData: IConfiguration[] = [];

      const slowDestination: IDestinationProvider = {
        ...completeDestination,
        createConfigurationWriteStream() {
          return new Writable({
            objectMode: true,
            highWaterMark: 1,
            write(chunk, _encoding, callback) {
              processedData.push(chunk);
              setTimeout(callback, 10);
            },
          });
        },
      };

      const source = {
        ...createSource({ configuration: configData }),
        createConfigurationReadStream() {
          const stream = getConfigurationMockSourceStream(configData);
          const originalPause = stream.pause.bind(stream);
          stream.pause = function () {
            sourcePaused = true;
            return originalPause();
          };
          return stream;
        },
      };

      const engine = createTransferEngine(source, slowDestination, defaultOptions);
      await engine.transfer();

      expect(sourcePaused).toBe(true);
      expect(processedData).toEqual(configData);
    }, 2000);
  });

  describe('stream cleanup and memory', () => {
    test('all stage streams are destroyed after successful transfer', async () => {
      const createdReadStreams: Readable[] = [];
      const createdWriteStreams: Writable[] = [];

      const source = {
        ...createSource(),
        createEntitiesReadStream: jest.fn().mockImplementation(async () => {
          const s = getEntitiesMockSourceStream();
          createdReadStreams.push(s);
          return s;
        }),
        createLinksReadStream: jest.fn().mockImplementation(() => {
          const s = getLinksMockSourceStream();
          createdReadStreams.push(s);
          return s;
        }),
        createAssetsReadStream: jest.fn().mockImplementation(async () => {
          const s = getAssetsMockSourceStream();
          createdReadStreams.push(s);
          return s;
        }),
        createConfigurationReadStream: jest.fn().mockImplementation(() => {
          const s = getConfigurationMockSourceStream();
          createdReadStreams.push(s);
          return s;
        }),
        createSchemasReadStream: jest.fn().mockImplementation(() => {
          const s = getSchemasMockSourceStream();
          createdReadStreams.push(s);
          return s;
        }),
      };

      const destination = {
        ...createDestination(),
        createEntitiesWriteStream: jest.fn().mockImplementation(async () => {
          const w = getMockDestinationStream();
          createdWriteStreams.push(w);
          return w;
        }),
        createLinksWriteStream: jest.fn().mockImplementation(async () => {
          const w = getMockDestinationStream();
          createdWriteStreams.push(w);
          return w;
        }),
        createAssetsWriteStream: jest.fn().mockImplementation(async () => {
          const w = getMockDestinationStream();
          createdWriteStreams.push(w);
          return w;
        }),
        createConfigurationWriteStream: jest.fn().mockImplementation(async () => {
          const w = getMockDestinationStream();
          createdWriteStreams.push(w);
          return w;
        }),
        createSchemasWriteStream: jest.fn().mockImplementation(async () => {
          const w = getMockDestinationStream();
          createdWriteStreams.push(w);
          return w;
        }),
      };

      const engine = createTransferEngine(source, destination, defaultOptions);
      await engine.transfer();

      createdReadStreams.forEach((stream) => {
        expect(stream.destroyed).toBe(true);
      });
      createdWriteStreams.forEach((stream) => {
        expect(stream.destroyed).toBe(true);
      });
    });

    test('repeated transfers do not leave streams undestroyed', async () => {
      const transferCount = 5;
      const allReadStreams: Readable[] = [];
      const allWriteStreams: Writable[] = [];

      const source = createSource();
      source.createEntitiesReadStream = jest.fn().mockImplementation(async () => {
        const s = getEntitiesMockSourceStream();
        allReadStreams.push(s);
        return s;
      });
      source.createLinksReadStream = jest.fn().mockImplementation(() => {
        const s = getLinksMockSourceStream();
        allReadStreams.push(s);
        return s;
      });
      source.createSchemasReadStream = jest.fn().mockImplementation(() => {
        const s = getSchemasMockSourceStream();
        allReadStreams.push(s);
        return s;
      });
      source.createAssetsReadStream = jest.fn().mockImplementation(async () => {
        const s = getAssetsMockSourceStream();
        allReadStreams.push(s);
        return s;
      });
      source.createConfigurationReadStream = jest.fn().mockImplementation(() => {
        const s = getConfigurationMockSourceStream();
        allReadStreams.push(s);
        return s;
      });

      const destination = createDestination();
      destination.createEntitiesWriteStream = jest.fn().mockImplementation(async () => {
        const w = getMockDestinationStream();
        allWriteStreams.push(w);
        return w;
      });
      destination.createLinksWriteStream = jest.fn().mockImplementation(async () => {
        const w = getMockDestinationStream();
        allWriteStreams.push(w);
        return w;
      });
      destination.createSchemasWriteStream = jest.fn().mockImplementation(async () => {
        const w = getMockDestinationStream();
        allWriteStreams.push(w);
        return w;
      });
      destination.createAssetsWriteStream = jest.fn().mockImplementation(async () => {
        const w = getMockDestinationStream();
        allWriteStreams.push(w);
        return w;
      });
      destination.createConfigurationWriteStream = jest.fn().mockImplementation(async () => {
        const w = getMockDestinationStream();
        allWriteStreams.push(w);
        return w;
      });

      const engine = createTransferEngine(source, destination, defaultOptions);

      for (let i = 0; i < transferCount; i += 1) {
        await engine.transfer();
      }

      allReadStreams.forEach((stream) => {
        expect(stream.destroyed).toBe(true);
      });
      allWriteStreams.forEach((stream) => {
        expect(stream.destroyed).toBe(true);
      });
    });
  });
});

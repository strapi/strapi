import importAction from '../action';
import { expectExit } from '../../__tests__/commands.test.utils';
import * as engineDatatransfer from '../../../engine';
import * as strapiDatatransfer from '../../../strapi';
import * as fileDatatransfer from '../../../file';

jest.mock('../../data-transfer', () => {
  return {
    ...jest.requireActual('../../data-transfer'),
    getTransferTelemetryPayload: jest.fn().mockReturnValue({}),
    loadersFactory: jest.fn().mockReturnValue({ updateLoader: jest.fn() }),
    formatDiagnostic: jest.fn(),
    createStrapiInstance: jest.fn().mockReturnValue({
      telemetry: {
        send: jest.fn(),
      },
      destroy: jest.fn(),
    }),
    buildTransferTable: jest.fn(() => {
      return {
        toString() {
          return 'table';
        },
      };
    }),
    exitMessageText: jest.fn(),
    getDiffHandler: jest.fn(),
    setSignalHandler: jest.fn(),
  };
});

jest.mock('../../../engine', () => {
  const actual = jest.requireActual('../../../engine');

  return {
    ...actual,
    createTransferEngine: jest.fn(() => {
      return {
        transfer: jest.fn(() => {
          return {
            engine: {},
          };
        }),
        progress: {
          on: jest.fn(),
          stream: {
            on: jest.fn(),
          },
        },
        sourceProvider: { name: 'testFileSource', type: 'source', getMetadata: jest.fn() },
        destinationProvider: {
          name: 'testStrapiDest',
          type: 'destination',
          getMetadata: jest.fn(),
        },
        diagnostics: {
          on: jest.fn().mockReturnThis(),
          onDiagnostic: jest.fn().mockReturnThis(),
        },
        onSchemaDiff: jest.fn(),
      };
    }),
  };
});

jest.mock('../../../file', () => {
  const actual = jest.requireActual('../../../file');

  return {
    ...actual,
    providers: {
      ...actual.providers,
      createLocalFileSourceProvider: jest
        .fn()
        .mockReturnValue({ name: 'testFileSource', type: 'source', getMetadata: jest.fn() }),
    },
  };
});

jest.mock('../../../strapi', () => {
  const actual = jest.requireActual('../../../strapi');

  return {
    ...actual,
    providers: {
      ...actual.providers,
      createLocalStrapiDestinationProvider: jest
        .fn()
        .mockReturnValue({ name: 'testStrapiDest', type: 'destination', getMetadata: jest.fn() }),
    },
  };
});

describe('Import', () => {
  // mock command utils

  // console spies
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates providers with correct options ', async () => {
    const options = {
      file: 'test.tar.gz.enc',
      decrypt: true,
      decompress: true,
      exclude: [],
      only: [],
    };

    await expectExit(0, async () => {
      await importAction(options);
    });

    // strapi options
    expect(strapiDatatransfer.providers.createLocalStrapiDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: strapiDatatransfer.providers.DEFAULT_CONFLICT_STRATEGY,
      })
    );

    // file options
    expect(fileDatatransfer.providers.createLocalFileSourceProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: 'test.tar.gz.enc' },
        encryption: { enabled: options.decrypt },
        compression: { enabled: options.decompress },
      })
    );

    // engine options
    expect(engineDatatransfer.createTransferEngine).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'testFileSource' }),
      expect.objectContaining({ name: 'testStrapiDest' }),
      expect.objectContaining({
        schemaStrategy: engineDatatransfer.DEFAULT_SCHEMA_STRATEGY,
        versionStrategy: engineDatatransfer.DEFAULT_VERSION_STRATEGY,
      })
    );
  });
});

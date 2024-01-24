import {
  engine as engineDataTransfer,
  strapi as strapiDataTransfer,
  file as fileDataTransfer,
} from '@strapi/data-transfer';

import importAction from '../action';
import { expectExit } from '../../__tests__/commands.test.utils';

jest.mock('../../../utils/data-transfer', () => {
  return {
    ...jest.requireActual('../../../utils/data-transfer'),
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

jest.mock('@strapi/data-transfer', () => {
  const actual = jest.requireActual('@strapi/data-transfer');

  return {
    ...actual,
    file: {
      ...actual.file,
      providers: {
        ...actual.file.providers,
        createLocalFileSourceProvider: jest
          .fn()
          .mockReturnValue({ name: 'testFileSource', type: 'source', getMetadata: jest.fn() }),
      },
    },
    strapi: {
      ...actual.strapi,
      providers: {
        ...actual.strapi.providers,
        createLocalStrapiDestinationProvider: jest
          .fn()
          .mockReturnValue({ name: 'testStrapiDest', type: 'destination', getMetadata: jest.fn() }),
      },
    },
    engine: {
      ...actual.engine,
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
    expect(strapiDataTransfer.providers.createLocalStrapiDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: strapiDataTransfer.providers.DEFAULT_CONFLICT_STRATEGY,
      })
    );

    // file options
    expect(fileDataTransfer.providers.createLocalFileSourceProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: 'test.tar.gz.enc' },
        encryption: { enabled: options.decrypt },
        compression: { enabled: options.decompress },
      })
    );

    // engine options
    expect(engineDataTransfer.createTransferEngine).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'testFileSource' }),
      expect.objectContaining({ name: 'testStrapiDest' }),
      expect.objectContaining({
        schemaStrategy: engineDataTransfer.DEFAULT_SCHEMA_STRATEGY,
        versionStrategy: engineDataTransfer.DEFAULT_VERSION_STRATEGY,
      })
    );
  });
});

import { file as fileDataTransfer } from '@strapi/data-transfer';

import exportAction from '../action';
import * as mockUtils from '../../../utils/data-transfer';
import { expectExit } from '../../__tests__/commands.test.utils';

jest.mock('fs-extra', () => ({
  ...jest.requireActual('fs-extra'),
  pathExists: jest.fn(() => Promise.resolve(true)),
}));

const defaultFileName = 'defaultFilename';

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
    getDefaultExportName: jest.fn(() => defaultFileName),
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
        createLocalFileDestinationProvider: jest.fn().mockReturnValue({
          name: 'testFileDestination',
          type: 'destination',
          getMetadata: jest.fn(),
        }),
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
              destination: {
                file: {
                  path: 'path',
                },
              },
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
          addErrorHandler: jest.fn(),
        };
      }),
    },
  };
});

describe('Export', () => {
  // command utils

  // console spies
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses path provided by user', async () => {
    const filename = 'test';

    await expectExit(0, async () => {
      await exportAction({ file: filename });
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(fileDataTransfer.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: filename },
      })
    );
    expect(mockUtils.getDefaultExportName).not.toHaveBeenCalled();
  });

  it('uses default path if not provided by user', async () => {
    await expectExit(0, async () => {
      await exportAction({});
    });

    expect(mockUtils.getDefaultExportName).toHaveBeenCalledTimes(1);
    expect(fileDataTransfer.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: defaultFileName },
      })
    );
  });

  it('encrypts the output file if specified', async () => {
    const encrypt = true;
    await expectExit(0, async () => {
      await exportAction({ encrypt });
    });

    expect(fileDataTransfer.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt },
      })
    );
  });

  it('encrypts the output file with the given key', async () => {
    const key = 'secret-key';
    const encrypt = true;
    await expectExit(0, async () => {
      await exportAction({ encrypt, key });
    });

    expect(fileDataTransfer.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt, key },
      })
    );
  });

  it('uses compress option', async () => {
    await expectExit(0, async () => {
      await exportAction({ compress: false });
    });

    expect(fileDataTransfer.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: false },
      })
    );
    await expectExit(0, async () => {
      await exportAction({ compress: true });
    });
    expect(fileDataTransfer.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: true },
      })
    );
  });
});

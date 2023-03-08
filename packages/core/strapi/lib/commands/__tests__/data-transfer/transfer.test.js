'use strict';

const { expectExit } = require('./shared/transfer.test.utils');

describe('Transfer', () => {
  // mock utils
  const mockUtils = {
    loadersFactory: jest.fn().mockReturnValue({ updateLoader: jest.fn() }),
    formatDiagnostic: jest.fn(),
    createStrapiInstance() {
      return {
        telemetry: {
          send: jest.fn(),
        },
      };
    },
    getDefaultExportName: jest.fn(() => 'default'),
    buildTransferTable: jest.fn(() => {
      return {
        toString() {
          return 'table';
        },
      };
    }),
  };
  jest.mock(
    '../../transfer/utils',
    () => {
      return mockUtils;
    },
    { virtual: true }
  );

  const mockDataTransfer = {
    strapi: {
      providers: {
        createLocalStrapiSourceProvider: jest.fn().mockReturnValue({ name: 'testLocalSource' }),
        createRemoteStrapiDestinationProvider: jest
          .fn()
          .mockReturnValue({ name: 'testRemoteDest' }),
      },
    },
    engine: {
      createTransferEngine() {
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
          sourceProvider: { name: 'testSource' },
          destinationProvider: { name: 'testDestination' },
          diagnostics: {
            on: jest.fn().mockReturnThis(),
            onDiagnostic: jest.fn().mockReturnThis(),
          },
        };
      },
    },
  };

  jest.mock('@strapi/data-transfer', () => mockDataTransfer);

  const transferCommand = require('../../transfer/transfer');

  // console spies
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  const destinationUrl = new URL('http://strapi.com/admin');
  const destinationToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exits with error when no --to or --from is provided', async () => {
    await expectExit(1, async () => {
      await transferCommand({ from: undefined, to: undefined });
    });

    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/at least one source/i));

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).not.toHaveBeenCalled();
  });

  describe('--to', () => {
    it('exits with error when auth is not provided', async () => {
      await expectExit(1, async () => {
        await transferCommand({ from: undefined, to: destinationUrl });
      });

      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/missing token/i));

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).not.toHaveBeenCalled();
    });

    it('uses destination url and token provided by user', async () => {
      await expectExit(0, async () => {
        await transferCommand({ from: undefined, to: destinationUrl, toToken: destinationToken });
      });

      expect(console.error).not.toHaveBeenCalled();
      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          url: destinationUrl,
          auth: {
            type: 'token',
            token: destinationToken,
          },
        })
      );
    });

    it('uses local Strapi source when from is not specified', async () => {
      await expectExit(0, async () => {
        await transferCommand({ from: undefined, to: destinationUrl, toToken: destinationToken });
      });

      expect(console.error).not.toHaveBeenCalled();
      expect(mockDataTransfer.strapi.providers.createLocalStrapiSourceProvider).toHaveBeenCalled();
      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).toHaveBeenCalled();
    });
  });

  it('uses restore as the default strategy', async () => {
    await expectExit(0, async () => {
      await transferCommand({ from: undefined, to: destinationUrl, toToken: destinationToken });
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'restore',
      })
    );
  });
});

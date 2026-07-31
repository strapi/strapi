import * as mockDataTransfer from '@strapi/data-transfer';

import * as dataTransferUtils from '../../../utils/data-transfer';
import transferAction from '../action';
import { expectExit } from '../../__tests__/commands.test.utils';

jest.mock('../../../utils/data-transfer', () => {
  return {
    ...jest.requireActual('../../../utils/data-transfer'),
    getTransferTelemetryPayload: jest.fn().mockReturnValue({}),
    loadersFactory: jest.fn().mockReturnValue({ updateLoader: jest.fn() }),
    formatDiagnostic: jest.fn(),
    createStrapiInstance: jest.fn(async () => ({
      config: {
        get: jest.fn(),
      },
      telemetry: {
        send: jest.fn(),
      },
      contentTypes: {},
    })),
    getDefaultExportName: jest.fn(() => 'default'),
    buildTransferTable: jest.fn(() => {
      return {
        toString() {
          return 'table';
        },
      };
    }),
    exitMessageText: jest.fn(),
    getDiffHandler: jest.fn(),
    getAssetsBackupHandler: jest.fn(),
    setSignalHandler: jest.fn(),
  };
});

// mock data transfer
jest.mock('@strapi/data-transfer', () => {
  const actual = jest.requireActual('@strapi/data-transfer');
  return {
    ...actual,
    strapi: {
      ...actual.strapi,
      providers: {
        ...actual.strapi.providers,
        createLocalStrapiSourceProvider: jest.fn().mockReturnValue({ name: 'testLocalSource' }),
        createLocalStrapiDestinationProvider: jest.fn().mockReturnValue({ name: 'testLocalDest' }),
        createRemoteStrapiSourceProvider: jest.fn().mockReturnValue({ name: 'testRemoteSource' }),
        createRemoteStrapiDestinationProvider: jest
          .fn()
          .mockReturnValue({ name: 'testRemoteDest' }),
      },
    },
    engine: {
      ...actual.engine,
      createTransferEngine() {
        const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
        const stream = {
          on(event: string, fn: (...args: unknown[]) => void) {
            (handlers[event] ||= []).push(fn);
            return stream;
          },
        };
        return {
          transfer: jest.fn(async () => {
            // action.ts clears setInterval on this event; real stream emits after transfer.
            handlers['transfer::finish']?.forEach((fn) => fn());
            return {
              engine: {},
            };
          }),
          progress: {
            on: jest.fn(),
            stream,
          },
          sourceProvider: { name: 'testSource' },
          destinationProvider: { name: 'testDestination' },
          diagnostics: {
            on: jest.fn().mockReturnThis(),
            onDiagnostic: jest.fn().mockReturnThis(),
          },
          onSchemaDiff: jest.fn(),
          addErrorHandler: jest.fn(),
        };
      },
    },
  };
});

describe('Transfer', () => {
  // mock command utils

  // console spies
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const destinationUrl = new URL('http://one.localhost/admin');
  const destinationToken = 'test-token';

  const sourceUrl = new URL('http://two.localhost/admin');
  const sourceToken = 'test-source-token';

  beforeEach(() => {
    jest.clearAllMocks();
    (dataTransferUtils.createStrapiInstance as jest.Mock).mockImplementation(async () => ({
      config: {
        get: jest.fn(),
      },
      telemetry: {
        send: jest.fn(),
      },
      contentTypes: {},
    }));
  });

  it('exits with error when no --to or --from is provided', async () => {
    await expectExit(1, async () => {
      await transferAction({ from: undefined, to: undefined } as any);
    });

    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/one source/i));

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).not.toHaveBeenCalled();
  });

  it('exits with error when both --to and --from are provided', async () => {
    await expectExit(1, async () => {
      await transferAction({ from: sourceUrl, to: destinationUrl } as any);
    });

    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/one source/i));

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).not.toHaveBeenCalled();
  });

  describe('--to', () => {
    it('exits with error when auth is not provided', async () => {
      await expectExit(1, async () => {
        await transferAction({ from: undefined, to: destinationUrl } as any);
      });

      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/missing token/i));

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).not.toHaveBeenCalled();
    });

    it('uses destination url and token provided by user', async () => {
      await expectExit(0, async () => {
        await transferAction({
          from: undefined,
          to: destinationUrl,
          toToken: destinationToken,
        } as any);
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
        await transferAction({
          from: undefined,
          to: destinationUrl,
          toToken: destinationToken,
        } as any);
      });

      expect(console.error).not.toHaveBeenCalled();
      expect(mockDataTransfer.strapi.providers.createLocalStrapiSourceProvider).toHaveBeenCalled();
      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).toHaveBeenCalled();
    });

    it('passes verifyChecksums to remote destination when --checksums is enabled', async () => {
      await expectExit(0, async () => {
        await transferAction({
          from: undefined,
          to: destinationUrl,
          toToken: destinationToken,
          checksums: true,
        } as any);
      });

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          verifyChecksums: true,
        })
      );
    });

    it('does not pass verifyChecksums to remote destination when checksums are disabled', async () => {
      await expectExit(0, async () => {
        await transferAction({
          from: undefined,
          to: destinationUrl,
          toToken: destinationToken,
          checksums: false,
        } as any);
      });

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
      ).toHaveBeenCalledWith(expect.not.objectContaining({ verifyChecksums: true }));
    });
  });

  describe('--from', () => {
    it('exits with error when auth is not provided', async () => {
      await expectExit(1, async () => {
        await transferAction({ to: undefined, from: sourceUrl } as any);
      });

      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/missing token/i));

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiSourceProvider
      ).not.toHaveBeenCalled();
    });

    it('uses source url and token provided by user', async () => {
      await expectExit(0, async () => {
        await transferAction({
          to: undefined,
          from: sourceUrl,
          fromToken: sourceToken,
        } as any);
      });

      expect(console.error).not.toHaveBeenCalled();
      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiSourceProvider
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          url: sourceUrl,
          auth: {
            type: 'token',
            token: sourceToken,
          },
        })
      );
    });

    it('passes verifyChecksums to remote source when --checksums is enabled', async () => {
      await expectExit(0, async () => {
        await transferAction({
          to: undefined,
          from: sourceUrl,
          fromToken: sourceToken,
          checksums: true,
        } as any);
      });

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiSourceProvider
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          verifyChecksums: true,
        })
      );
    });

    it('does not pass verifyChecksums to remote source when checksums are disabled', async () => {
      await expectExit(0, async () => {
        await transferAction({
          to: undefined,
          from: sourceUrl,
          fromToken: sourceToken,
          checksums: false,
        } as any);
      });

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiSourceProvider
      ).toHaveBeenCalledWith(
        expect.not.objectContaining({
          verifyChecksums: true,
        })
      );
    });

    it('passes server.transfer.remote.assetIdleTimeoutMs to remote source provider as streamTimeout', async () => {
      (dataTransferUtils.createStrapiInstance as jest.Mock).mockImplementationOnce(async () => ({
        config: {
          get: (key: string) =>
            key === 'server.transfer.remote.assetIdleTimeoutMs' ? 99_000 : undefined,
        },
        telemetry: {
          send: jest.fn(),
        },
        contentTypes: {},
      }));

      await expectExit(0, async () => {
        await transferAction({
          to: undefined,
          from: sourceUrl,
          fromToken: sourceToken,
        } as any);
      });

      expect(
        mockDataTransfer.strapi.providers.createRemoteStrapiSourceProvider
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          url: sourceUrl,
          streamTimeout: 99_000,
        })
      );
    });

    it('uses local Strapi destination when to is not specified', async () => {
      await expectExit(0, async () => {
        await transferAction({
          to: undefined,
          from: sourceUrl,
          fromToken: sourceToken,
        } as any);
      });

      expect(console.error).not.toHaveBeenCalled();
      expect(
        mockDataTransfer.strapi.providers.createLocalStrapiDestinationProvider
      ).toHaveBeenCalled();
      expect(mockDataTransfer.strapi.providers.createRemoteStrapiSourceProvider).toHaveBeenCalled();
    });
  });

  it('uses restore as the default strategy', async () => {
    await expectExit(0, async () => {
      await transferAction({
        from: undefined,
        to: destinationUrl,
        toToken: destinationToken,
      } as any);
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

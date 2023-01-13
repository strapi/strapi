'use strict';

const utils = require('../../transfer/utils');

const mockDataTransfer = {
  strapi: {
    providers: {
      createRemoteStrapiDestinationProvider: jest.fn(),
      createLocalStrapiSourceProvider: jest.fn(),
    },
  },
  engine: {
    createTransferEngine: jest.fn().mockReturnValue({
      transfer: jest.fn().mockReturnValue(Promise.resolve({})),
    }),
  },
};

jest.mock('@strapi/data-transfer/lib/engine', () => mockDataTransfer.engine, { virtual: true });
jest.mock('@strapi/data-transfer/lib/strapi', () => mockDataTransfer.strapi, { virtual: true });

const expectExit = async (code, fn) => {
  const exit = jest.spyOn(process, 'exit').mockImplementation((number) => {
    throw new Error(`process.exit: ${number}`);
  });
  await expect(async () => {
    await fn();
  }).rejects.toThrow();
  expect(exit).toHaveBeenCalledWith(code);
  exit.mockRestore();
};

const transferCommand = require('../../transfer/transfer');

jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

jest.mock('../../transfer/utils');

const destinationUrl = new URL('http://strapi.com/admin');

describe('Transfer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uses destination url provided by user without authentication', async () => {
    await expectExit(1, async () => {
      await transferCommand({ from: undefined, to: destinationUrl });
    });

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        url: destinationUrl,
      })
    );
  });

  it.todo('uses destination url provided by user with authentication');

  it('uses restore as the default strategy', async () => {
    await expectExit(1, async () => {
      await transferCommand({ from: undefined, to: destinationUrl });
    });

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'restore',
      })
    );
  });
  it('uses destination url provided by user without authentication', async () => {
    await expectExit(1, async () => {
      await transferCommand({ from: undefined, to: destinationUrl });
    });

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        url: destinationUrl,
      })
    );
  });

  it('uses restore as the default strategy', async () => {
    await expectExit(1, async () => {
      await transferCommand({ from: undefined, to: destinationUrl });
    });

    expect(
      mockDataTransfer.strapi.providers.createRemoteStrapiDestinationProvider
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: 'restore',
      })
    );
  });

  it('uses local strapi instance when local specified', async () => {
    await expectExit(1, async () => {
      await transferCommand({ from: undefined, to: destinationUrl });
    });

    expect(mockDataTransfer.strapi.providers.createLocalStrapiSourceProvider).toHaveBeenCalled();
    expect(utils.createStrapiInstance).toHaveBeenCalled();
  });
});

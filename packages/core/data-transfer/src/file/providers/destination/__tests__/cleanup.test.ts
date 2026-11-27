import path from 'path';
import os from 'os';
import { Writable } from 'stream';
import fs from 'fs-extra';

import { createLocalFileDestinationProvider } from '..';
import * as esmDeps from '../../../../utils/esm-deps';

jest.mock('../../../../utils/esm-deps', () => {
  const actual = jest.requireActual('../../../../utils/esm-deps') as typeof esmDeps;
  return {
    ...actual,
    loadStreamDeps: jest.fn((...args: Parameters<typeof actual.loadStreamDeps>) =>
      actual.loadStreamDeps(...args)
    ),
  };
});

describe('Local file destination cleanup', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dts-file-destination-'));
  });

  afterEach(async () => {
    await fs.remove(tempDirectory);
  });

  test('close is a no-op after rollback finalizes and removes the archive', async () => {
    const outputPath = path.join(tempDirectory, 'export');
    const archivePath = `${outputPath}.tar`;
    const provider = createLocalFileDestinationProvider({
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: outputPath },
    });
    provider.setMetadata('source', {
      createdAt: new Date().toISOString(),
      strapi: { version: '5.0.0' },
    });

    await provider.bootstrap({ report: jest.fn() } as never);
    await provider.rollback();
    await provider.close();

    expect(await fs.pathExists(archivePath)).toBe(false);
  });

  test('a missing output directory fails close instead of crashing the process', async () => {
    const outputPath = path.join(tempDirectory, 'missing', 'export');
    const provider = createLocalFileDestinationProvider({
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: outputPath },
    });

    const uncaught: Error[] = [];
    const onUncaught = (error: Error) => {
      uncaught.push(error);
    };
    process.on('uncaughtException', onUncaught);

    try {
      provider.bootstrap({ report: jest.fn() } as never);

      await expect(
        Promise.race([
          provider.close(),
          new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('close hung')), 2000);
          }),
        ])
      ).rejects.toThrow(/ENOENT|no such file/i);
      expect(uncaught).toEqual([]);
    } finally {
      process.off('uncaughtException', onUncaught);
    }
  });

  test('close rejects and the write stream errors when stream packages fail to load', async () => {
    const loadError = new Error("Cannot find module 'stream-chain'");
    const loadStreamDeps = esmDeps.loadStreamDeps as jest.MockedFunction<
      typeof esmDeps.loadStreamDeps
    >;
    loadStreamDeps.mockRejectedValue(loadError);

    const outputPath = path.join(tempDirectory, 'export');
    const provider = createLocalFileDestinationProvider({
      encryption: { enabled: false },
      compression: { enabled: false },
      file: { path: outputPath },
    });

    try {
      await provider.bootstrap({ report: jest.fn() } as never);
      const writeStream = provider.createEntitiesWriteStream();
      expect(writeStream).toBeInstanceOf(Writable);

      const streamError = new Promise((resolve) => {
        writeStream.once('error', resolve);
      });
      writeStream.write({ id: 1 });

      await expect(provider.close()).rejects.toBe(loadError);
      await expect(streamError).resolves.toBe(loadError);
    } finally {
      loadStreamDeps.mockReset();
      loadStreamDeps.mockImplementation(() =>
        jest.requireActual<typeof esmDeps>('../../../../utils/esm-deps').loadStreamDeps()
      );
    }
  });
});

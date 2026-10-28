import path from 'path';
import os from 'os';
import fs from 'fs-extra';

import { createLocalFileDestinationProvider } from '..';

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
});

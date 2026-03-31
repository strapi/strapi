import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

import { createLocalDirectoryDestinationProvider } from '..';

describe('Directory destination provider', () => {
  test('bootstrap creates root and sets results.file', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    expect(await fs.pathExists(dir)).toBe(true);
    expect(provider.results.file?.path).toBe(dir);
  });
});

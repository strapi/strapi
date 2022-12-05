import type { ILocalFileSourceProviderOptions } from '..';

import { Readable } from 'stream';

import { createLocalFileSourceProvider } from '..';

describe('Stream assets', () => {
  test('returns a stream', () => {
    const options: ILocalFileSourceProviderOptions = {
      backupFilePath: './test-file',
      compressed: false,
      encrypted: false,
    };
    const provider = createLocalFileSourceProvider(options);
    const stream = provider.streamAssets();

    expect(stream instanceof Readable).toBeTruthy();
  });
});

import { Readable } from 'stream';
import type { ILocalFileSourceProviderOptions } from '..';

import { createLocalFileSourceProvider } from '..';

describe('Stream assets', () => {
  test('returns a stream', () => {
    const options: ILocalFileSourceProviderOptions = {
      file: {
        path: './test-file',
      },
      compression: {
        enabled: false,
      },
      encryption: {
        enabled: false,
      },
    };
    const provider = createLocalFileSourceProvider(options);
    const stream = provider.createAssetsReadStream();

    expect(stream instanceof Readable).toBeTruthy();
  });
});

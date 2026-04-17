import { Readable } from 'stream';

import { createAssetsStream } from '../assets';

describe('Local source assets stream warnings', () => {
  test('reports warning callback when media DB row points to missing file', async () => {
    const missingFile = {
      id: 42,
      hash: 'missing-hash',
      ext: '.jpg',
      url: '/uploads/does-not-exist.jpg',
      provider: 'local',
      formats: undefined,
    };

    const warn = jest.fn();
    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([missingFile])),
        })),
      },
      dirs: {
        static: { public: '/tmp/this-path-should-not-exist-for-test' },
      },
      log: {
        warn,
      },
      plugins: {
        upload: {
          provider: {
            isPrivate: jest.fn().mockResolvedValue(false),
          },
        },
      },
      config: {
        get: jest.fn(() => ({ provider: 'local' })),
      },
    } as any;

    const onWarning = jest.fn();
    const stream = createAssetsStream(strapi, { onWarning });

    const items: unknown[] = [];
    for await (const item of stream) {
      items.push(item);
    }

    expect(items).toHaveLength(0);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining(
        'Media item 42 (hash: missing-hash) exists in database but no corresponding file was found to transfer'
      )
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Media item 42'));
  });
});

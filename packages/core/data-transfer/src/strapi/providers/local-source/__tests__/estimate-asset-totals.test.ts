import { Readable } from 'stream';

import * as assets from '../assets';
import { estimateAssetTotals } from '../estimate-asset-totals';

jest.mock('../assets', () => {
  const actual = jest.requireActual('../assets');
  return {
    __esModule: true,
    ...actual,
    getFileStatsForTransfer: jest.fn(),
  };
});

describe('estimateAssetTotals', () => {
  const getStrapiMock = (rows: Record<string, unknown>[]) => ({
    dirs: { static: { public: '/data/public' } },
    log: { warn: jest.fn() },
    db: {
      queryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        stream: jest.fn(() => Readable.from(rows)),
      })),
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
  });

  beforeEach(() => {
    jest.mocked(assets.getFileStatsForTransfer).mockReset();
  });

  test('sums sizes and counts for local files (no formats)', async () => {
    jest.mocked(assets.getFileStatsForTransfer).mockResolvedValue({ size: 50 });
    const strapi = getStrapiMock([
      {
        provider: 'local',
        url: '/uploads/a.png',
        hash: 'h1',
        ext: '.png',
        id: 1,
      },
      {
        provider: 'local',
        url: '/uploads/b.png',
        hash: 'h2',
        ext: '.png',
        id: 2,
      },
    ]);

    await expect(estimateAssetTotals(strapi as any)).resolves.toEqual({
      totalBytes: 100,
      totalCount: 2,
    });
    expect(assets.getFileStatsForTransfer).toHaveBeenCalledTimes(2);
  });

  test('includes format rows in totals', async () => {
    jest
      .mocked(assets.getFileStatsForTransfer)
      .mockResolvedValueOnce({ size: 100 })
      .mockResolvedValueOnce({ size: 30 });
    const strapi = getStrapiMock([
      {
        provider: 'local',
        url: '/uploads/main.jpg',
        hash: 'm',
        ext: '.jpg',
        id: 1,
        formats: {
          thumbnail: {
            url: '/uploads/thumb.jpg',
            hash: 't',
            ext: '.jpg',
          },
        },
      },
    ]);

    await expect(estimateAssetTotals(strapi as any)).resolves.toEqual({
      totalBytes: 130,
      totalCount: 2,
    });
  });
});

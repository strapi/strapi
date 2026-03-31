import { Readable } from 'stream';

import * as assets from '../assets';
import { estimateAssetTotals } from '../estimate-asset-totals';

jest.mock('../assets', () => {
  const actual = jest.requireActual('../assets');
  return {
    __esModule: true,
    ...actual,
    getFileStatsForTransfer: jest.fn(),
    signUploadFileForTransfer: jest.fn().mockResolvedValue(undefined),
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
    jest.mocked(assets.signUploadFileForTransfer).mockClear();
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

  test('remote files use DB sizes only when main and formats have size (no HTTP stat)', async () => {
    const strapi = getStrapiMock([
      {
        provider: 'aws-s3',
        url: 'https://bucket/a.png',
        hash: 'h1',
        ext: '.png',
        id: 1,
        size: 400,
        formats: {
          thumbnail: {
            url: 'https://bucket/a_thumb.png',
            hash: 't',
            ext: '.png',
            size: 50,
          },
        },
      },
      {
        provider: 'aws-s3',
        url: 'https://bucket/b.png',
        hash: 'h2',
        ext: '.png',
        id: 2,
        size: 100,
      },
    ]);

    await expect(estimateAssetTotals(strapi as any)).resolves.toEqual({
      totalBytes: 550,
      totalCount: 3,
    });

    expect(assets.getFileStatsForTransfer).not.toHaveBeenCalled();
    expect(assets.signUploadFileForTransfer).not.toHaveBeenCalled();
  });

  test('remote files fall back to HTTP stat when size is missing on main', async () => {
    jest.mocked(assets.getFileStatsForTransfer).mockResolvedValue({ size: 999 });
    const strapi = getStrapiMock([
      {
        provider: 'aws-s3',
        url: 'https://bucket/a.png',
        hash: 'h1',
        ext: '.png',
        id: 1,
      },
    ]);

    await expect(estimateAssetTotals(strapi as any)).resolves.toEqual({
      totalBytes: 999,
      totalCount: 1,
    });

    expect(assets.signUploadFileForTransfer).toHaveBeenCalledTimes(1);
    expect(assets.getFileStatsForTransfer).toHaveBeenCalledTimes(1);
  });

  test('remote files fall back to HTTP stat when a format size is missing', async () => {
    jest.mocked(assets.getFileStatsForTransfer).mockResolvedValueOnce({ size: 12 }); // thumbnail probe only
    const strapi = getStrapiMock([
      {
        provider: 'aws-s3',
        url: 'https://bucket/a.png',
        hash: 'h1',
        ext: '.png',
        id: 1,
        size: 400,
        formats: {
          thumbnail: {
            url: 'https://bucket/a_thumb.png',
            hash: 't',
            ext: '.png',
          },
        },
      },
    ]);

    await expect(estimateAssetTotals(strapi as any)).resolves.toEqual({
      totalBytes: 412,
      totalCount: 2,
    });

    expect(assets.signUploadFileForTransfer).toHaveBeenCalledTimes(1);
    expect(assets.getFileStatsForTransfer).toHaveBeenCalledTimes(1);
  });
});

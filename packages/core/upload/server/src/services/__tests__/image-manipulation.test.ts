import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import sharp, { type Metadata } from 'sharp';
import imageManipulation from '../image-manipulation';

import type { UploadableFile } from '../../types';

const defaultConfig = {
  'plugin::upload': {
    breakpoints: {
      large: 1000,
      medium: 750,
      small: 500,
    },
  },
};

global.strapi = {
  config: {
    get: (path: any, defaultValue: any) => _.get(defaultConfig, path, defaultValue),
  },
  plugins: {
    upload: {
      services: {
        provider: { upload: jest.fn() },
        upload: {
          getSettings: () => ({ sizeOptimization: true, autoOrientation: false }),
        },
        'image-manipulation': imageManipulation,
      },
    },
  },
  plugin: (name: string) => (global.strapi as any).plugins[name],
} as any;

const animatedGifPath = path.join(__dirname, 'upload', 'animated-test.gif');
const animatedWebpPath = path.join(__dirname, 'upload', 'animated-test.webp');
const staticPngPath = path.join(__dirname, 'upload', 'image.png');
const tmpDir = path.join(__dirname, 'tmp-anim');

const metadataFromUploadableStream = (file: UploadableFile, animated: boolean) =>
  new Promise<Metadata>((resolve, reject) => {
    const pipeline = animated ? sharp({ animated: true }) : sharp();
    pipeline.metadata().then(resolve).catch(reject);
    file.getStream().pipe(pipeline);
  });

const makeFile = (filePath: string, ext: string, mime: string, width: number, height: number) => ({
  name: `test${ext}`,
  hash: `test_${Date.now()}`,
  ext,
  mime,
  filepath: filePath,
  path: null,
  getStream: () => fs.createReadStream(filePath),
  width,
  height,
  size: 1,
  tmpWorkingDirectory: tmpDir,
  folderPath: '/',
});

/** Upload pipeline can omit `filepath` and only supply streams (fresh stream each call). */
const makeStreamOnlyFile = (
  sourcePath: string,
  ext: string,
  mime: string,
  width: number,
  height: number
): UploadableFile => ({
  name: `test-stream${ext}`,
  hash: `stream_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  ext,
  mime,
  path: null,
  getStream: () => fs.createReadStream(sourcePath),
  width,
  height,
  size: 1,
  tmpWorkingDirectory: tmpDir,
  folderPath: '/',
});

describe('Image manipulation - animated images', () => {
  beforeAll(async () => {
    await fse.ensureDir(tmpDir);
  });

  afterAll(async () => {
    await fse.remove(tmpDir);
  });

  describe('generateThumbnail', () => {
    test('preserves GIF animation frames', async () => {
      const file = makeFile(animatedGifPath, '.gif', 'image/gif', 200, 200);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      const meta = await sharp(thumb!.filepath, { animated: true }).metadata();
      expect(meta.pages).toBe(3);
    });

    test('preserves WebP animation frames', async () => {
      const file = makeFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      const meta = await sharp(thumb!.filepath, { animated: true }).metadata();
      expect(meta.pages).toBe(3);
    });

    test('reports single-frame dimensions, not stacked', async () => {
      const file = makeFile(animatedGifPath, '.gif', 'image/gif', 200, 200);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      expect(thumb!.width).toBeLessThanOrEqual(245);
      expect(thumb!.height).toBeLessThanOrEqual(156);
    });

    test('preserves WebP animation frames (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      expect(thumb!.filepath).toBeDefined();
      const meta = await sharp(thumb!.filepath!, { animated: true }).metadata();
      expect(meta.pages).toBe(3);
    });

    test('preserves GIF animation frames (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(animatedGifPath, '.gif', 'image/gif', 200, 200);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      const meta = await sharp(thumb!.filepath!, { animated: true }).metadata();
      expect(meta.pages).toBe(3);
    });
  });

  describe('optimize', () => {
    test('preserves WebP animation frames', async () => {
      const file = makeFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const result = await imageManipulation.optimize(file);

      const meta = await sharp(result.filepath, { animated: true }).metadata();
      expect(meta.pages).toBe(3);
    });

    test('reports single-frame dimensions for animated WebP', async () => {
      const file = makeFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const result = await imageManipulation.optimize(file);

      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });

    test('preserves WebP animation frames (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const result = await imageManipulation.optimize(file);

      // When output is larger than input, optimize returns the original file (no filepath);
      // otherwise getStream reads the optimized file. Both must still expose 3 frames.
      const meta = await metadataFromUploadableStream(result, true);
      expect(meta.pages).toBe(3);
    });

    test('reports single-frame dimensions for animated WebP (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const result = await imageManipulation.optimize(file);

      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });
  });

  describe('optimize - GIF passthrough', () => {
    test('GIF is not optimized but animation is preserved', async () => {
      const file = makeFile(animatedGifPath, '.gif', 'image/gif', 200, 200);
      const result = await imageManipulation.optimize(file);

      expect(result.filepath).toBe(file.filepath);
      const meta = await sharp(result.filepath, { animated: true }).metadata();
      expect(meta.pages).toBe(3);
    });
  });

  describe('getDimensions', () => {
    test('returns frame dimensions for animated GIF', async () => {
      const file = makeFile(animatedGifPath, '.gif', 'image/gif', 200, 200);
      const dims = await imageManipulation.getDimensions(file);

      expect(dims.width).toBe(200);
      expect(dims.height).toBe(200);
    });

    test('returns frame dimensions for animated WebP', async () => {
      const file = makeFile(animatedWebpPath, '.webp', 'image/webp', 200, 200);
      const dims = await imageManipulation.getDimensions(file);

      expect(dims.width).toBe(200);
      expect(dims.height).toBe(200);
    });
  });

  describe('static images unaffected', () => {
    test('static PNG thumbnail has correct dimensions', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      expect(thumb!.width).toBeLessThanOrEqual(245);
      expect(thumb!.height).toBeLessThanOrEqual(156);

      const meta = await sharp(thumb!.filepath).metadata();
      expect(meta.format).toBe('png');
      expect(meta.pages).toBeUndefined();
    });

    test('static PNG optimize preserves format and dimensions', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const result = await imageManipulation.optimize(file);

      const meta = await sharp(result.filepath).metadata();
      expect(meta.format).toBe('png');
      expect(meta.pages).toBeUndefined();
      expect(result.width).toBeDefined();
      expect(result.height).toBeDefined();
    });
  });
});

describe('Image manipulation - AVIF', () => {
  const avifDir = path.join(__dirname, 'tmp-avif');
  const avifPath = path.join(avifDir, 'image.avif');
  // Just above the 245×156 thumbnail breakpoint. A 400×300 noise frame at
  // quality 100 is an AV1 stress case and exceeds Jest's 5s limit on slower
  // CI runners. These tests only check format, dimensions, and that
  // optimize/thumbnail write a new AV1 file.
  const AVIF_WIDTH = 256;
  const AVIF_HEIGHT = 192;

  beforeAll(async () => {
    await fse.ensureDir(avifDir);
    await sharp({
      create: {
        width: AVIF_WIDTH,
        height: AVIF_HEIGHT,
        channels: 3,
        background: { r: 180, g: 40, b: 40 },
      },
    })
      .avif({ quality: 50 })
      .toFile(avifPath);
  });

  afterAll(async () => {
    await fse.remove(avifDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeAvifFile = () => ({
    ...makeFile(avifPath, '.avif', 'image/avif', AVIF_WIDTH, AVIF_HEIGHT),
    tmpWorkingDirectory: avifDir,
  });

  test('sharp reports AVIF as heif with av1 compression', async () => {
    const meta = await sharp(avifPath).metadata();

    expect(meta.format).toBe('heif');
    expect(meta.compression).toBe('av1');
  });

  test('isImage is true for AVIF', async () => {
    expect(await imageManipulation.isImage(makeAvifFile())).toBe(true);
  });

  test('isResizableImage is true for AVIF', async () => {
    expect(await imageManipulation.isResizableImage(makeAvifFile())).toBe(true);
  });

  test('isOptimizableImage is true for AVIF', async () => {
    expect(await imageManipulation.isOptimizableImage(makeAvifFile())).toBe(true);
  });

  test('getDimensions reads AVIF dimensions', async () => {
    expect(await imageManipulation.getDimensions(makeAvifFile())).toEqual({
      width: AVIF_WIDTH,
      height: AVIF_HEIGHT,
    });
  });

  test('generateThumbnail resizes AVIF and keeps AV1 encoding', async () => {
    const thumb = await imageManipulation.generateThumbnail(makeAvifFile());

    expect(thumb).not.toBeNull();
    expect(thumb!.width).toBeLessThanOrEqual(245);
    expect(thumb!.height).toBeLessThanOrEqual(156);

    const meta = await sharp(thumb!.filepath).metadata();
    expect(meta.format).toBe('heif');
    expect(meta.compression).toBe('av1');
  });

  test('optimize re-encodes AVIF as AV1', async () => {
    const result = await imageManipulation.optimize(makeAvifFile());

    expect(result.filepath).not.toBe(avifPath);

    const meta = await sharp(result.filepath).metadata();
    expect(meta.format).toBe('heif');
    expect(meta.compression).toBe('av1');
  });

  test('HEIC (heif with hevc compression) is not processed', async () => {
    const proto = Object.getPrototypeOf(sharp(avifPath));
    jest
      .spyOn(proto, 'metadata')
      .mockResolvedValue({ format: 'heif', compression: 'hevc', width: 10, height: 10 });

    const file = makeFile(avifPath, '.heic', 'image/heic', 10, 10);

    expect(await imageManipulation.isImage(file)).toBe(false);
    expect(await imageManipulation.isResizableImage(file)).toBe(false);
    expect(await imageManipulation.isOptimizableImage(file)).toBe(false);
  });
});

import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import imageManipulation from '../image-manipulation';

import type { UploadableFile } from '../../types';

const uploadConfig: Record<string, unknown> = {
  breakpoints: {
    large: 1000,
    medium: 750,
    small: 500,
  },
};

global.strapi = {
  config: {
    get: (configPath: any, defaultValue: any) =>
      _.get({ 'plugin::upload': uploadConfig }, configPath, defaultValue),
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

const staticPngPath = path.join(__dirname, 'upload', 'image.png');
const animatedGifPath = path.join(__dirname, 'upload', 'animated-test.gif');
const tmpDir = path.join(__dirname, 'tmp-sharp-options');

const makeFile = (filePath: string, ext: string, mime: string, width: number, height: number) => ({
  name: `test${ext}`,
  hash: `test_${Date.now()}_${Math.random().toString(16).slice(2)}`,
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

describe('Image manipulation - sharp instance options (limitInputPixels)', () => {
  beforeAll(async () => {
    await fse.ensureDir(tmpDir);
  });

  afterAll(async () => {
    await fse.remove(tmpDir);
  });

  afterEach(() => {
    delete uploadConfig.sharp;
  });

  describe('limitInputPixels lower than the image pixel count', () => {
    beforeEach(() => {
      // image.png is 1417x1063 (~1.5M pixels); animated-test.gif is 200x200x3 frames
      uploadConfig.sharp = { limitInputPixels: 1000 };
    });

    test('generateThumbnail rejects (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);

      await expect(imageManipulation.generateThumbnail(file)).rejects.toThrow(/pixel limit/i);
    });

    test('generateThumbnail rejects (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(staticPngPath, '.png', 'image/png', 1500, 1000);

      await expect(imageManipulation.generateThumbnail(file)).rejects.toThrow(/pixel limit/i);
    });

    test('generateThumbnail rejects for animated GIF (file path input)', async () => {
      const file = makeFile(animatedGifPath, '.gif', 'image/gif', 200, 200);

      await expect(imageManipulation.generateThumbnail(file)).rejects.toThrow(/pixel limit/i);
    });

    test('optimize rejects (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);

      await expect(imageManipulation.optimize(file)).rejects.toThrow(/pixel limit/i);
    });

    test('isFaultyImage reports the image as faulty (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);

      await expect(imageManipulation.isFaultyImage(file)).resolves.toBe(true);
    });
  });

  describe('limitInputPixels: false disables the pixel limit', () => {
    beforeEach(() => {
      uploadConfig.sharp = { limitInputPixels: false };
    });

    test('generateThumbnail succeeds (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
      expect(thumb!.width).toBeLessThanOrEqual(245);
      expect(thumb!.height).toBeLessThanOrEqual(156);
    });

    test('generateThumbnail succeeds (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
    });

    test('optimize succeeds (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const result = await imageManipulation.optimize(file);

      expect(result.width).toBeDefined();
      expect(result.height).toBeDefined();
    });

    test('isFaultyImage reports the image as valid (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);

      await expect(imageManipulation.isFaultyImage(file)).resolves.toBe(false);
    });
  });

  describe('limitInputPixels higher than the image pixel count', () => {
    beforeEach(() => {
      uploadConfig.sharp = { limitInputPixels: 10_000_000 };
    });

    test('generateThumbnail succeeds (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
    });

    test('getDimensions succeeds (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const dims = await imageManipulation.getDimensions(file);

      expect(dims.width).toBe(1417);
      expect(dims.height).toBe(1063);
    });
  });

  describe('no sharp config provided', () => {
    test('generateThumbnail succeeds with sharp defaults (file path input)', async () => {
      const file = makeFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
    });

    test('generateThumbnail succeeds with sharp defaults (stream-only, no filepath)', async () => {
      const file = makeStreamOnlyFile(staticPngPath, '.png', 'image/png', 1500, 1000);
      const thumb = await imageManipulation.generateThumbnail(file);

      expect(thumb).not.toBeNull();
    });
  });
});

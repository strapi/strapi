import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import sharp from 'sharp';
import imageManipulation from '../image-manipulation';

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

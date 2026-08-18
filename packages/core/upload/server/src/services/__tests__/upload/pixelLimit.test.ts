// enhanceAndValidateFile rejects oversized images before sharp decodes them (issue #25750:
// large images crashing memory-constrained hosts mid-upload).
import path from 'path';
import fse from 'fs-extra';
import _ from 'lodash';
import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';

const defaultConfig: Record<string, any> = {
  'plugin::upload': {
    breakpoints: {
      large: 1000,
      medium: 750,
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
        upload: { getSettings: () => ({ responsiveDimensions: false }) },
        file: { getFolderPath: async () => '/' },
        'image-manipulation': imageManipulation,
      },
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

// enhanceAndValidateFile reads `strapi` from the factory closure (unlike other functions here,
// which go through the getService() global helper), so the real global must be passed in.
const uploadService = createUploadService({ strapi: global.strapi } as any);

const imageFilePath = path.join(__dirname, './image.png'); // real dimensions: 1417x1063
const tmpWorkingDirectory = path.join(__dirname, './tmp-pixel-limit');

const getInputFile = () => ({
  filepath: imageFilePath,
  originalFilename: 'image.png',
  newFilename: 'image.png',
  mimetype: 'image/png',
  size: 4000,
  tmpWorkingDirectory,
});

describe('enhanceAndValidateFile - pixel limit guard', () => {
  beforeAll(async () => {
    await fse.mkdir(tmpWorkingDirectory);
  });

  afterAll(async () => {
    await fse.remove(tmpWorkingDirectory);
  });

  beforeEach(() => {
    delete defaultConfig['plugin::upload'].security;
  });

  test('rejects an image above the configured pixel limit without decoding it', async () => {
    defaultConfig['plugin::upload'].security = { maxImageResolution: 1_000_000 };

    await expect(uploadService._enhanceAndValidateFile(getInputFile() as any, {})).rejects.toThrow(
      /too large to process/
    );
  });

  test('allows the same image when under the configured pixel limit', async () => {
    defaultConfig['plugin::upload'].security = { maxImageResolution: 10_000_000 };

    const result = await uploadService._enhanceAndValidateFile(getInputFile() as any, {});
    expect(result.name).toBe('image.png');
  });

  test('allows the image when no limit is configured (default is a no-op)', async () => {
    const result = await uploadService._enhanceAndValidateFile(getInputFile() as any, {});
    expect(result.name).toBe('image.png');
  });
});

import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';

import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';

const defaultConfig = {
  'plugin::upload': {
    provider: 'local',
    breakpoints: {
      large: 1000,
      medium: 750,
    },
  },
};

const providerService = {
  upload: jest.fn(),
  replace: jest.fn(),
};

const providerInstance = {
  delete: jest.fn().mockResolvedValue(undefined),
};

global.strapi = {
  config: {
    get: (key: any, defaultValue?: any) => _.get(defaultConfig, key, defaultValue),
  },
  log: {
    error: jest.fn(),
  },
  plugins: {
    upload: {
      provider: providerInstance,
      services: {
        provider: providerService,
        upload: {
          getSettings: () => ({ responsiveDimensions: true }),
        },
        'image-manipulation': imageManipulation,
      },
    },
  },
} as any;

// `replaceImage` reads the configured provider off the injected instance, not the global.
const uploadService = createUploadService({ strapi: global.strapi } as any);

const imageFilePath = path.join(__dirname, './image.png');
const tmpWorkingDirectory = path.join(__dirname, './tmp-unhandled');

const getFileData = () => ({
  alternativeText: 'image.png',
  caption: 'image.png',
  ext: '.png',
  folder: undefined,
  folderPath: '/',
  filepath: imageFilePath,
  getStream: () => fs.createReadStream(imageFilePath),
  hash: 'image_d9b4f84424',
  height: 1000,
  size: 4,
  width: 1500,
  tmpWorkingDirectory,
  name: 'image.png',
});

describe('Provider rejections during concurrent uploads', () => {
  beforeAll(async () => {
    await fse.mkdir(tmpWorkingDirectory);
  });

  afterAll(async () => {
    await fse.remove(tmpWorkingDirectory);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    providerInstance.delete.mockResolvedValue(undefined);
  });

  test('propagates an immediate upload rejection after all provider operations settle', async () => {
    const providerError = new Error('InvalidAccessKeyId: synthetic provider rejection');
    providerService.upload.mockRejectedValueOnce(providerError).mockResolvedValue(undefined);

    await expect(uploadService._uploadImage(getFileData())).rejects.toBe(providerError);
  });

  test('turns a synchronous provider throw into the settled batch failure', async () => {
    const providerError = new Error('synthetic synchronous provider failure');
    providerService.upload
      .mockImplementationOnce(() => {
        throw providerError;
      })
      .mockResolvedValue(undefined);

    await expect(uploadService._uploadImage(getFileData())).rejects.toBe(providerError);
  });

  test('propagates an immediate replace rejection after all provider operations settle', async () => {
    const providerError = new Error('InvalidAccessKeyId: synthetic provider rejection');
    providerService.replace.mockRejectedValueOnce(providerError).mockResolvedValue(undefined);
    providerService.upload.mockResolvedValue(undefined);

    const oldFile = {
      hash: 'image_d9b4f84424',
      ext: '.png',
      provider: 'local',
      formats: {},
    };

    await expect(uploadService._replaceImage(getFileData() as any, oldFile as any)).rejects.toBe(
      providerError
    );
  });
});

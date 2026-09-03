// The `unhandledRejection` process event cannot be used here — jest's runner
// intercepts it, so a genuinely unhandled rejection never reaches a listener
// registered inside a test. The containment is asserted directly instead.
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

const settle = (operation: Promise<unknown>) =>
  operation.then(
    () => null,
    (error) => error
  );

describe('queueConcurrentOperation', () => {
  test('attaches a rejection handler in the same turn as the push', () => {
    const queue: Promise<unknown>[] = [];
    const operation = Promise.reject(new Error('InvalidAccessKeyId'));
    const catchSpy = jest.spyOn(operation, 'catch');

    uploadService._queueConcurrentOperation(queue, operation);

    // Synchronous — before the caller moves on to `await`ing image work.
    expect(catchSpy).toHaveBeenCalledTimes(1);

    return expect(Promise.all(queue)).rejects.toThrow('InvalidAccessKeyId');
  });

  test('queues the operation itself so the batch still fails', async () => {
    const queue: Promise<unknown>[] = [];
    const providerError = new Error('InvalidAccessKeyId');
    const operation = Promise.reject(providerError);

    uploadService._queueConcurrentOperation(queue, operation);

    expect(queue).toHaveLength(1);
    expect(queue[0]).toBe(operation);
    await expect(Promise.all(queue)).rejects.toBe(providerError);
  });

  test('accepts a provider that returns a plain value instead of a promise', async () => {
    const queue: Promise<unknown>[] = [];

    expect(() =>
      uploadService._queueConcurrentOperation(queue, undefined as unknown as Promise<void>)
    ).not.toThrow();

    await expect(Promise.all(queue)).resolves.toEqual([undefined]);
  });
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

  test('still surfaces an immediate upload rejection to the caller', async () => {
    const providerError = new Error('InvalidAccessKeyId: synthetic provider rejection');
    // Containing the rejection must not swallow it.
    providerService.upload.mockRejectedValueOnce(providerError).mockResolvedValue(undefined);

    await expect(settle(uploadService._uploadImage(getFileData()))).resolves.toBe(providerError);
  });

  test('still surfaces an immediate replace rejection to the caller', async () => {
    const providerError = new Error('InvalidAccessKeyId: synthetic provider rejection');
    providerService.replace.mockRejectedValueOnce(providerError).mockResolvedValue(undefined);
    providerService.upload.mockResolvedValue(undefined);

    const oldFile = {
      hash: 'image_d9b4f84424',
      ext: '.png',
      provider: 'local',
      formats: {},
    };

    await expect(
      settle(uploadService._replaceImage(getFileData() as any, oldFile as any))
    ).resolves.toBe(providerError);
  });
});

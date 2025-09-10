import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';

const defaultConfig = {
  'plugin::upload': {
    breakpoints: {
      large: 1000,
      medium: 750,
    },
  },
};

// Set up initial mock before service creation
global.strapi = {
  config: {
    get: (path: any, defaultValue: any) => _.get(defaultConfig, path, defaultValue),
  },
  plugins: {
    upload: {
      services: {
        provider: {
          upload: jest.fn(),
        },
        upload: {
          getSettings: () => ({ responsiveDimensions: false }),
        },
        'image-manipulation': imageManipulation,
      },
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

const uploadService = createUploadService({} as any);

const imageFilePath = path.join(__dirname, './image.png');
const tmpWorkingDirectory = path.join(__dirname, './tmp');

function mockUploadProvider(uploadFunc: any, props?: any) {
  const { responsiveDimensions = false } = props || {};

  // Only mutate the parts that depend on the parameters
  global.strapi.plugins.upload.services.provider.upload = uploadFunc;
  global.strapi.plugins.upload.services.upload.getSettings = () => ({ responsiveDimensions });
}

const getFileData = (filePath: string) => ({
  alternativeText: 'image.png',
  caption: 'image.png',
  ext: '.png',
  folder: undefined,
  folderPath: '/',
  filepath: filePath,
  getStream: () => fs.createReadStream(filePath),
  hash: 'image_d9b4f84424',
  height: 1000,
  size: 4,
  width: 1500,
  tmpWorkingDirectory,
  name: 'image.png',
});

describe('Upload image', () => {
  beforeAll(async () => {
    // Create tmp directory if it does not exist
    await fse.mkdir(tmpWorkingDirectory);
  });

  afterAll(async () => {
    // Remove tmp directory
    await fse.remove(tmpWorkingDirectory);
  });

  test('Upload with thubmnail', async () => {
    const fileData = getFileData(imageFilePath);
    const upload = jest.fn();
    mockUploadProvider(upload);

    await uploadService._uploadImage(fileData);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  test('Upload with responsive formats', async () => {
    const fileData = getFileData(imageFilePath);
    const upload = jest.fn();
    mockUploadProvider(upload, { responsiveDimensions: true });

    await uploadService._uploadImage(fileData);
    // 1 for the original image, 1 for thumbnail, 2 for the responsive formats
    expect(upload).toHaveBeenCalledTimes(4);
  });
});

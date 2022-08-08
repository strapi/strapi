'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const uploadService = require('../../upload')({});

const imageFilePath = path.join(__dirname, './image.png');

const tmpWorkingDirectory = path.join(__dirname, './tmp');

function mockUploadProvider(uploadFunc, props) {
  const { responsiveDimensions = false } = props || {};

  const default_config = {
    plugin: {
      upload: {
        breakpoints: {
          large: 1000,
          medium: 750,
        },
      },
    },
  };

  global.strapi = {
    config: {
      get: (path, defaultValue) => _.get(default_config, path, defaultValue),
    },
    plugins: {
      upload: {
        services: {
          provider: {
            upload: uploadFunc,
          },
          upload: {
            getSettings: () => ({ responsiveDimensions }),
          },
          'image-manipulation': require('../../image-manipulation')(),
        },
      },
    },
  };
}

const getFileData = filePath => ({
  alternativeText: 'image.png',
  caption: 'image.png',
  ext: '.png',
  folder: null,
  folderPath: '/',
  getStream: () => fs.createReadStream(filePath),
  hash: 'image_d9b4f84424',
  height: 1000,
  size: 4,
  width: 1500,
  tmpWorkingDirectory,
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

    await uploadService.uploadImage(fileData);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  test('Upload with responsive formats', async () => {
    const fileData = getFileData(imageFilePath);
    const upload = jest.fn();
    mockUploadProvider(upload, { responsiveDimensions: true });

    await uploadService.uploadImage(fileData);
    // 1 for the original image, 1 for thumbnail, 2 for the responsive formats
    expect(upload).toHaveBeenCalledTimes(4);
  });
});

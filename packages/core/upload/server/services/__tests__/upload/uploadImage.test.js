'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const uploadService = require('../../upload')({});

const imageFilePath = path.join(__dirname, './image.png');

const tmpWorkingDirectory = path.join(__dirname, './tmp');

function mockStrapiConfig(uploadFunc, props = {}) {
  const { responsiveDimensions = false } = props;

  return {
    config: {
      get: (path, defaultValue) =>
        _.get(
          {
            plugin: {
              upload: {
                breakpoints: {
                  large: 1000,
                  medium: 750,
                },
              },
            },
          },
          path,
          defaultValue
        ),
    },
    plugins: {
      upload: {
        service(name) {
          if (name === 'upload') {
            return {
              getSettings: () => ({ responsiveDimensions }),
            };
          }
          if (name === 'image-manipulation') {
            return require('../../image-manipulation')();
          }
          if (name === 'provider') {
            return {
              upload: uploadFunc,
            };
          }

          return {};
        },
      },
    },
    plugin(name) {
      return this.plugins[name];
    },
  };
}

jest.mock('@strapi/strapi', () => {
  return jest.fn().mockImplementation(() => mockStrapiConfig);
});

const getFileData = (filePath) => ({
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
  let strapi;

  beforeAll(async () => {
    // Create tmp directory if it does not exist
    await fse.mkdir(tmpWorkingDirectory);
  });

  afterAll(async () => {
    // Remove tmp directory
    await fse.remove(tmpWorkingDirectory);
  });

  beforeEach(() => {
    strapi = require('@strapi/strapi');
  });

  test('Upload with thubmnail', async () => {
    const fileData = getFileData(imageFilePath);

    const upload = jest.fn();
    Object.assign(strapi, mockStrapiConfig(upload));

    await uploadService.uploadImage(fileData);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  test('Upload with responsive formats', async () => {
    const fileData = getFileData(imageFilePath);

    const upload = jest.fn();
    Object.assign(strapi, mockStrapiConfig(upload, { responsiveDimensions: true }));

    await uploadService.uploadImage(fileData);
    expect(upload).toHaveBeenCalledTimes(4);
  });
});

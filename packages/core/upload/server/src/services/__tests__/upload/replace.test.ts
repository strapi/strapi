// Tests the `replace` flow, in particular that provider-specific data
// (provider_metadata) stored on the original file survives a replacement.
import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import _ from 'lodash';
import createUploadService from '../../upload';
import imageManipulation from '../../image-manipulation';
import { FILE_MODEL_UID } from '../../../constants';

const defaultConfig = {
  'plugin::upload': {
    provider: 'custom-provider',
    breakpoints: {
      large: 1000,
      medium: 750,
    },
  },
};

const providerUpload = jest.fn();
const providerDelete = jest.fn();
const dbUpdate = jest.fn(({ data }: any) => ({ id: 1, ...data }));
const dbFindOne = jest.fn();

// Set up initial mock before service creation
global.strapi = {
  config: {
    get: (path: any, defaultValue: any) => _.get(defaultConfig, path, defaultValue),
  },
  plugins: {
    upload: {
      // `strapi.plugin('upload').provider` is the resolved provider instance
      provider: { delete: providerDelete },
      services: {
        provider: {
          upload: providerUpload,
        },
        upload: {
          getSettings: () => ({ responsiveDimensions: false }),
        },
        'image-manipulation': imageManipulation,
        file: {
          getFolderPath: jest.fn(async () => '/'),
          signFileUrls: jest.fn(async (file: any) => file),
        },
        metrics: {
          trackUsage: jest.fn(),
        },
      },
    },
  },
  get: () => ({ transform: () => ({}) }),
  getModel: () => ({
    uid: FILE_MODEL_UID,
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: 'file', pluralName: 'files', displayName: 'File' },
    options: {},
    attributes: {},
  }),
  db: {
    query: () => ({
      findOne: dbFindOne,
      update: dbUpdate,
    }),
  },
  eventHub: {
    emit: jest.fn(),
  },
} as any;

const uploadService = createUploadService({ strapi: global.strapi });

const imageFilePath = path.join(__dirname, './image.png');
const textFilePath = path.join(__dirname, './tmp/file.txt');

describe('Upload replace', () => {
  beforeAll(async () => {
    await fse.mkdir(path.join(__dirname, './tmp'));
    await fse.writeFile(textFilePath, 'strapi');
  });

  afterAll(async () => {
    await fse.remove(path.join(__dirname, './tmp'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupDbFile = (dbFile: any) => {
    dbFindOne.mockResolvedValue(dbFile);
  };

  test('Replacing a file preserves the provider_metadata of the original file', async () => {
    const providerMetadata = { public_id: 'file_abc123', resource_type: 'raw' };
    setupDbFile({
      id: 1,
      hash: 'file_abc123',
      ext: '.txt',
      provider: 'custom-provider',
      provider_metadata: providerMetadata,
      formats: null,
    });

    await uploadService.replace(1, {
      data: { fileInfo: {} as any },
      file: {
        originalFilename: 'file.txt',
        mimetype: 'text/plain',
        size: 6,
        filepath: textFilePath,
      } as any,
    });

    // the provider receives the new file with the original provider_metadata
    expect(providerUpload).toHaveBeenCalledTimes(1);
    expect(providerUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'file_abc123',
        ext: '.txt',
        provider_metadata: providerMetadata,
      })
    );

    // the preserved provider_metadata is persisted in the database
    expect(dbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ provider_metadata: providerMetadata }),
      })
    );
  });

  test('Replacing an image preserves the provider_metadata of the original file', async () => {
    const providerMetadata = { public_id: 'image_d9b4f84424', resource_type: 'image' };
    setupDbFile({
      id: 1,
      hash: 'image_d9b4f84424',
      ext: '.png',
      provider: 'custom-provider',
      provider_metadata: providerMetadata,
      formats: null,
    });

    await uploadService.replace(1, {
      data: { fileInfo: {} as any },
      file: {
        originalFilename: 'image.png',
        mimetype: 'image/png',
        size: fs.statSync(imageFilePath).size,
        filepath: imageFilePath,
      } as any,
    });

    // original file + thumbnail are uploaded; the main file keeps its provider_metadata
    expect(providerUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        hash: 'image_d9b4f84424',
        ext: '.png',
        provider_metadata: providerMetadata,
      })
    );

    expect(dbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ provider_metadata: providerMetadata }),
      })
    );
  });

  test('Replacing a file deletes the previous file through the provider', async () => {
    const dbFile = {
      id: 1,
      hash: 'file_abc123',
      ext: '.txt',
      provider: 'custom-provider',
      provider_metadata: { public_id: 'file_abc123' },
      formats: null,
    };
    setupDbFile(dbFile);

    await uploadService.replace(1, {
      data: { fileInfo: {} as any },
      file: {
        originalFilename: 'file.txt',
        mimetype: 'text/plain',
        size: 6,
        filepath: textFilePath,
      } as any,
    });

    expect(providerDelete).toHaveBeenCalledWith(dbFile);
  });
});

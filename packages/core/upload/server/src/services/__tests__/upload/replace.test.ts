import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import createUploadService from '../../upload';

const PROVIDER = 'local';

const defaultConfig = {
  'plugin::upload': {
    provider: PROVIDER,
  },
};

const providerMethods = {
  upload: jest.fn(),
  replace: jest.fn(),
  delete: jest.fn(),
};

const imageManipulationMock = {
  // The replaced file is a plain text file, so it is never treated as an image.
  isImage: jest.fn(async () => false),
  isFaultyImage: jest.fn(async () => false),
  isOptimizableImage: jest.fn(async () => false),
  optimize: jest.fn(),
  generateFileName: jest.fn((name: string) => name),
};

const fileServiceMock = {
  signFileUrls: jest.fn((file: any) => file),
  getFolderPath: jest.fn(async () => '/'),
};

// Mutated per-test so findOne returns the right db record.
let currentDbFile: any = null;

const dbFindOne = jest.fn(async () => currentDbFile);
const dbUpdate = jest.fn(async ({ data }: any) => data);

const services: Record<string, any> = {
  provider: providerMethods,
  'image-manipulation': imageManipulationMock,
  file: fileServiceMock,
};

global.strapi = {
  config: {
    // eslint-disable-next-line you-dont-need-lodash-underscore/get
    get: (configPath: any, defaultValue: any) => _.get(defaultConfig, configPath, defaultValue),
  },
  get: () => ({ transform: () => ({}) }),
  getModel: () => ({ attributes: {} }),
  db: {
    query: () => ({
      findOne: dbFindOne,
      update: dbUpdate,
    }),
  },
  eventHub: { emit: jest.fn() },
  plugins: {
    upload: {
      services,
      provider: providerMethods,
      service: (name: string) => services[name],
    },
  },
  plugin: (name: string) => global.strapi.plugins[name],
} as any;

const uploadService = createUploadService({ strapi: global.strapi } as any);

const txtFilePath = path.join(__dirname, './replace-fixture.txt');

const inputFile = () => ({
  filepath: txtFilePath,
  originalFilename: 'document.txt',
  mimetype: 'text/plain',
  size: fs.statSync(txtFilePath).size,
});

describe('Upload service - replace()', () => {
  beforeAll(() => {
    fs.writeFileSync(txtFilePath, 'hello');
  });

  afterAll(() => {
    fs.rmSync(txtFilePath, { force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('replacing an image with a non-image deletes the old generated formats', async () => {
    currentDbFile = {
      id: 1,
      hash: 'document_abc123',
      ext: '.png',
      provider: PROVIDER,
      formats: {
        thumbnail: { hash: 'thumbnail_document_abc123', ext: '.png' },
        large: { hash: 'large_document_abc123', ext: '.png' },
      },
    };

    await uploadService.replace(1, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    // The main file is replaced atomically
    expect(providerMethods.replace).toHaveBeenCalledTimes(1);

    // The two orphaned formats from the old image must be deleted, not left behind
    expect(providerMethods.delete).toHaveBeenCalledTimes(2);
    const deletedHashes = providerMethods.delete.mock.calls.map((c: any[]) => c[0].hash).sort();
    expect(deletedHashes).toEqual(['large_document_abc123', 'thumbnail_document_abc123']);
  });

  test('replacing a formatless file with a non-image deletes nothing', async () => {
    currentDbFile = {
      id: 2,
      hash: 'document_def456',
      ext: '.pdf',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(2, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(providerMethods.replace).toHaveBeenCalledTimes(1);
    expect(providerMethods.delete).not.toHaveBeenCalled();
  });
});

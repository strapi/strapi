import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import createUploadService from '../../upload';
import { validateUploadBody } from '../../../controllers/validation/admin/upload';

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
  checkFileSize: jest.fn(),
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

  test('keeps the name of the asset being replaced, not the uploaded file', async () => {
    currentDbFile = {
      id: 10,
      name: 'original-name.txt',
      hash: 'original_abc123',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    // The admin sends no `fileInfo` on replace, and the name would otherwise
    // fall through to the uploaded file's own filename — silently renaming the
    // asset to `document.txt`.
    await uploadService.replace(10, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(dbUpdate).toHaveBeenCalledTimes(1);
    expect(dbUpdate.mock.calls[0][0].data.name).toBe('original-name.txt');
  });

  // The service-level tests above pass `fileInfo` by hand. This one runs the
  // body the admin actually sends — no `fileInfo` at all — through the real
  // validator first, which is the layer where a defaulted name would undo the
  // fix without any of the other tests noticing.
  test('preserves the name for the payload the admin really sends', async () => {
    currentDbFile = {
      id: 12,
      name: 'original-name.txt',
      hash: 'original_ghi789',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    const data = (await validateUploadBody({})) as { fileInfo: any };

    expect(data.fileInfo.name).toBeUndefined();

    await uploadService.replace(12, { data, file: inputFile() as any });

    expect(dbUpdate.mock.calls[0][0].data.name).toBe('original-name.txt');
  });

  test('treats an empty name as "not given" rather than blanking it', async () => {
    currentDbFile = {
      id: 13,
      name: 'original-name.txt',
      hash: 'original_jkl012',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    // `formatFileInfo` reads the name as `fileInfo.name || filename`, so an
    // empty string has always meant "no name supplied". A nullish check here
    // would instead let it through and leave the asset with no name at all.
    await uploadService.replace(13, {
      data: { fileInfo: { name: '' } as any },
      file: inputFile() as any,
    });

    expect(dbUpdate.mock.calls[0][0].data.name).toBe('original-name.txt');
  });

  test('still honours an explicit rename sent with the replacement', async () => {
    currentDbFile = {
      id: 11,
      name: 'original-name.txt',
      hash: 'original_def456',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    // Preserving the name is the default, not a lock: a caller that means to
    // rename can still say so.
    await uploadService.replace(11, {
      data: { fileInfo: { name: 'deliberately-renamed.txt' } as any },
      file: inputFile() as any,
    });

    expect(dbUpdate.mock.calls[0][0].data.name).toBe('deliberately-renamed.txt');
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

  test('checks the file size before writing anything to the provider', async () => {
    currentDbFile = {
      id: 3,
      hash: 'document_ghi789',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    // A rejected size check must abort the replace, leaving the stored file untouched.
    providerMethods.checkFileSize.mockImplementationOnce(() => {
      throw new Error('document.txt exceeds size limit of 1 KB.');
    });

    await expect(
      uploadService.replace(3, {
        data: { fileInfo: {} as any },
        file: inputFile() as any,
      })
    ).rejects.toThrow('exceeds size limit');

    expect(providerMethods.checkFileSize).toHaveBeenCalledTimes(1);
    expect(providerMethods.replace).not.toHaveBeenCalled();
    expect(providerMethods.upload).not.toHaveBeenCalled();
    expect(dbUpdate).not.toHaveBeenCalled();
  });
});

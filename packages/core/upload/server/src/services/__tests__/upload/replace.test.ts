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

  test('keeps the file in its folder', async () => {
    currentDbFile = {
      id: 4,
      hash: 'in_folder_abc',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
      folderPath: '/7',
    };

    await uploadService.replace(4, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    // Left to `formatFileInfo` this became '/', contradicting the surviving
    // relation — and `folder.deleteByIds` selects by folderPath, so deleting the
    // folder left the file behind, invisible and never freed from storage.
    expect(dbUpdate.mock.calls[0][0].data).toMatchObject({ folderPath: '/7' });
  });

  test('moves the file when a folder is sent explicitly', async () => {
    currentDbFile = {
      id: 5,
      hash: 'moving_def',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
      folderPath: '/7',
    };

    fileServiceMock.getFolderPath.mockImplementationOnce(async () => '/9');

    // Replace-and-move in one request is a supported call, so an explicit folder
    // still wins over the file's current location.
    await uploadService.replace(5, {
      data: { fileInfo: { folder: 9 } as any },
      file: inputFile() as any,
    });

    expect(dbUpdate.mock.calls[0][0].data).toMatchObject({ folder: 9, folderPath: '/9' });
  });

  test('sends the file to the root when the folder is explicitly cleared', async () => {
    currentDbFile = {
      id: 6,
      hash: 'to_root_ghi',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
      folderPath: '/7',
    };

    // `null` is a deliberate move to the root, unlike an absent folder.
    await uploadService.replace(6, {
      data: { fileInfo: { folder: null } as any },
      file: inputFile() as any,
    });

    expect(dbUpdate.mock.calls[0][0].data).toMatchObject({ folder: null, folderPath: '/' });
  });

  test('forwards the path meta to the provider', async () => {
    currentDbFile = {
      id: 7,
      hash: 'prefixed_jkl',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    // `path` is the provider storage prefix, not a `files` column, so the provider
    // call is the only place it shows up.
    await uploadService.replace(7, {
      data: { fileInfo: {} as any, path: 'baz/qux' },
      file: inputFile() as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({ path: 'baz/qux' });
  });

  test('forwards the relation metas', async () => {
    currentDbFile = {
      id: 8,
      hash: 'related_mno',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(8, {
      data: {
        fileInfo: {} as any,
        refId: 12,
        ref: 'api::article.article',
        field: 'cover',
      },
      file: inputFile() as any,
    });

    expect(dbUpdate.mock.calls[0][0].data).toMatchObject({
      related: [{ id: 12, __type: 'api::article.article', __pivot: { field: 'cover' } }],
    });
  });

  test('does not invent a path or a relation when no metas are sent', async () => {
    currentDbFile = {
      id: 9,
      hash: 'no_path_pqr',
      ext: '.txt',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(9, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).not.toHaveProperty('path');
    expect(dbUpdate.mock.calls[0][0].data).not.toHaveProperty('related');
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

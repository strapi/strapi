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

// Rows of the file's morph join table, set per test: the fields that use the file.
let currentUsages: Array<{ related_type: string; field: string }> = [];

const models: Record<string, any> = {
  'api::article.article': {
    info: { displayName: 'Article' },
    attributes: {
      title: { type: 'string' },
      cover: { type: 'media', allowedTypes: ['images'] },
      attachment: { type: 'media', allowedTypes: ['files'] },
      gallery: { type: 'media', multiple: true },
    },
  },
  'shared.seo': {
    info: { displayName: 'Seo' },
    attributes: { shareImage: { type: 'media', allowedTypes: ['images', 'videos'] } },
  },
};

const fileMetadata = {
  attributes: {
    related: {
      joinTable: {
        name: 'files_related_mph',
        joinColumn: { name: 'file_id' },
        morphColumn: { typeColumn: { name: 'related_type' } },
      },
    },
  },
};

type UsagesQuery = {
  select: jest.Mock<UsagesQuery>;
  where: jest.Mock<UsagesQuery>;
  execute: jest.Mock<Promise<typeof currentUsages>>;
};

const usagesQuery: UsagesQuery = {
  select: jest.fn(() => usagesQuery),
  where: jest.fn(() => usagesQuery),
  execute: jest.fn(async () => currentUsages),
};

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
  getModel: (uid: string) => models[uid] ?? { attributes: {} },
  db: {
    query: () => ({
      findOne: dbFindOne,
      update: dbUpdate,
    }),
    metadata: { get: () => fileMetadata },
    queryBuilder: () => usagesQuery,
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

const inputFile = (overrides: { originalFilename?: string; mimetype?: string } = {}) => ({
  filepath: txtFilePath,
  originalFilename: 'document.txt',
  mimetype: 'text/plain',
  size: fs.statSync(txtFilePath).size,
  ...overrides,
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
    currentUsages = [];
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

  /**
   * The url is built from hash + ext. Keeping `.png` for a text file served it as
   * `image/png`, so every entry using the asset showed a broken image.
   */
  test('takes the new extension when the file type changes', async () => {
    currentDbFile = {
      id: 10,
      hash: 'cover_abc123',
      ext: '.png',
      mime: 'image/png',
      width: 1200,
      height: 800,
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(10, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({
      hash: 'cover_abc123',
      ext: '.txt',
      mime: 'text/plain',
    });
    expect(dbUpdate.mock.calls[0][0].data).toMatchObject({
      hash: 'cover_abc123',
      ext: '.txt',
      mime: 'text/plain',
    });
  });

  test('clears the old dimensions when a non-image replaces an image', async () => {
    currentDbFile = {
      id: 11,
      hash: 'cover_def456',
      ext: '.png',
      mime: 'image/png',
      width: 1200,
      height: 800,
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(11, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(dbUpdate.mock.calls[0][0].data).toMatchObject({ width: null, height: null });
  });

  test('keeps the old extension, and so the url, when the file type stays the same', async () => {
    currentDbFile = {
      id: 12,
      hash: 'notes_ghi789',
      ext: '.text',
      mime: 'text/plain',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(12, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({
      hash: 'notes_ghi789',
      ext: '.text',
    });
  });

  /**
   * Browsers decode a raster image from its bytes, so the url keeps working, and links
   * to it pasted into rich text or Blocks fields don't break.
   */
  test('keeps the old extension when a raster image replaces another raster image', async () => {
    currentDbFile = {
      id: 14,
      hash: 'photo_mno345',
      ext: '.png',
      mime: 'image/png',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(14, {
      data: { fileInfo: {} as any },
      file: inputFile({ originalFilename: 'photo.jpg', mimetype: 'image/jpeg' }) as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({
      hash: 'photo_mno345',
      ext: '.png',
      mime: 'image/jpeg',
    });
  });

  test('takes the new extension when an svg replaces a raster image', async () => {
    currentDbFile = {
      id: 15,
      hash: 'logo_pqr678',
      ext: '.png',
      mime: 'image/png',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(15, {
      data: { fileInfo: {} as any },
      file: inputFile({ originalFilename: 'logo.svg', mimetype: 'image/svg+xml' }) as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({ ext: '.svg' });
  });

  test('ignores case and parameters when comparing mime types', async () => {
    currentDbFile = {
      id: 16,
      hash: 'notes_stu901',
      ext: '.text',
      mime: 'Text/Plain',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(16, {
      data: { fileInfo: {} as any },
      file: inputFile({ mimetype: 'text/plain; charset=utf-8' }) as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({ ext: '.text' });
  });

  // A file without an extension, of a type mime-types doesn't know, gets `.false`.
  test('keeps the old extension when the new file has no usable one', async () => {
    currentDbFile = {
      id: 17,
      hash: 'data_vwx234',
      ext: '.png',
      mime: 'image/png',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(17, {
      data: { fileInfo: {} as any },
      file: inputFile({ originalFilename: 'data', mimetype: 'application/x-unknown-kind' }) as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({
      hash: 'data_vwx234',
      ext: '.png',
    });
  });

  test('keeps the old extension for a stored file without a mime type', async () => {
    currentDbFile = {
      id: 13,
      hash: 'legacy_jkl012',
      ext: '.png',
      provider: PROVIDER,
      formats: null,
    };

    await uploadService.replace(13, {
      data: { fileInfo: {} as any },
      file: inputFile() as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({ ext: '.png' });
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

  /**
   * `formatFileInfo` turns the triplet into a one-element `related` array, and the database
   * layer reads a bare array as `set` — whose morphToMany branch deletes every join row for
   * the file before inserting. Writing `related` here would therefore detach the file from
   * every other entry using it, so the triplet is dropped instead of forwarded.
   */
  test('does not write related, even when the relation triplet is sent', async () => {
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

    expect(dbUpdate.mock.calls[0][0].data).not.toHaveProperty('related');
  });

  test('still forwards the other metas when the triplet is sent alongside them', async () => {
    currentDbFile = {
      id: 8,
      hash: 'related_with_path',
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
        path: 'baz/qux',
      },
      file: inputFile() as any,
    });

    expect(providerMethods.replace.mock.calls[0][0]).toMatchObject({ path: 'baz/qux' });
    expect(dbUpdate.mock.calls[0][0].data).not.toHaveProperty('related');
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

  describe('fields that use the file', () => {
    const imageFile = (id: number) => ({
      id,
      hash: `cover_${id}`,
      ext: '.png',
      mime: 'image/png',
      provider: PROVIDER,
      formats: null,
    });

    const expectNothingWritten = () => {
      expect(providerMethods.replace).not.toHaveBeenCalled();
      expect(providerMethods.upload).not.toHaveBeenCalled();
      expect(dbUpdate).not.toHaveBeenCalled();
    };

    /**
     * `allowedTypes` is only checked when a file is picked for a field. Replacing the
     * file in the Media Library must not put a text file in an images-only field.
     */
    test('rejects a replacement that a field using the file does not accept', async () => {
      currentDbFile = imageFile(20);
      currentUsages = [{ related_type: 'api::article.article', field: 'cover' }];

      await expect(
        uploadService.replace(20, {
          data: { fileInfo: {} as any },
          file: inputFile() as any,
        })
      ).rejects.toThrow(new Error('Article (cover) only accepts images.'));

      expectNothingWritten();
    });

    test('names fields inside components, with every type they accept', async () => {
      currentDbFile = imageFile(21);
      currentUsages = [{ related_type: 'shared.seo', field: 'shareImage' }];

      await expect(
        uploadService.replace(21, {
          data: { fileInfo: {} as any },
          file: inputFile() as any,
        })
      ).rejects.toThrow(new Error('Seo (shareImage) only accepts images or videos.'));

      expectNothingWritten();
    });

    test('gives one sentence per field when several reject the file', async () => {
      currentDbFile = imageFile(27);
      currentUsages = [
        { related_type: 'api::article.article', field: 'cover' },
        { related_type: 'shared.seo', field: 'shareImage' },
      ];

      const error = await uploadService
        .replace(27, { data: { fileInfo: {} as any }, file: inputFile() as any })
        .catch((e: any) => e);

      expect(error.message).toBe(
        'Article (cover) only accepts images. Seo (shareImage) only accepts images or videos.'
      );
    });

    test('lists a field once, however many entries use the file through it', async () => {
      currentDbFile = imageFile(22);
      // A draft and its published version each have a row.
      currentUsages = [
        { related_type: 'api::article.article', field: 'cover' },
        { related_type: 'api::article.article', field: 'cover' },
      ];

      const error = await uploadService
        .replace(22, { data: { fileInfo: {} as any }, file: inputFile() as any })
        .catch((e: any) => e);

      expect(error.details).toEqual({
        fields: [{ field: 'Article (cover)', allowedTypes: ['images'] }],
      });
    });

    test('allows a replacement every field using the file accepts', async () => {
      currentDbFile = imageFile(23);
      currentUsages = [
        { related_type: 'api::article.article', field: 'cover' },
        { related_type: 'shared.seo', field: 'shareImage' },
      ];

      await uploadService.replace(23, {
        data: { fileInfo: {} as any },
        file: inputFile({ originalFilename: 'photo.jpg', mimetype: 'image/jpeg' }) as any,
      });

      expect(providerMethods.replace).toHaveBeenCalledTimes(1);
    });

    test('allows any type in a field without allowedTypes', async () => {
      currentDbFile = imageFile(24);
      currentUsages = [{ related_type: 'api::article.article', field: 'gallery' }];

      await uploadService.replace(24, {
        data: { fileInfo: {} as any },
        file: inputFile() as any,
      });

      expect(providerMethods.replace).toHaveBeenCalledTimes(1);
    });

    test('does not let a field that already held a file it rejects block the replace', async () => {
      currentDbFile = { ...imageFile(25), ext: '.pdf', mime: 'application/pdf' };
      // A PDF set as an images-only cover through the API: the replace doesn't make it worse.
      currentUsages = [{ related_type: 'api::article.article', field: 'cover' }];

      await uploadService.replace(25, {
        data: { fileInfo: {} as any },
        file: inputFile() as any,
      });

      expect(providerMethods.replace).toHaveBeenCalledTimes(1);
    });

    test('ignores rows for models or fields that no longer exist', async () => {
      currentDbFile = imageFile(26);
      currentUsages = [
        { related_type: 'api::removed.removed', field: 'cover' },
        { related_type: 'api::article.article', field: 'removedField' },
        { related_type: 'api::article.article', field: 'title' },
      ];

      await uploadService.replace(26, {
        data: { fileInfo: {} as any },
        file: inputFile() as any,
      });

      expect(providerMethods.replace).toHaveBeenCalledTimes(1);
    });
  });
});

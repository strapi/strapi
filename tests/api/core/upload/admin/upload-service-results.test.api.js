'use strict';

/**
 * Runtime evidence for the upload service members whose result is inferred `any` from
 * `strapi.db.query`. Each test pins the key set and the runtime value types of the result against
 * its contract in `packages/core/upload/server/src/types/services.ts`, so that a later typing of
 * these results follows what the database layer returns.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');

const FILE_MODEL_UID = 'plugin::upload.file';
const FOLDER_MODEL_UID = 'plugin::upload.folder';

// Scalar columns of a `plugin::upload.file` row: no relation is selected without a populate.
const FILE_ROW_KEYS = [
  'alternativeText',
  'caption',
  'createdAt',
  'documentId',
  'ext',
  'focalPoint',
  'folderPath',
  'formats',
  'hash',
  'height',
  'id',
  'locale',
  'mime',
  'name',
  'previewUrl',
  'provider',
  'provider_metadata',
  'publishedAt',
  'size',
  'updatedAt',
  'url',
  'width',
];

// Scalar columns of a `plugin::upload.folder` row.
const FOLDER_ROW_KEYS = [
  'createdAt',
  'documentId',
  'id',
  'locale',
  'name',
  'path',
  'pathId',
  'publishedAt',
  'updatedAt',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const sortedKeys = (value) => Object.keys(value).sort();

const expectFolderRow = (folder) => {
  expect(sortedKeys(folder)).toEqual(FOLDER_ROW_KEYS);
  expect(folder).toMatchObject({
    id: expect.any(Number),
    documentId: expect.any(String),
    name: expect.any(String),
    pathId: expect.any(Number),
    path: expect.stringMatching(/^(\/\d+)+$/),
    createdAt: expect.stringMatching(ISO_DATE),
    updatedAt: expect.stringMatching(ISO_DATE),
    publishedAt: expect.stringMatching(ISO_DATE),
    locale: null,
  });
};

// `image`: the file has dimensions. `formats`: the image is large enough for a thumbnail (the
// 20x20 `rec.jpg` is not, the 256x256 `strapi.jpg` is).
const expectFileRow = (file, { keys = FILE_ROW_KEYS, image = true, formats = false } = {}) => {
  expect(sortedKeys(file)).toEqual([...keys].sort());
  expect(file).toMatchObject({
    id: expect.any(Number),
    documentId: expect.any(String),
    name: expect.any(String),
    hash: expect.any(String),
    ext: expect.any(String),
    mime: expect.any(String),
    size: expect.any(Number),
    url: expect.any(String),
    previewUrl: null,
    provider: 'local',
    provider_metadata: null,
    folderPath: expect.stringMatching(/^\/(\d+(\/\d+)*)?$/),
    createdAt: expect.stringMatching(ISO_DATE),
    updatedAt: expect.stringMatching(ISO_DATE),
    publishedAt: expect.stringMatching(ISO_DATE),
    locale: null,
  });

  if (image) {
    expect(file.width).toEqual(expect.any(Number));
    expect(file.height).toEqual(expect.any(Number));
  } else {
    expect(file.width).toBeNull();
    expect(file.height).toBeNull();
  }

  if (formats) {
    expect(file.formats).not.toBeNull();
    expect(typeof file.formats).toBe('object');
  } else {
    expect(file.formats).toBeNull();
  }
};

describe('Upload service results', () => {
  let strapi;
  let tmpDir;

  const uploadService = () => strapi.plugin('upload').service('upload');
  const fileService = () => strapi.plugin('upload').service('file');
  const folderService = () => strapi.plugin('upload').service('folder');
  const apiUploadFolderService = () => strapi.plugin('upload').service('api-upload-folder');

  // The upload pipeline consumes the file it gets, so each call gets a fresh copy of the fixture.
  const inputFile = async (fixture, mimetype) => {
    const filepath = path.join(tmpDir, `${Date.now()}-${Math.random()}-${fixture}`);
    await fs.promises.copyFile(path.join(__dirname, '../utils', fixture), filepath);
    const { size } = await fs.promises.stat(filepath);
    return { filepath, originalFilename: fixture, mimetype, size };
  };

  const uploadImage = async (fileInfo = {}, fixture = 'rec.jpg') => {
    const [file] = await uploadService().upload({
      data: { fileInfo },
      files: [await inputFile(fixture, 'image/jpeg')],
    });
    return file;
  };

  const findRow = (id) => strapi.db.query(FILE_MODEL_UID).findOne({ where: { id } });

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-service-results-'));
  });

  afterAll(async () => {
    await strapi.db.query(FILE_MODEL_UID).deleteMany({});
    await strapi.db.query(FOLDER_MODEL_UID).deleteMany({});
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    await strapi.destroy();
  });

  describe('folder', () => {
    test('create resolves to the stored folder row, without relations', async () => {
      const folder = await folderService().create({ name: 'evidence create', parent: null });

      expectFolderRow(folder);
      expect(folder.name).toBe('evidence create');
      expect(folder.path).toBe(`/${folder.pathId}`);
    });

    test('create with a user resolves to the row without the creator relations', async () => {
      const user = await strapi.db.query('admin::user').findOne({});
      const parent = await folderService().create({ name: 'evidence parent', parent: null });
      const folder = await folderService().create(
        { name: 'evidence child', parent: parent.id },
        user === null ? undefined : { user }
      );

      expectFolderRow(folder);
      expect(folder.path).toBe(`${parent.path}/${folder.pathId}`);
    });

    test('update of the name resolves to the stored folder row, without relations', async () => {
      const created = await folderService().create({ name: 'evidence rename', parent: null });
      const folder = await folderService().update(
        created.id,
        { name: 'evidence renamed' },
        { user: { id: 1 } }
      );

      expectFolderRow(folder);
      expect(folder).toMatchObject({
        id: created.id,
        name: 'evidence renamed',
        path: created.path,
      });
    });

    test('update of the name resolves to undefined when no folder has the id', async () => {
      const folder = await folderService().update(
        999999,
        { name: 'evidence missing' },
        { user: { id: 1 } }
      );

      expect(folder).toBeUndefined();
    });

    test('update of the parent resolves to the stored folder row, without relations', async () => {
      const destination = await folderService().create({ name: 'evidence dest', parent: null });
      const created = await folderService().create({ name: 'evidence move', parent: null });
      const folder = await folderService().update(
        created.id,
        { name: 'evidence moved', parent: destination.id },
        { user: { id: 1 } }
      );

      expectFolderRow(folder);
      expect(folder).toMatchObject({
        id: created.id,
        name: 'evidence moved',
        path: `${destination.path}/${created.pathId}`,
      });
    });

    test('update of the parent to the root resolves to the stored folder row', async () => {
      const parent = await folderService().create({ name: 'evidence old parent', parent: null });
      const created = await folderService().create({ name: 'evidence root', parent: parent.id });
      const folder = await folderService().update(
        created.id,
        { name: 'evidence at root', parent: null },
        { user: { id: 1 } }
      );

      expectFolderRow(folder);
      expect(folder.path).toBe(`/${created.pathId}`);
    });
  });

  describe('api-upload-folder', () => {
    test('getAPIUploadFolder creates the folder on first use and resolves to its row', async () => {
      const created = await apiUploadFolderService().getAPIUploadFolder();

      expectFolderRow(created);
      expect(created.name).toMatch(/^API Uploads/);
    });

    test('getAPIUploadFolder resolves to the stored folder row once it exists', async () => {
      const created = await apiUploadFolderService().getAPIUploadFolder();
      const folder = await apiUploadFolderService().getAPIUploadFolder();

      expectFolderRow(folder);
      expect(folder).toEqual(created);
    });

    test('getAPIUploadFolder creates a new folder when the stored one was deleted', async () => {
      const previous = await apiUploadFolderService().getAPIUploadFolder();
      await strapi.db.query(FOLDER_MODEL_UID).delete({ where: { id: previous.id } });

      const folder = await apiUploadFolderService().getAPIUploadFolder();

      expectFolderRow(folder);
      expect(folder.id).not.toBe(previous.id);
    });
  });

  describe('file', () => {
    test('getFolderPath resolves to "/" without a folder id', async () => {
      await expect(fileService().getFolderPath()).resolves.toBe('/');
      await expect(fileService().getFolderPath(null)).resolves.toBe('/');
    });

    test('getFolderPath resolves to the folder path string', async () => {
      const folder = await folderService().create({ name: 'evidence path', parent: null });

      const folderPath = await fileService().getFolderPath(folder.id);

      expect(typeof folderPath).toBe('string');
      expect(folderPath).toBe(folder.path);
    });

    // `findOne` resolves to `null`: the service rejects like the folder-exists validation does.
    test('getFolderPath rejects with a ValidationError when the folder was deleted', async () => {
      const folder = await folderService().create({ name: 'evidence deleted', parent: null });
      await strapi.db.query(FOLDER_MODEL_UID).delete({ where: { id: folder.id } });

      await expect(fileService().getFolderPath(folder.id)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'the folder does not exist',
      });
    });

    test('deleteByIds resolves to the deleted file rows, without relations', async () => {
      const first = await uploadImage();
      const second = await uploadImage();

      const deleted = await fileService().deleteByIds([first.id, second.id]);

      expect(deleted).toHaveLength(2);
      deleted.forEach((file) => expectFileRow(file));
      expect(deleted.map((file) => file.id).sort()).toEqual([first.id, second.id].sort());
      await expect(findRow(first.id)).resolves.toBeNull();
    });

    test('deleteByIds resolves to an empty array when no file has the ids', async () => {
      await expect(fileService().deleteByIds([999999])).resolves.toEqual([]);
    });
  });

  describe('upload', () => {
    test('upload resolves to the stored file rows, without relations or isUrlSigned', async () => {
      const files = await uploadService().upload({
        data: { fileInfo: [{ alternativeText: 'alt' }, {}] },
        files: [
          await inputFile('strapi.jpg', 'image/jpeg'),
          await inputFile('rec.pdf', 'application/pdf'),
        ],
      });

      expect(files).toHaveLength(2);
      const [image, pdf] = files;

      expectFileRow(image, { formats: true });
      expect(image.alternativeText).toBe('alt');
      expect(image.caption).toBeNull();
      expect(image.focalPoint).toBeNull();
      expect(sortedKeys(image.formats)).toEqual(['thumbnail']);
      expect(sortedKeys(image.formats.thumbnail)).toEqual([
        'ext',
        'hash',
        'height',
        'mime',
        'name',
        'path',
        'size',
        'sizeInBytes',
        'url',
        'width',
      ]);
      expect(image.formats.thumbnail).toMatchObject({
        name: 'thumbnail_strapi.jpg',
        hash: expect.any(String),
        ext: '.jpg',
        mime: 'image/jpeg',
        path: null,
        width: expect.any(Number),
        height: expect.any(Number),
        size: expect.any(Number),
        sizeInBytes: expect.any(Number),
        url: expect.any(String),
      });
      expect(image).toEqual(await findRow(image.id));

      expectFileRow(pdf, { image: false });
      expect(pdf).toEqual(await findRow(pdf.id));
    });

    test('upload into a folder resolves to the row without the folder relation', async () => {
      const folder = await folderService().create({ name: 'evidence upload', parent: null });

      const file = await uploadImage({ folder: folder.id });

      expectFileRow(file);
      expect(file.folderPath).toBe(folder.path);
    });

    test('updateFileInfo resolves to the stored file row, without relations', async () => {
      const created = await uploadImage();
      const folder = await folderService().create({ name: 'evidence info', parent: null });

      const file = await uploadService().updateFileInfo(created.id, {
        name: 'renamed.jpg',
        caption: 'caption',
        focalPoint: { x: 1, y: 2 },
        folder: folder.id,
      });

      expectFileRow(file);
      expect(file).toMatchObject({
        id: created.id,
        name: 'renamed.jpg',
        caption: 'caption',
        focalPoint: { x: 1, y: 2 },
        folderPath: folder.path,
      });
      expect(file).toEqual(await findRow(created.id));
    });

    test('updateFileInfo rejects with a NotFoundError when no file has the id', async () => {
      await expect(
        uploadService().updateFileInfo(999999, { name: 'missing' })
      ).rejects.toMatchObject({ name: 'NotFoundError', message: 'Entity not found' });
    });

    test('replace resolves to the stored file row, without relations', async () => {
      const created = await uploadImage({}, 'strapi.jpg');
      expectFileRow(created, { formats: true });

      const file = await uploadService().replace(created.id, {
        data: { fileInfo: {} },
        file: await inputFile('rec.pdf', 'application/pdf'),
      });

      expectFileRow(file, { image: false });
      expect(file).toMatchObject({ id: created.id, hash: created.hash, ext: created.ext });
      expect(file).toEqual(await findRow(created.id));
    });

    test('remove resolves to the deleted file row, without relations', async () => {
      const created = await uploadImage();

      const removed = await uploadService().remove(created);

      expectFileRow(removed);
      expect(removed).toEqual(created);
      await expect(findRow(created.id)).resolves.toBeNull();
    });

    test('remove resolves to null when the row was already deleted', async () => {
      const created = await uploadImage();
      await strapi.db.query(FILE_MODEL_UID).delete({ where: { id: created.id } });

      await expect(uploadService().remove(created)).resolves.toBeNull();
    });

    // The default local provider is not private, so `signFileUrls` only adds `isUrlSigned: false`.
    test('findOne resolves to the row with isUrlSigned false', async () => {
      const created = await uploadImage();

      const file = await uploadService().findOne(created.id);

      expectFileRow(file, { keys: [...FILE_ROW_KEYS, 'isUrlSigned'] });
      expect(file).toEqual({ ...(await findRow(created.id)), isUrlSigned: false });
    });

    test('findOne carries the folder only when populated', async () => {
      const folder = await folderService().create({ name: 'evidence find', parent: null });
      const created = await uploadImage({ folder: folder.id });

      const file = await uploadService().findOne(created.id, {
        folder: { fields: ['id', 'name'] },
      });

      expectFileRow(file, { keys: [...FILE_ROW_KEYS, 'folder', 'isUrlSigned'] });
      expect(file.folder).toEqual({
        id: folder.id,
        documentId: folder.documentId,
        name: folder.name,
      });
    });

    test('findOne carries related only when populated', async () => {
      const created = await uploadImage();

      const file = await uploadService().findOne(created.id, ['related']);

      expectFileRow(file, { keys: [...FILE_ROW_KEYS, 'related', 'isUrlSigned'] });
      expect(file.related).toEqual([]);
    });

    test('findOne resolves to null when no file has the id', async () => {
      await expect(uploadService().findOne(999999)).resolves.toBeNull();
    });

    test('findPage resolves to the rows with isUrlSigned false and the page pagination', async () => {
      const created = await uploadImage({ name: 'evidence-page.jpg' });

      const page = await uploadService().findPage({
        filters: { id: created.id },
        page: 1,
        pageSize: 10,
      });

      expect(sortedKeys(page)).toEqual(['pagination', 'results']);
      expect(page.pagination).toEqual({ page: 1, pageSize: 10, pageCount: 1, total: 1 });
      expect(page.results).toHaveLength(1);
      expectFileRow(page.results[0], { keys: [...FILE_ROW_KEYS, 'isUrlSigned'] });
      expect(page.results[0]).toEqual({ ...(await findRow(created.id)), isUrlSigned: false });
    });

    test('findAndCountPage resolves to the rows with isUrlSigned false and the counted pagination', async () => {
      const created = await uploadImage();

      const page = await uploadService().findAndCountPage({
        filters: { id: created.id },
        pagination: { page: 1, pageSize: 10 },
      });

      expect(sortedKeys(page)).toEqual(['pagination', 'results']);
      expect(page.pagination).toEqual({ page: 1, pageSize: 10, pageCount: 1, total: 1 });
      expect(page.results).toHaveLength(1);
      expectFileRow(page.results[0], { keys: [...FILE_ROW_KEYS, 'isUrlSigned'] });
      expect(page.results[0]).toEqual({ ...(await findRow(created.id)), isUrlSigned: false });
    });

    test('findAndCountPage without the count resolves to a pagination without total', async () => {
      const created = await uploadImage();

      const page = await uploadService().findAndCountPage({
        filters: { id: created.id },
        pagination: { start: 0, limit: 10, withCount: false },
      });

      expect(page.pagination).toEqual({ start: 0, limit: 10 });
      expect(page.results).toHaveLength(1);
      expectFileRow(page.results[0], { keys: [...FILE_ROW_KEYS, 'isUrlSigned'] });
    });
  });
});

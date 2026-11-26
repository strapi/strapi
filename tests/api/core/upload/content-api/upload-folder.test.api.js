'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest, createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let rqAdmin;
let parentFolder;
let targetFolder;
let dog;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    pic: {
      type: 'media',
    },
  },
};

const fixture = (name) => fs.createReadStream(path.join(__dirname, `../utils/${name}`));

const createFolder = async (name, parent = null) => {
  const res = await rqAdmin({
    method: 'POST',
    url: '/upload/folders',
    body: { name, parent },
  });

  expect(res.statusCode).toBe(201);

  return res.body.data;
};

const getFile = async (id) => {
  const { body } = await rqAdmin({
    method: 'GET',
    url: `/upload/files/${id}`,
  });

  return body;
};

const countFiles = () => strapi.db.query('plugin::upload.file').count();

describe('Content API upload - folder parameter', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });

    parentFolder = await createFolder('Parent');
    // nested, so folderPath is more than a single segment
    targetFolder = await createFolder('Target', parentFolder.id);

    const res = await rqAdmin({
      method: 'POST',
      url: '/content-manager/collection-types/api::dog.dog',
      body: {},
    });
    dog = res.body.data;
  });

  afterAll(async () => {
    const res = await rqAdmin({
      method: 'GET',
      url: '/upload/folders',
    });

    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: res.body.data.map((f) => f.id),
      },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  test('Omitting folder keeps uploading into "API Uploads"', async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: { files: fixture('rec.jpg') },
    });

    expect(res.statusCode).toBe(201);

    const file = await getFile(res.body[0].id);

    expect(file).toMatchObject({
      folder: { name: expect.stringMatching(/^API Uploads/) },
      folderPath: `/${file.folder.pathId}`,
    });
  });

  test('folder=<id> uploads into that folder', async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: { files: fixture('rec.jpg'), folder: String(targetFolder.id) },
    });

    expect(res.statusCode).toBe(201);

    const file = await getFile(res.body[0].id);

    expect(file.folder).toMatchObject({ id: targetFolder.id });
    expect(file.folderPath).toBe(targetFolder.path);
  });

  test('folder=<id> applies to every file of a multi-file upload', async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: [fixture('rec.jpg'), fixture('strapi.jpg')],
        folder: String(targetFolder.id),
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveLength(2);

    const files = await Promise.all(res.body.map(({ id }) => getFile(id)));

    files.forEach((file) => {
      expect(file.folder).toMatchObject({ id: targetFolder.id });
      expect(file.folderPath).toBe(targetFolder.path);
    });
  });

  test('folder=null uploads into the root', async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: { files: fixture('rec.jpg'), folder: 'null' },
    });

    expect(res.statusCode).toBe(201);

    const file = await getFile(res.body[0].id);

    expect(file.folder).toBeNull();
    expect(file.folderPath).toBe('/');
  });

  test('An unknown folder id is rejected and no file is created', async () => {
    const before = await countFiles();

    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: { files: fixture('rec.jpg'), folder: '999999' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({
      name: 'ValidationError',
      message: 'Folder with id 999999 does not exist',
    });
    expect(await countFiles()).toBe(before);
  });

  test.each(['abc', '-1', '0', '1.5'])(
    'An invalid folder value (%s) is rejected',
    async (folder) => {
      const before = await countFiles();

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: fixture('rec.jpg'), folder },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ name: 'ValidationError' });
      expect(await countFiles()).toBe(before);
    }
  );

  test('ref / refId / field with folder attaches the file and puts it in the folder', async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fixture('rec.jpg'),
        refId: dog.id,
        ref: 'api::dog.dog',
        field: 'pic',
        folder: String(targetFolder.id),
      },
    });

    expect(res.statusCode).toBe(201);

    const fileId = res.body[0].id;
    const file = await getFile(fileId);

    expect(file.folder).toMatchObject({ id: targetFolder.id });
    expect(file.folderPath).toBe(targetFolder.path);

    const { body } = await rq({
      method: 'GET',
      url: `/dogs/${dog.documentId}`,
      qs: { populate: 'pic' },
    });

    expect(body.data.pic).toMatchObject({ id: fileId });
  });

  test('Replacing a file ignores folder', async () => {
    const uploadRes = await rq({
      method: 'POST',
      url: '/upload',
      formData: { files: fixture('rec.jpg') },
    });
    const original = await getFile(uploadRes.body[0].id);

    const res = await rq({
      method: 'POST',
      url: `/upload?id=${original.id}`,
      formData: { files: fixture('strapi.jpg'), folder: String(targetFolder.id) },
    });

    expect(res.statusCode).toBe(200);

    const replaced = await getFile(original.id);

    expect(replaced.folder).toMatchObject({ id: original.folder.id });
    expect(replaced.folderPath).toBe(original.folderPath);
  });

  test('Deleting the target folder also deletes the files uploaded into it', async () => {
    const folder = await createFolder('To delete', parentFolder.id);

    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: { files: fixture('rec.jpg'), folder: String(folder.id) },
    });

    expect(res.statusCode).toBe(201);

    const fileId = res.body[0].id;

    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { folderIds: [folder.id] },
    });

    const { statusCode } = await rqAdmin({
      method: 'GET',
      url: `/upload/files/${fileId}`,
    });

    expect(statusCode).toBe(404);
  });
});

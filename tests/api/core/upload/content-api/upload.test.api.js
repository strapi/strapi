'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
const data = { dogs: [] };
let strapi;
let rq;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    profilePicture: {
      type: 'media',
    },
  },
};

const todoListModel = {
  displayName: 'TodoList',
  singularName: 'todolist',
  pluralName: 'todolists',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
    todo: {
      displayName: 'todo',
      type: 'component',
      repeatable: true,
      component: 'default.todo',
    },
  },
};

const todoComponent = {
  displayName: 'Todo',
  attributes: {
    docs: {
      allowedTypes: ['images', 'files', 'videos', 'audios'],
      type: 'media',
      multiple: true,
    },
    task: {
      type: 'string',
    },
  },
};

describe('Upload plugin', () => {
  beforeAll(async () => {
    await builder
      .addContentType(dogModel)
      .addComponent(todoComponent)
      .addContentType(todoListModel)
      .build();
    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create', () => {
    test('Simple image upload', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'rec.jpg',
          ext: '.jpg',
          mime: 'image/jpeg',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
        })
      );
    });

    test('Rejects when no files are provided', async () => {
      const res = await rq({ method: 'POST', url: '/upload', formData: {} });
      expect(res.statusCode).toBe(400);
    });

    test('Generates a thumbnail on large enough files', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/thumbnail_target.png')),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'thumbnail_target.png',
          ext: '.png',
          mime: 'image/png',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          formats: {
            thumbnail: {
              name: 'thumbnail_thumbnail_target.png',
              hash: expect.any(String),
              ext: '.png',
              mime: 'image/png',
              size: expect.any(Number),
              sizeInBytes: expect.any(Number),
              width: expect.any(Number),
              height: expect.any(Number),
              url: expect.any(String),
              path: null,
            },
          },
        })
      );
    });
  });

  describe('Read', () => {
    test('Get files', async () => {
      const getRes = await rq({ method: 'GET', url: '/upload/files' });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            url: expect.any(String),
          }),
        ])
      );
    });

    test('Get one file', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/thumbnail_target.png')),
        },
      });

      const dogEntity = await strapi.db.query('api::dog.dog').create({
        data: {
          profilePicture: res.body[0].id,
        },
        populate: {
          profilePicture: true,
        },
      });

      const getRes = await rq({
        method: 'GET',
        url: `/upload/files/${dogEntity.profilePicture.id}`,
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          url: expect.any(String),
        })
      );

      await strapi.db.query('api::dog.dog').delete({ where: { id: dogEntity.id } });
      await strapi.db
        .query('plugin::upload.file')
        .delete({ where: { id: dogEntity.profilePicture.id } });
    });
  });
});

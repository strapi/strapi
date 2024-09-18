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
    relatedMedia: {
      type: 'media',
      multiple: true,
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

      expect(res.statusCode).toBe(201);
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

      expect(res.statusCode).toBe(201);
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

  describe('Filtering data based on media attributes', () => {
    let uploadRes;
    let dogRes;

    beforeAll(async () => {
      await Promise.all(
        data.dogs.map((dog) => {
          return strapi.entityService.delete('api::dog.dog', dog.data.id);
        })
      );

      uploadRes = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          fileInfo: JSON.stringify({
            alternativeText: 'rec',
            caption: 'my caption',
          }),
        },
      });

      dogRes = await rq({
        method: 'POST',
        url: '/dogs',
        body: {
          data: {
            profilePicture: {
              id: uploadRes.body[0].id,
            },
          },
        },
      });
    });

    afterAll(async () => {
      await rq({
        method: 'DELETE',
        url: `/dogs/${dogRes.body.data.id}`,
      });

      await rq({
        method: 'DELETE',
        url: `/upload/files/${uploadRes.body[0].id}`,
      });
    });

    test('can filter on notNull', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $notNull: true },
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $notNull: false },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    test('can filter on null', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $null: true },
          },
        },
      });

      expect(res.body.data.length).toBe(0);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { $null: false },
          },
        },
      });

      expect(res.body.data.length).toBe(1);
    });

    test('can filter on id', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: uploadRes.body[0].id,
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: 999999999,
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    test('can filter media attribute', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { ext: '.jpg' },
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: { ext: '.pdf' },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    test('can filter media attribute with operators', async () => {
      let res;

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: {
              caption: {
                $contains: 'my',
              },
            },
          },
        },
      });

      expect(res.body.data.length).toBe(1);

      res = await rq({
        method: 'GET',
        url: '/dogs',
        qs: {
          filters: {
            profilePicture: {
              caption: {
                $contains: 'not',
              },
            },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });

    describe('Media relations', () => {
      test('connect returns the right status code', async () => {
        // upload images
        const images = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            ],
          },
        });
        const imageIds = images.body.map((item) => item.id);

        // create entity with just the first image
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // connect the second image
        const connectRes = await rq({
          method: 'PUT',
          url: `/dogs/${documentId}?populate=*`,
          body: JSON.stringify({
            data: {
              relatedMedia: {
                connect: [imageIds[0]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        // TODO: once Github issue 20961 is fixed, uncomment these lines to test results and update this test name to "works"
        // expect(connectRes.body.data.relatedMedia).toHaveLength(1);

        // expect(connectRes.body.data.relatedMedia[1]).toEqual(
        //   expect.objectContaining({
        //     id: images.body[1].id,
        //   })
        // );
      });

      test('disconnect returns the right status code', async () => {
        // upload images
        const images = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            ],
          },
        });
        const imageIds = images.body.map((item) => item.id);

        // create entity with just the first image
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // connect the second image
        const connectRes = await rq({
          method: 'PUT',
          url: `/dogs/${documentId}?populate=*`,
          body: JSON.stringify({
            data: {
              relatedMedia: {
                disconnect: [imageIds[0]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        // TODO: once Github issue 20961 is fixed, uncomment these lines to test results and update this test name to "works"
        // expect(connectRes.body.data.relatedMedia).toHaveLength(1);

        // expect(connectRes.body.data.relatedMedia[1]).toEqual(
        //   expect.objectContaining({
        //     id: images.body[1].id,
        //   })
        // );
      });

      test('set works', async () => {
        // upload images
        const images = await rq({
          method: 'POST',
          url: '/upload',
          formData: {
            files: [
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
              fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            ],
          },
        });
        const imageIds = images.body.map((item) => item.id);

        // create entity with just the first image
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // connect the second image
        const connectRes = await rq({
          method: 'PUT',
          url: `/dogs/${documentId}?populate=*`,
          body: JSON.stringify({
            data: {
              relatedMedia: {
                set: [imageIds[0], imageIds[1]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        expect(connectRes.body.data.relatedMedia).toHaveLength(2);
        expect(connectRes.body.data.relatedMedia[0]).toEqual(
          expect.objectContaining({
            id: images.body[0].id,
          })
        );
        expect(connectRes.body.data.relatedMedia[1]).toEqual(
          expect.objectContaining({
            id: images.body[1].id,
          })
        );
      });
    });
  });
});

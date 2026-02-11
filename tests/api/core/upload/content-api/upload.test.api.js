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
      test('connect works', async () => {
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
                connect: [imageIds[1]],
              },
            },
          }),
        });

        expect(connectRes.status).toBe(200);

        expect(connectRes.body.data.relatedMedia).toHaveLength(2);

        expect(connectRes.body.data.relatedMedia).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: imageIds[0] }),
            expect.objectContaining({ id: imageIds[1] }),
          ])
        );
      });

      test('disconnect works', async () => {
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

        // create entity with both images
        const res = await rq({
          method: 'POST',
          url: `/dogs/?populate=*`,
          body: {
            data: {
              relatedMedia: [imageIds[0], imageIds[1]],
            },
          },
        });

        const documentId = res.body.data.documentId;

        // disconnect the first image
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

        expect(connectRes.body.data.relatedMedia).toHaveLength(1);

        expect(connectRes.body.data.relatedMedia[0]).toEqual(
          expect.objectContaining({
            id: imageIds[1],
          })
        );
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

  describe('File restriction', () => {
    afterEach(() => {
      strapi.config.set('plugin::upload.security', {});
    });

    describe('validation matrix (real detection)', () => {
      const utilsPath = (name) => path.join(__dirname, '../utils', name);
      const fixturePaths = {
        jpg: utilsPath('rec.jpg'),
        png: utilsPath('strapi.png'),
        pdf: utilsPath('rec.pdf'),
        docx: utilsPath('rec.docx'),
        txt: utilsPath('rec.txt'),
        unknown: utilsPath('rec.bin'),
      };

      const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      // allowedList: undefined = no allow list (allow all); [] = explicit empty (reject all); string[] = allow only these
      const MATRIX = [
        {
          description: 'no config: detectable → allow',
          allowedList: undefined,
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'allow',
        },
        {
          description: 'no config: undetectable → allow',
          allowedList: undefined,
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'explicit empty allowedTypes → reject any file',
          allowedList: [],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'explicit empty allowedTypes + undetectable file → reject',
          allowedList: [],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description: 'deny only: declared in deny → reject',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'deny only: detected in deny → reject',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'deny only: extension MIME in deny → reject',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'jpg',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'deny only: type not in deny → allow',
          allowedList: undefined,
          bannedList: ['image/png'],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'allow',
        },
        {
          description: 'allow+deny: declared in ban → reject',
          allowedList: ['image/jpeg', 'image/png'],
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'allow+deny: detected in ban → reject',
          allowedList: ['image/jpeg', 'image/png'],
          bannedList: ['image/png'],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'reject',
        },
        {
          description: 'allow+deny: extension MIME in ban → reject',
          allowedList: ['image/*'],
          bannedList: ['image/png'],
          contentKind: 'jpg',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, no extension, declared in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'noext',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, no extension, declared generic → reject',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'noext',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, no extension (any declared) → reject',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'noext',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, extension in allow, declared matches extension → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable, extension in allow, declared generic → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'undetectable, extension in allow, declared empty (generic) → allow',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: '',
          expectedResult: 'allow',
        },
        {
          description:
            'undetectable, extension in allow, declared does not match extension → reject',
          allowedList: ['text/plain', 'application/pdf'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.pdf',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, extension not in allow list → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'txt',
          uploadedFileName: 'a.txt',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, unknown extension, declared generic → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'file.xyz',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'reject',
        },
        {
          description:
            'undetectable, unknown extension, declared specific in allow (no MIME for .xyz) → reject',
          allowedList: ['text/plain'],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'undetectable, unknown extension, declared specific not in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'unknown',
          uploadedFileName: 'a.xyz',
          uploadedFileDeclaredType: 'text/plain',
          expectedResult: 'reject',
        },
        {
          description: 'detectable, detected in allow, extension matches → allow',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'image/jpeg',
          expectedResult: 'allow',
        },
        {
          description: 'detectable, detected in allow, extension does not match (warn but allow)',
          allowedList: ['image/jpeg', 'application/pdf'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.pdf',
          uploadedFileDeclaredType: 'application/pdf',
          expectedResult: 'allow',
        },
        {
          description: 'detectable, detected in allow, declared generic (warn but allow)',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'jpg',
          uploadedFileName: 'a.jpg',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'detectable, none of declared/detected/extension in allow → reject',
          allowedList: ['image/jpeg'],
          bannedList: [],
          contentKind: 'pdf',
          uploadedFileName: 'a.pdf',
          uploadedFileDeclaredType: 'application/pdf',
          expectedResult: 'reject',
        },
        {
          description: 'docx detected, docx in allow → allow',
          allowedList: [DOCX_MIME],
          bannedList: [],
          contentKind: 'docx',
          uploadedFileName: 'a.docx',
          uploadedFileDeclaredType: DOCX_MIME,
          expectedResult: 'allow',
        },
        {
          description: 'docx detected, application/* in allow → allow',
          allowedList: ['application/*'],
          bannedList: [],
          contentKind: 'docx',
          uploadedFileName: 'a.docx',
          uploadedFileDeclaredType: DOCX_MIME,
          expectedResult: 'allow',
        },
        {
          description: 'docx detected, declared generic (application/octet-stream) → allow',
          allowedList: [DOCX_MIME],
          bannedList: [],
          contentKind: 'docx',
          uploadedFileName: 'a.docx',
          uploadedFileDeclaredType: 'application/octet-stream',
          expectedResult: 'allow',
        },
        {
          description: 'detectable PNG, in allow → allow',
          allowedList: ['image/png', 'image/jpeg'],
          bannedList: [],
          contentKind: 'png',
          uploadedFileName: 'a.png',
          uploadedFileDeclaredType: 'image/png',
          expectedResult: 'allow',
        },
      ];

      for (const row of MATRIX) {
        test(row.description, async () => {
          const config = {
            ...(row.allowedList !== undefined && { allowedTypes: row.allowedList }),
            ...(row.bannedList.length > 0 && { deniedTypes: row.bannedList }),
          };
          strapi.config.set('plugin::upload.security', config);

          const res = await rq({
            method: 'POST',
            url: '/upload',
            formData: {
              files: {
                path: fixturePaths[row.contentKind],
                filename: row.uploadedFileName,
                contentType: row.uploadedFileDeclaredType,
              },
            },
          });

          if (row.expectedResult === 'allow') {
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveLength(1);
            await rq({ method: 'DELETE', url: `/upload/files/${res.body[0].id}` });
          } else {
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code || res.body.error.message).toBeTruthy();
          }
        });
      }
    });
  });
});
